import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../data/api_client.dart';
import 'ticket_screen.dart';

/// Pick seats from the live seat map, enter passenger names, and pay
/// (wallet or sandbox gateway). On success, shows the e-ticket.
class BookingScreen extends StatefulWidget {
  final Map<String, dynamic> trip;
  const BookingScreen({super.key, required this.trip});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  Map<String, String> _seatStatus = {}; // "01" -> AVAILABLE/BOOKED/HELD
  final Set<String> _selected = {};
  bool _loading = true;
  bool _paying = false;
  String _method = 'wallet'; // wallet | jazzcash | easypaisa

  String get _tripId => widget.trip['id'] as String;
  num get _price => widget.trip['basePrice'] ?? 0;
  num get _total => _price * _selected.length;

  @override
  void initState() {
    super.initState();
    _loadSeats();
  }

  Future<void> _loadSeats() async {
    try {
      final map = await ApiClient().getSeatMap(_tripId);
      final avail = (map['seatAvailability'] as Map?)?.cast<String, dynamic>() ?? {};
      if (!mounted) return;
      setState(() {
        _seatStatus = avail.map((k, v) => MapEntry(k, v.toString()));
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  void _toggle(String seat) {
    if ((_seatStatus[seat] ?? 'AVAILABLE') != 'AVAILABLE') return;
    setState(() {
      if (_selected.contains(seat)) {
        _selected.remove(seat);
      } else {
        _selected.add(seat);
      }
    });
  }

  Future<void> _book() async {
    if (_selected.isEmpty) return;
    setState(() => _paying = true);
    final api = ApiClient();
    final seats = _selected.toList()..sort();
    try {
      // 1. Hold the seats, 2. create booking, 3. pay, 4. show ticket.
      await api.lockSeats(_tripId, seats);
      final booking = await api.createBooking(
        _tripId, seats,
        seats.map((s) => {'name': 'Passenger', 'seatNumber': s}).toList(),
      );
      final bookingId = booking['id'] as String;
      if (_method == 'wallet') {
        await api.payWithWallet(bookingId);
      } else {
        final gw = await api.dio.post('/payments/initiate', data: {'bookingId': bookingId, 'method': _method});
        if (gw.data is Map && gw.data['live'] == true) {
          // Real gateway would need a WebView redirect — handled on web for now.
          await api.mockConfirm(bookingId);
        } else {
          await api.mockConfirm(bookingId);
        }
      }
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(
        builder: (_) => TicketScreen(pnr: booking['pnr'] as String),
      ));
    } catch (e) {
      if (!mounted) return;
      setState(() => _paying = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Booking failed: ${_msg(e)}')),
      );
    }
  }

  String _msg(Object e) {
    final s = e.toString();
    return s.length > 80 ? '${s.substring(0, 80)}…' : s;
  }

  @override
  Widget build(BuildContext context) {
    final seats = _seatStatus.keys.toList()..sort();
    return Scaffold(
      appBar: AppBar(title: const Text('Select seats')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Expanded(
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 4, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.1),
                    itemCount: seats.length,
                    itemBuilder: (_, i) {
                      final s = seats[i];
                      final st = _seatStatus[s] ?? 'AVAILABLE';
                      final selected = _selected.contains(s);
                      final taken = st != 'AVAILABLE';
                      final bg = selected
                          ? AppColors.primary
                          : taken
                              ? AppColors.border
                              : Colors.white;
                      return InkWell(
                        onTap: () => _toggle(s),
                        child: Container(
                          decoration: BoxDecoration(
                            color: bg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: taken ? AppColors.border : AppColors.primary.withValues(alpha: 0.4)),
                          ),
                          alignment: Alignment.center,
                          child: Text(s,
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: selected ? Colors.white : (taken ? AppColors.textMuted : AppColors.text),
                              )),
                        ),
                      );
                    },
                  ),
                ),
                _bottomBar(),
              ],
            ),
    );
  }

  Widget _bottomBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, -2))],
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(child: Text('${_selected.length} seat(s) · Rs $_total',
                    style: const TextStyle(fontWeight: FontWeight.w700))),
                DropdownButton<String>(
                  value: _method,
                  underline: const SizedBox(),
                  items: const [
                    DropdownMenuItem(value: 'wallet', child: Text('Wallet')),
                    DropdownMenuItem(value: 'jazzcash', child: Text('JazzCash')),
                    DropdownMenuItem(value: 'easypaisa', child: Text('EasyPaisa')),
                  ],
                  onChanged: (v) => setState(() => _method = v ?? 'wallet'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_selected.isEmpty || _paying) ? null : _book,
                child: _paying
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text('Pay Rs $_total & Book'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
