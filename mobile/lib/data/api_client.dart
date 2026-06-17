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
    try {
      final res = await dio.get(ApiConstants.driverTrips);
      return res.data as List<dynamic>;
    } catch (_) {
      return [];
    }
  }
}
