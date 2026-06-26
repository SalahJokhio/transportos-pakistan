class ApiConstants {
  // Physical phone reaches the dev backend over the LAN (same Wi-Fi). For the
  // Android emulator use 10.0.2.2 instead. Override at build time with
  // --dart-define=API_URL=... if your IP differs.
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://192.168.1.39:3000/api/v1',
  );
  static const String trackingUrl = 'http://192.168.1.39:3005';

  static const String login = '/auth/login';
  static const String me = '/auth/me';
  static const String driverTrips = '/driver/trips';
  static const String updateLocation = '/tracking/location';

  // Driver trip lifecycle (POST). :id is the trip id.
  static String startTrip(String id) => '/driver/trips/$id/start';
  static String endTrip(String id) => '/driver/trips/$id/end';
  // Ownership-checked boarding manifest (GET).
  static String manifest(String tripId) => '/bookings/manifest/$tripId';
}

class StorageKeys {
  static const String accessToken = 'access_token';
  static const String userId = 'user_id';
  static const String userRole = 'user_role';
}
