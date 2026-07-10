import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
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
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    if (mounted) setState(() => _error = null);
    try {
      final user = await ApiClient().getMe();
      final trips = await ApiClient().getMyTrips();
      if (!mounted) return;
      setState(() {
        _user = user;
        _trips = trips;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      // Expired/invalid session → send back to login for a fresh token.
      if (e is DioException && e.response?.statusCode == 401) {
        await const FlutterSecureStorage().deleteAll();
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, AppRoutes.login);
        return;
      }
      setState(() {
        _loading = false;
        _error = (e is DioException && e.response == null)
            ? 'Cannot reach the server. Check your connection.'
            : 'Could not load your trips. Pull to retry.';
      });
    }
  }

  Future<void> _logout() async {
    const storage = FlutterSecureStorage();
    await storage.deleteAll();
    if (!mounted) return;
    Navigator.pushReplacementNamed(context, AppRoutes.login);
  }

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  int get _activeCount =>
      _trips.where((t) => ['DEPARTED', 'IN_TRANSIT', 'BOARDING'].contains(t['status'])).length;

  @override
  Widget build(BuildContext context) {
    final name = '${_user?['firstName'] ?? ''} ${_user?['lastName'] ?? ''}'.trim();
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: AppColors.primary,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ---- Navy header ----
            SliverToBoxAdapter(
              child: Container(
                decoration: const BoxDecoration(
                  color: AppColors.navy,
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(26)),
                ),
                padding: const EdgeInsets.fromLTRB(20, 56, 20, 26),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                          child: const Icon(Icons.person, color: AppColors.primary, size: 26),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_greeting, style: const TextStyle(color: Colors.white60, fontSize: 13)),
                              Text(name.isEmpty ? 'Driver' : name,
                                  style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pushNamed(context, AppRoutes.profile),
                          icon: const Icon(Icons.badge_outlined, color: Colors.white70),
                          tooltip: 'My record',
                        ),
                        IconButton(
                          onPressed: _logout,
                          icon: const Icon(Icons.logout_rounded, color: Colors.white70),
                          tooltip: 'Logout',
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    // Stat strip
                    Row(
                      children: [
                        _stat('${_trips.length}', 'Trips today', Icons.event_note_rounded),
                        const SizedBox(width: 12),
                        _stat('$_activeCount', 'Active now', Icons.local_shipping_rounded),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // ---- Body ----
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 28),
              sliver: _loading
                  ? SliverList(
                      delegate: SliverChildListDelegate([
                        const Text('Today\'s trips',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17, color: AppColors.text)),
                        const SizedBox(height: 12),
                        ...List.generate(3, (_) => const TripCardSkeleton()),
                      ]),
                    )
                  : SliverList(
                      delegate: SliverChildListDelegate([
                        const Text('Today\'s trips',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17, color: AppColors.text)),
                        const SizedBox(height: 12),
                        if (_error != null)
                          _errorState()
                        else if (_trips.isEmpty)
                          _emptyState()
                        else
                          ..._trips.map((t) => _TripCard(trip: t)),
                      ]),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(String value, String label, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary, size: 22),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _errorState() {
    return Container(
      margin: const EdgeInsets.only(top: 24),
      padding: const EdgeInsets.all(28),
      alignment: Alignment.center,
      child: Column(
        children: [
          const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.textMuted),
          const SizedBox(height: 14),
          Text(_error ?? 'Something went wrong',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () {
              setState(() => _loading = true);
              _loadData();
            },
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('Retry'),
            style: OutlinedButton.styleFrom(minimumSize: const Size(140, 44)),
          ),
        ],
      ),
    );
  }

  Widget _emptyState() {
    return Container(
      margin: const EdgeInsets.only(top: 30),
      padding: const EdgeInsets.all(36),
      alignment: Alignment.center,
      child: Column(
        children: [
          Icon(Icons.directions_bus_outlined, size: 56, color: Colors.grey.shade300),
          const SizedBox(height: 14),
          const Text('No trips assigned today',
              style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          const Text('Pull down to refresh · contact your dispatcher',
              style: TextStyle(color: Colors.grey, fontSize: 12.5), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  final Map<String, dynamic> trip;
  const _TripCard({required this.trip});

  Color _statusColor(String s) {
    switch (s) {
      case 'SCHEDULED':
        return AppColors.info;
      case 'BOARDING':
        return AppColors.warning;
      case 'DEPARTED':
      case 'IN_TRANSIT':
        return AppColors.success;
      case 'ARRIVED':
        return AppColors.textMuted;
      default:
        return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = trip['status'] as String? ?? 'SCHEDULED';
    final c = _statusColor(status);
    final active = ['DEPARTED', 'IN_TRANSIT', 'BOARDING'].contains(status);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(color: const Color(0xFF0F172A).withValues(alpha: 0.04), blurRadius: 14, offset: const Offset(0, 6)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => Navigator.pushNamed(context, AppRoutes.activeTrip, arguments: trip['id'] as String),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Time block
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_formatTime(trip['departureTime'] as String? ?? ''),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22, color: AppColors.text)),
                    const Text('Departure', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                  ],
                ),
                const SizedBox(width: 16),
                Container(width: 1, height: 38, color: AppColors.border),
                const SizedBox(width: 16),
                // Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Trip ${(trip['id'] as String).substring(0, 6).toUpperCase()}',
                          style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.text)),
                      const SizedBox(height: 4),
                      Row(children: [
                        const Icon(Icons.payments_outlined, size: 13, color: AppColors.textMuted),
                        const SizedBox(width: 4),
                        Text('Rs ${trip['basePrice']}',
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
                      ]),
                    ],
                  ),
                ),
                // Status + chevron
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: c.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
                      child: Text(status.replaceAll('_', ' '),
                          style: TextStyle(color: c, fontSize: 10.5, fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(height: 8),
                    Row(children: [
                      Text(active ? 'Manage' : 'Start',
                          style: const TextStyle(color: AppColors.primary, fontSize: 12.5, fontWeight: FontWeight.w700)),
                      const Icon(Icons.chevron_right_rounded, color: AppColors.primary, size: 18),
                    ]),
                  ],
                ),
              ],
            ),
          ),
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
