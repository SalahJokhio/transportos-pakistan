import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../routes/app_router.dart';
import 'search_results_screen.dart';

/// Passenger landing: pick origin/destination/date and search buses.
class PassengerHomeScreen extends StatefulWidget {
  const PassengerHomeScreen({super.key});

  @override
  State<PassengerHomeScreen> createState() => _PassengerHomeScreenState();
}

class _PassengerHomeScreenState extends State<PassengerHomeScreen> {
  final _from = TextEditingController(text: 'Karachi');
  final _to = TextEditingController(text: 'Lahore');
  DateTime _date = DateTime.now().add(const Duration(days: 1));

  static const _cities = [
    'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Multan', 'Faisalabad',
    'Peshawar', 'Hyderabad', 'Quetta', 'Sialkot', 'Gujranwala', 'Sukkur',
  ];

  String get _dateStr => '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}';

  Future<void> _pickDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 60)),
    );
    if (d != null) setState(() => _date = d);
  }

  void _search() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SearchResultsScreen(origin: _from.text, destination: _to.text, date: _dateStr),
      ),
    );
  }

  Future<void> _logout() async {
    const storage = FlutterSecureStorage();
    await storage.deleteAll();
    if (mounted) Navigator.pushReplacementNamed(context, AppRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.fromLTRB(20, 20, 12, 24),
              decoration: const BoxDecoration(
                color: AppColors.navy,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.directions_bus_rounded, color: AppColors.primary, size: 28),
                  const SizedBox(width: 10),
                  const Text('TransportOS', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pushNamed(context, AppRoutes.myBookings),
                    icon: const Icon(Icons.confirmation_number_outlined, color: Colors.white),
                    tooltip: 'My Bookings',
                  ),
                  IconButton(onPressed: _logout, icon: const Icon(Icons.logout, color: Colors.white70)),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _cityField('From', _from),
                      const SizedBox(height: 12),
                      _cityField('To', _to),
                      const SizedBox(height: 12),
                      InkWell(
                        onTap: _pickDate,
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Travel date',
                            prefixIcon: Icon(Icons.calendar_today, size: 18),
                            border: OutlineInputBorder(),
                          ),
                          child: Text(_dateStr),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _search,
                          icon: const Icon(Icons.search),
                          label: const Text('Search buses'),
                        ),
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

  Widget _cityField(String label, TextEditingController c) {
    return TextField(
      controller: c,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.location_on_outlined, size: 18),
        border: const OutlineInputBorder(),
        suffixIcon: PopupMenuButton<String>(
          icon: const Icon(Icons.arrow_drop_down),
          onSelected: (city) => setState(() => c.text = city),
          itemBuilder: (_) => _cities.map((city) => PopupMenuItem(value: city, child: Text(city))).toList(),
        ),
      ),
    );
  }
}
