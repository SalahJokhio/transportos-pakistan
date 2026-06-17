// Copy .env to assets/.env and load with flutter_dotenv
// For now, configuration lives in constants.dart
// Production: use --dart-define for API_URL at build time

class Env {
  static const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000/api/v1');
  static const trackingUrl = String.fromEnvironment('TRACKING_URL', defaultValue: 'http://10.0.2.2:3005');
}
