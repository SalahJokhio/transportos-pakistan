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
  String _error = '';

  Future<void> _login() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final res = await ApiClient().login(_phoneCtrl.text.trim(), _passCtrl.text);
      const storage = FlutterSecureStorage();
      await storage.write(key: StorageKeys.accessToken, value: res['accessToken'] as String);
      await storage.write(key: StorageKeys.userId, value: res['user']['id'] as String);
      await storage.write(key: StorageKeys.userRole, value: res['user']['role'] as String);
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, AppRoutes.home);
    } catch (e) {
      setState(() { _error = 'Invalid phone or password. Try again.'; });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.green,
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 60),
            // Logo
            const Icon(Icons.directions_bus, color: Colors.white, size: 56),
            const SizedBox(height: 12),
            const Text('TransportOS Driver', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
            const Text('Login to start your shift', style: TextStyle(color: Colors.white70)),
            const SizedBox(height: 40),

            // Form card
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.only(topLeft: Radius.circular(28), topRight: Radius.circular(28)),
                ),
                child: SingleChildScrollView(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const SizedBox(height: 8),
                    if (_error.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(10)),
                        child: Text(_error, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
                      ),

                    // Phone
                    TextField(
                      controller: _phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number',
                        hintText: '03001234567',
                        prefixIcon: Icon(Icons.phone),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Password
                    TextField(
                      controller: _passCtrl,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Password',
                        prefixIcon: Icon(Icons.lock_outline),
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Login button
                    ElevatedButton(
                      onPressed: _loading ? null : _login,
                      child: _loading
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Login'),
                    ),
                  ]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
