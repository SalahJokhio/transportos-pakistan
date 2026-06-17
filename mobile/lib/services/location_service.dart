import 'dart:async';
import 'package:geolocator/geolocator.dart';
import '../data/api_client.dart';

class LocationService {
  Timer? _timer;
  final ApiClient _api = ApiClient();
  String? _activeTripId;

  Future<bool> requestPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }
    if (permission == LocationPermission.deniedForever) return false;
    return true;
  }

  void startTracking(String tripId) {
    _activeTripId = tripId;
    // Send location every 10 seconds
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _sendLocation());
    _sendLocation(); // immediate first send
  }

  void stopTracking() {
    _timer?.cancel();
    _timer = null;
    _activeTripId = null;
  }

  Future<void> _sendLocation() async {
    if (_activeTripId == null) return;
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );
      await _api.sendLocation(_activeTripId!, pos.latitude, pos.longitude, pos.speed);
    } catch (_) {
      // Silently ignore — network or GPS failures don't crash the app
    }
  }

  bool get isTracking => _timer?.isActive ?? false;
}
