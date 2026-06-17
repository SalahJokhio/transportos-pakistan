import 'package:flutter/material.dart';
import '../presentation/splash/splash_screen.dart';
import '../presentation/auth/login_screen.dart';
import '../presentation/home/home_screen.dart';
import '../presentation/trip/active_trip_screen.dart';
import '../presentation/trip/manifest_screen.dart';

class AppRoutes {
  static const String splash = '/';
  static const String login = '/login';
  static const String home = '/home';
  static const String activeTrip = '/trip/active';
  static const String manifest = '/trip/manifest';
}

class AppRouter {
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case AppRoutes.splash:
        return _route(const SplashScreen());
      case AppRoutes.login:
        return _route(const LoginScreen());
      case AppRoutes.home:
        return _route(const HomeScreen());
      case AppRoutes.activeTrip:
        final tripId = settings.arguments as String;
        return _route(ActiveTripScreen(tripId: tripId));
      case AppRoutes.manifest:
        final tripId = settings.arguments as String;
        return _route(ManifestScreen(tripId: tripId));
      default:
        return _route(const LoginScreen());
    }
  }

  static MaterialPageRoute _route(Widget page) =>
      MaterialPageRoute(builder: (_) => page);
}
