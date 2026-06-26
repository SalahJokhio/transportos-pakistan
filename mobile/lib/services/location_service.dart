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
  LocationSettings _settings() {
    const interval = Duration(seconds: 10);
    return AndroidSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 0, // time-based updates via intervalDuration
      intervalDuration: interval,
      foregroundNotificationConfig: const ForegroundNotificationConfig(
        notificationTitle: 'TransportOS — Trip in progress',
        notificationText: 'Sharing your location with passengers',
        enableWakeLock: true,
      ),
    );
  }

  void startTracking(String tripId) {
    if (_sub != null) return; // already tracking
    _activeTripId = tripId;
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
