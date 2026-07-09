import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/constants.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._();
  factory ApiClient() => _instance;
  ApiClient._();

  final _storage = const FlutterSecureStorage();
  late final Dio dio = Dio(BaseOptions(
    baseUrl: ApiConstants.baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Content-Type': 'application/json'},
  ))
    ..interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: StorageKeys.accessToken);
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (error, handler) {
        handler.next(error);
      },
    ));

  Future<Map<String, dynamic>> login(String phone, String password) async {
    final res = await dio.post(ApiConstants.login, data: {'phone': phone, 'password': password});
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getMe() async {
    final res = await dio.get(ApiConstants.me);
    return res.data as Map<String, dynamic>;
  }

  Future<void> sendLocation(String tripId, double lat, double lng, double speed) async {
    await dio.post(ApiConstants.updateLocation, data: {
      'tripId': tripId,
      'lat': lat,
      'lng': lng,
      'speed': speed,
    });
  }

  Future<List<dynamic>> getMyTrips() async {
    // Let errors propagate so the UI can distinguish "no trips" from a failed
    // request (expired token / no connection) instead of silently showing blank.
    final res = await dio.get(ApiConstants.driverTrips);
    return res.data as List<dynamic>;
  }

  /// A single trip (used to restore the real status when reopening a trip).
  Future<Map<String, dynamic>> getTrip(String tripId) async {
    final res = await dio.get('/trips/$tripId');
    return res.data as Map<String, dynamic>;
  }

  /// Driver starts the trip → backend marks it DEPARTED + stamps actual departure.
  Future<Map<String, dynamic>> startTrip(String tripId) async {
    final res = await dio.post(ApiConstants.startTrip(tripId));
    return res.data as Map<String, dynamic>;
  }

  /// Driver ends the trip → backend marks it ARRIVED + stamps actual arrival.
  Future<Map<String, dynamic>> endTrip(String tripId) async {
    final res = await dio.post(ApiConstants.endTrip(tripId));
    return res.data as Map<String, dynamic>;
  }

  /// Ownership-checked boarding manifest for a trip.
  /// Returns { tripId, totalSeats, booked, passengers: [...] }.
  Future<Map<String, dynamic>> getManifest(String tripId) async {
    final res = await dio.get(ApiConstants.manifest(tripId));
    return res.data as Map<String, dynamic>;
  }

  /// This driver's portable record (trips, routes, km, experience, rating).
  Future<Map<String, dynamic>> getProfile() async {
    final res = await dio.get('/driver/profile');
    return res.data as Map<String, dynamic>;
  }

  /// Upload a photo/video; returns the served URL to attach to a report.
  Future<String> uploadFile(String path) async {
    final form = FormData.fromMap({'file': await MultipartFile.fromFile(path)});
    final res = await dio.post('/uploads', data: form);
    return (res.data as Map<String, dynamic>)['url'] as String;
  }

  /// Driver files an incident / refuel / expense report on a trip.
  Future<Map<String, dynamic>> createReport(String tripId, Map<String, dynamic> body) async {
    final res = await dio.post('/driver/trips/$tripId/reports', data: body);
    return res.data as Map<String, dynamic>;
  }
}
