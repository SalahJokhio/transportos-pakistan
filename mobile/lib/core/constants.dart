class ApiConstants {
  static const String baseUrl = 'http://10.0.2.2:3000/api/v1'; // Android emulator localhost
  static const String trackingUrl = 'http://10.0.2.2:3005';

  static const String login = '/auth/login';
  static const String me = '/auth/me';
  static const String driverTrips = '/driver/trips';
  static const String updateLocation = '/tracking/location';
  static const String updateTripStatus = '/trips';
}

class StorageKeys {
  static const String accessToken = 'access_token';
  static const String userId = 'user_id';
  static const String userRole = 'user_role';
}
