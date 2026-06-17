import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/api_client.dart';
import '../../routes/app_router.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? _user;
  List<dynamic> _trips = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final user = await ApiClient().getMe();
      final trips = await ApiClient().getMyTrips();
      setState(() { _user = user; _trips = trips; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    const storage = FlutterSecureStorage();
    await storage.deleteAll();
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, AppRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Dashboard'),
        actions: [
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout, tooltip: 'Logout'),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  // Driver info card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(children: [
                        CircleAvatar(
                          radius: 28,
                          backgroundColor: AppTheme.primary.withOpacity(0.1),
                          child: const Icon(Icons.person, color: AppTheme.primary, size: 32),
                        ),
                        const SizedBox(width: 14),
                        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(
                            '${_user?['firstName'] ?? ''} ${_user?['lastName'] ?? ''}'.trim().isEmpty
                                ? 'Driver'
                                : '${_user?['firstName']} ${_user?['lastName']}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Text(_user?['phone'] ?? '', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.green.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text('Driver', style: TextStyle(color: AppTheme.green, fontSize: 11, fontWeight: FontWeight.w600)),
                          ),
                        ]),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Today's trips
                  const Text('Today\'s Trips', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
                  const SizedBox(height: 10),

                  if (_trips.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(children: [
                          Icon(Icons.directions_bus_outlined, size: 48, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          const Text('No trips assigned today', style: TextStyle(color: Colors.grey)),
                          const SizedBox(height: 4),
                          const Text('Contact your dispatcher', style: TextStyle(color: Colors.grey, fontSize: 12)),
                        ]),
                      ),
                    )
                  else
                    ..._trips.map((trip) => _TripCard(trip: trip)).toList(),
                ]),
              ),
            ),
    );
  }
}

class _TripCard extends StatelessWidget {
  final Map<String, dynamic> trip;
  const _TripCard({required this.trip});

  Color _statusColor(String status) {
    switch (status) {
      case 'SCHEDULED': return Colors.blue;
      case 'BOARDING': return Colors.orange;
      case 'DEPARTED':
      case 'IN_TRANSIT': return Colors.green;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = trip['status'] as String? ?? 'SCHEDULED';
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.pushNamed(context, AppRoutes.activeTrip, arguments: trip['id'] as String),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(
                _formatTime(trip['departureTime'] as String? ?? ''),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor(status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(status, style: TextStyle(color: _statusColor(status), fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ]),
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.attach_money, size: 14, color: Colors.grey),
              Text('Rs ${trip['basePrice']}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
              const Spacer(),
              const Icon(Icons.arrow_forward, size: 14, color: AppTheme.primary),
              const Text(' Start Trip', style: TextStyle(color: AppTheme.primary, fontSize: 13, fontWeight: FontWeight.w600)),
            ]),
          ]),
        ),
      ),
    );
  }

  String _formatTime(String raw) {
    if (raw.isEmpty) return '--:--';
    try {
      final dt = DateTime.parse(raw).toLocal();
      final h = dt.hour.toString().padLeft(2, '0');
      final m = dt.minute.toString().padLeft(2, '0');
      return '$h:$m';
    } catch (_) {
      return raw;
    }
  }
}
