import 'dart:async';
import 'package:geolocator/geolocator.dart';
import '../data/api_client.dart';

/// Streams the driver's GPS to the backend while a trip is active.
///
/// Uses geolocator's position stream with an Android foreground-service
/// notification config, so location keeps flowing even when the app is
/// backgrounded or the screen is off (the whole reason the driver needs a
/// native app, not the web).
class LocationService {
  final ApiClient _api = ApiClient();
  StreamSubscription<Position>? _sub;
  Timer? _heartbeat;
  String? _activeTripId;

  /// Ask for location permission. For true background tracking the driver must
  /// grant "Allow all the time" (ACCESS_BACKGROUND_LOCATION); we escalate to it
  /// after the basic while-in-use grant.
  Future<bool> requestPermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return false;
    }
    return true;
  }

  /// Per-platform settings. On Android the foregroundNotificationConfig spins up
  /// a foreground service so the OS won't kill location updates in the background.
  /// `medium` accuracy uses the fused/network provider too, so it gets a fix
  /// indoors where a pure-GPS (`high`) fix may never arrive.
  LocationSettings _settings() {
    const interval = Duration(seconds: 10);
    return AndroidSettings(
      accuracy: LocationAccuracy.medium,
      distanceFilter: 0, // time-based updates via intervalDuration
      intervalDuration: interval,
      foregroundNotificationConfig: const ForegroundNotificationConfig(
        notificationTitle: 'TransportOS — Trip in progress',
        notificationText: 'Sharing your location with passengers',
        enableWakeLock: true,
      ),
    );
  }

  Future<void> startTracking(String tripId) async {
    if (_sub != null || _heartbeat != null) return; // already tracking
    _activeTripId = tripId;

    // Immediate first ping so tracking shows up right away.
    await _sendOnce();

    // Foreground-service stream: keeps location alive in the background and
    // pushes fresh positions as the bus moves.
    _sub = Geolocator.getPositionStream(locationSettings: _settings()).listen(
      (Position pos) {
        if (_activeTripId == null) return;
        _api.sendLocation(_activeTripId!, pos.latitude, pos.longitude, pos.speed);
      },
      onError: (_) {}, // GPS/network hiccups don't crash the trip
      cancelOnError: false,
    );

    // Guaranteed 10s heartbeat: a stationary device's provider often stops
    // emitting, so we also push the last-known position on a timer. The bus
    // stays visible on the map even when parked.
    _heartbeat = Timer.periodic(const Duration(seconds: 10), (_) => _sendOnce());
  }

  /// Send one position now from the best available fix. Fire-and-forget.
  Future<void> _sendOnce() async {
    final tripId = _activeTripId;
    if (tripId == null) return;
    try {
      Position? pos = await Geolocator.getLastKnownPosition();
      pos ??= await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium, // geolocator 11.x API
      ).timeout(const Duration(seconds: 8));
      _api.sendLocation(tripId, pos.latitude, pos.longitude, pos.speed);
    } catch (_) {/* best effort */}
  }

  void stopTracking() {
    _heartbeat?.cancel();
    _heartbeat = null;
    _sub?.cancel();
    _sub = null;
    _activeTripId = null;
  }

  bool get isTracking => _sub != null || _heartbeat != null;
}
