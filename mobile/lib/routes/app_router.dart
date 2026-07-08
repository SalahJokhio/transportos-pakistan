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
        return _fade(const SplashScreen());
      case AppRoutes.login:
        return _fade(const LoginScreen());
      case AppRoutes.home:
        return _fade(const HomeScreen());
      case AppRoutes.activeTrip:
        return _slide(ActiveTripScreen(tripId: settings.arguments as String));
      case AppRoutes.manifest:
        return _slide(ManifestScreen(tripId: settings.arguments as String));
      default:
        return _fade(const LoginScreen());
    }
  }

  // Gentle fade-through for top-level screens.
  static PageRouteBuilder _fade(Widget page) => PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 350),
        reverseTransitionDuration: const Duration(milliseconds: 250),
        pageBuilder: (_, __, ___) => page,
        transitionsBuilder: (_, anim, __, child) {
          final curved = CurvedAnimation(parent: anim, curve: Curves.easeInOut);
          return FadeTransition(
            opacity: curved,
            child: FadeTransition(
              opacity: curved,
              child: ScaleTransition(scale: Tween(begin: 0.985, end: 1.0).animate(curved), child: child),
            ),
          );
        },
      );

  // Slide-up for detail screens (trip, manifest).
  static PageRouteBuilder _slide(Widget page) => PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 320),
        reverseTransitionDuration: const Duration(milliseconds: 240),
        pageBuilder: (_, __, ___) => page,
        transitionsBuilder: (_, anim, __, child) {
          final curved = CurvedAnimation(parent: anim, curve: Curves.easeOutCubic);
          return SlideTransition(
            position: Tween(begin: const Offset(0, 0.06), end: Offset.zero).animate(curved),
            child: FadeTransition(opacity: curved, child: child),
          );
        },
      );
}
