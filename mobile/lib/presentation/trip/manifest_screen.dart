import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../data/api_client.dart';

class ManifestScreen extends StatefulWidget {
  final String tripId;
  const ManifestScreen({super.key, required this.tripId});

  @override
  State<ManifestScreen> createState() => _ManifestScreenState();
}

class _ManifestScreenState extends State<ManifestScreen> {
  List<dynamic> _passengers = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadManifest();
  }

  Future<void> _loadManifest() async {
    // Fetch confirmed bookings for this trip
    try {
      final res = await ApiClient().dio.get('/bookings', queryParameters: {'tripId': widget.tripId});
      setState(() { _passengers = res.data as List<dynamic>? ?? []; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = _passengers.length;

    return Scaffold(
      appBar: AppBar(title: Text('Manifest · $total passengers')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _passengers.isEmpty
              ? Center(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.people_outline, size: 56, color: Colors.grey.shade300),
                    const SizedBox(height: 12),
                    const Text('No passengers yet', style: TextStyle(color: Colors.grey)),
                  ]),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _passengers.length,
                  itemBuilder: (_, i) {
                    final booking = _passengers[i] as Map<String, dynamic>;
                    final details = booking['passengerDetails'] as List<dynamic>? ?? [];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                            Text(
                              booking['pnr'] as String? ?? '—',
                              style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, color: AppTheme.primary, fontSize: 15),
                            ),
                            Text(
                              'Seats: ${(booking['seatNumbers'] as List?)?.join(', ') ?? '—'}',
                              style: const TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ]),
                          if (details.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            ...details.map((p) {
                              final pd = p as Map<String, dynamic>;
                              return Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Row(children: [
                                  const Icon(Icons.person_outline, size: 14, color: Colors.grey),
                                  const SizedBox(width: 6),
                                  Text(pd['name'] as String? ?? '—', style: const TextStyle(fontSize: 13)),
                                  const Spacer(),
                                  Text('Seat ${pd['seatNumber']}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                ]),
                              );
                            }),
                          ],
                        ]),
                      ),
                    );
                  },
                ),
    );
  }
}
