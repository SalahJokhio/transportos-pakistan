class ApiConstants {
  // Default uses localhost via an `adb reverse tcp:3000 tcp:3000` USB tunnel —
  // works regardless of Wi-Fi/firewall on a USB-connected device. For LAN/Wi-Fi
  // instead, override: --dart-define=API_URL=http://<PC-LAN-IP>:3000/api/v1
  // (emulator: http://10.0.2.2:3000/api/v1).
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:3000/api/v1',
  );
  static const String trackingUrl = 'http://localhost:3005';

  static const String login = '/auth/login';
  static const String me = '/auth/me';
  static const String driverTrips = '/driver/trips';
  static const String updateLocation = '/tracking/location';

  // Passenger booking flow
  static const String tripSearch = '/trips/search';
  static const String lockSeats = '/bookings/lock-seats';
  static const String bookings = '/bookings';
  static const String myBookings = '/bookings/my-bookings';
  static const String payWallet = '/payments/wallet';
  static const String payInitiate = '/payments/initiate';
  static const String payMockConfirm = '/payments/mock-confirm';
  static String tripSeats(String id) => '/trips/$id/seats';
  static String confirmBooking(String id) => '/bookings/$id/confirm';

  // Driver trip lifecycle (POST). :id is the trip id.
  static String startTrip(String id) => '/driver/trips/$id/start';
  static String endTrip(String id) => '/driver/trips/$id/end';
  // Ownership-checked boarding manifest (GET).
  static String manifest(String tripId) => '/bookings/manifest/$tripId';
}

class StorageKeys {
  static const String accessToken = 'access_token';
  static const String refreshToken = 'refresh_token';
  static const String userId = 'user_id';
  static const String userRole = 'user_role';
}
