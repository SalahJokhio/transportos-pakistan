import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../data/api_client.dart';
import 'ticket_screen.dart';

/// The passenger's own bookings — tap to reopen the e-ticket.
class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  List<dynamic> _bookings = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final b = await ApiClient().getMyBookings();
      if (!mounted) return;
      setState(() { _bookings = b; _loading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Could not load bookings.'; _loading = false; });
    }
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'CONFIRMED': return AppColors.success;
      case 'CANCELLED': return AppColors.danger;
      case 'PENDING_PAYMENT': return AppColors.warning;
      default: return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Bookings')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(children: [Padding(padding: const EdgeInsets.all(32), child: Text(_error!, textAlign: TextAlign.center))])
                : _bookings.isEmpty
                    ? ListView(children: const [Padding(padding: EdgeInsets.all(40), child: Text('No bookings yet.', textAlign: TextAlign.center))])
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _bookings.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) {
                          final b = _bookings[i] as Map<String, dynamic>;
                          final pnr = (b['pnr'] ?? '').toString();
                          final status = (b['status'] ?? '').toString();
                          final seats = (b['seatNumbers'] as List?)?.join(', ') ?? '';
                          return Card(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(14),
                              title: Text('PNR $pnr', style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text('Seats: $seats · Rs ${b['finalAmount'] ?? b['totalAmount'] ?? ''}'),
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: _statusColor(status).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(status,
                                    style: TextStyle(color: _statusColor(status), fontSize: 11, fontWeight: FontWeight.w700)),
                              ),
                              onTap: pnr.isEmpty
                                  ? null
                                  : () => Navigator.push(context, MaterialPageRoute(
                                        builder: (_) => TicketScreen(pnr: pnr),
                                      )),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
