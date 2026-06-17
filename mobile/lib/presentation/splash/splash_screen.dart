import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../routes/app_router.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: StorageKeys.accessToken);
    Navigator.pushReplacementNamed(context, token != null ? AppRoutes.home : AppRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.green,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(20)),
              child: const Icon(Icons.directions_bus, color: Colors.white, size: 44),
            ),
            const SizedBox(height: 20),
            const Text('TransportOS', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
            const Text('Driver', style: TextStyle(color: Colors.white70, fontSize: 16)),
            const SizedBox(height: 48),
            const CircularProgressIndicator(color: Colors.white),
          ],
        ),
      ),
    );
  }
}
