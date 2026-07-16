import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../data/api_client.dart';

/// Confirmed e-ticket, looked up by PNR. Shows the booking + a big PNR the
/// conductor can verify against the manifest.
class TicketScreen extends StatefulWidget {
  final String pnr;
  const TicketScreen({super.key, required this.pnr});

  @override
  State<TicketScreen> createState() => _TicketScreenState();
}

class _TicketScreenState extends State<TicketScreen> {
  Map<String, dynamic>? _booking;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await ApiClient().dio.get('/bookings/ticket/${widget.pnr}');
      if (!mounted) return;
      setState(() { _booking = res.data as Map<String, dynamic>; _loading = false; });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final b = _booking;
    final seats = (b?['seatNumbers'] as List?)?.join(', ') ?? '';
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your Ticket'),
        automaticallyImplyLeading: false,
        actions: [
          TextButton(
            onPressed: () => Navigator.popUntil(context, (r) => r.isFirst),
            child: const Text('Done', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const Icon(Icons.check_circle, color: AppColors.success, size: 64),
                  const SizedBox(height: 8),
                  const Text('Booking confirmed', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 20),
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          const Text('PNR', style: TextStyle(color: AppColors.textMuted)),
                          const SizedBox(height: 4),
                          Text(widget.pnr,
                              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, letterSpacing: 3, color: AppColors.navy)),
                          const Divider(height: 32),
                          _row('Status', (b?['status'] ?? '').toString()),
                          _row('Seats', seats),
                          _row('Amount', 'Rs ${b?['finalAmount'] ?? b?['totalAmount'] ?? ''}'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Show this PNR to the conductor when boarding.',
                      textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted)),
                ],
              ),
            ),
    );
  }

  Widget _row(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(k, style: const TextStyle(color: AppColors.textMuted)),
            Text(v, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      );
}
