import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/api_client.dart';
import '../../routes/app_router.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String _error = '';

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final res = await ApiClient().login(_phoneCtrl.text.trim(), _passCtrl.text);
      const storage = FlutterSecureStorage();
      await storage.write(key: StorageKeys.accessToken, value: res['accessToken'] as String);
      if (res['refreshToken'] != null) {
        await storage.write(key: StorageKeys.refreshToken, value: res['refreshToken'] as String);
      }
      await storage.write(key: StorageKeys.userId, value: res['user']['id'] as String);
      final role = res['user']['role'] as String? ?? 'PASSENGER';
      await storage.write(key: StorageKeys.userRole, value: role);
      if (!mounted) return;
      // Drivers get the trip cockpit; everyone else gets the passenger app.
      Navigator.pushReplacementNamed(context, role == 'DRIVER' ? AppRoutes.home : AppRoutes.passengerHome);
    } catch (e) {
      // Distinguish a real 401 from a connectivity problem.
      String msg;
      if (e is DioException) {
        if (e.response?.statusCode == 401) {
          msg = 'Invalid phone or password. Try again.';
        } else if (e.response != null) {
          msg = 'Server error (${e.response?.statusCode}). Try again.';
        } else {
          msg = 'Cannot reach the server. Check the connection.';
        }
      } else {
        msg = 'Something went wrong. Try again.';
      }
      setState(() => _error = msg);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: SafeArea(
        child: Column(
          children: [
            // Brand header
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 44, 28, 32),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(15)),
                    child: const Icon(Icons.directions_bus_rounded, color: Colors.white, size: 30),
                  ),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('TransportOS',
                          style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                      Text('Driver Portal', style: TextStyle(color: Colors.white60, fontSize: 13)),
                    ],
                  ),
                ],
              ),
            ),

            // Form sheet
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(26),
                decoration: const BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
                ),
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 6),
                      const Text('Welcome back',
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.text)),
                      const SizedBox(height: 4),
                      const Text('Sign in to start your shift', style: TextStyle(color: AppColors.textMuted)),
                      const SizedBox(height: 24),

                      if (_error.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 18),
                          decoration: BoxDecoration(
                            color: AppColors.danger.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.danger.withValues(alpha: 0.25)),
                          ),
                          child: Row(children: [
                            const Icon(Icons.error_outline, color: AppColors.danger, size: 18),
                            const SizedBox(width: 8),
                            Expanded(child: Text(_error, style: const TextStyle(color: AppColors.danger, fontSize: 13))),
                          ]),
                        ),

                      const Text('Phone number', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.text)),
                      const SizedBox(height: 7),
                      TextField(
                        controller: _phoneCtrl,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(hintText: '03001234567', prefixIcon: Icon(Icons.phone_outlined)),
                      ),
                      const SizedBox(height: 18),

                      const Text('Password', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.text)),
                      const SizedBox(height: 7),
                      TextField(
                        controller: _passCtrl,
                        obscureText: _obscure,
                        decoration: InputDecoration(
                          hintText: '••••••••',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20),
                            onPressed: () => setState(() => _obscure = !_obscure),
                          ),
                        ),
                      ),
                      const SizedBox(height: 30),

                      ElevatedButton(
                        onPressed: _loading ? null : _login,
                        child: _loading
                            ? const SizedBox(
                                height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text('Sign in'),
                      ),
                      const SizedBox(height: 18),
                      const Center(
                        child: Text('Contact your operator if you can\'t sign in',
                            style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
