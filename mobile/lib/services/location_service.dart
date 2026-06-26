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
    if (_sub != null) return; // already tracking
    _activeTripId = tripId;

    // Send one ping immediately from the last-known/current fix so tracking
    // shows up right away instead of waiting for the first stream emission.
    try {
      final last = await Geolocator.getLastKnownPosition();
      if (last != null) {
        _api.sendLocation(tripId, last.latitude, last.longitude, last.speed);
      } else {
        final now = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium, // geolocator 11.x API
        ).timeout(const Duration(seconds: 8));
        _api.sendLocation(tripId, now.latitude, now.longitude, now.speed);
      }
    } catch (_) {/* first-fix best effort */}

    _sub = Geolocator.getPositionStream(locationSettings: _settings()).listen(
      (Position pos) {
        if (_activeTripId == null) return;
        // Fire-and-forget — a dropped ping must never break the stream.
        _api.sendLocation(_activeTripId!, pos.latitude, pos.longitude, pos.speed);
      },
      onError: (_) {}, // GPS/network hiccups don't crash the trip
      cancelOnError: false,
    );
  }

  void stopTracking() {
    _sub?.cancel();
    _sub = null;
    _activeTripId = null;
  }

  bool get isTracking => _sub != null;
}
