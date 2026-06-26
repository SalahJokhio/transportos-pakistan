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

  int _totalSeats = 0;

  Future<void> _loadManifest() async {
    // Ownership-checked boarding manifest: flat list of booked seats.
    try {
      final res = await ApiClient().getManifest(widget.tripId);
      setState(() {
        _passengers = res['passengers'] as List<dynamic>? ?? [];
        _totalSeats = res['totalSeats'] as int? ?? 0;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final booked = _passengers.length;

    return Scaffold(
      appBar: AppBar(title: Text('Manifest · $booked/$_totalSeats seats')),
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
              : RefreshIndicator(
                  onRefresh: _loadManifest,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _passengers.length,
                    itemBuilder: (_, i) {
                      final p = _passengers[i] as Map<String, dynamic>;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppTheme.primary.withOpacity(0.1),
                            child: Text(
                              '${p['seatNumber'] ?? '—'}',
                              style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                          title: Text(p['name'] as String? ?? '—', style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text([
                            if (p['cnic'] != null) 'CNIC ${p['cnic']}',
                            if (p['contactPhone'] != null) '📞 ${p['contactPhone']}',
                          ].join('  ·  ')),
                          trailing: Text(
                            p['pnr'] as String? ?? '',
                            style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: Colors.grey),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
