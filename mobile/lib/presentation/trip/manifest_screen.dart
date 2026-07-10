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
  int _totalSeats = 0;

  @override
  void initState() {
    super.initState();
    _loadManifest();
  }

  Future<void> _loadManifest() async {
    try {
      final res = await ApiClient().getManifest(widget.tripId);
      if (!mounted) return;
      setState(() {
        _passengers = res['passengers'] as List<dynamic>? ?? [];
        _totalSeats = res['totalSeats'] as int? ?? 0;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  ({Color bg, Color fg}) _genderColors(String? g) {
    if (g == 'F') return (bg: const Color(0xFFFBCFE8), fg: const Color(0xFFBE185D));
    if (g == 'M') return (bg: const Color(0xFFBFDBFE), fg: const Color(0xFF1D4ED8));
    return (bg: const Color(0xFFE2E8F0), fg: AppColors.textMuted);
  }

  @override
  Widget build(BuildContext context) {
    final booked = _passengers.length;
    final females = _passengers.where((p) => p['gender'] == 'F').length;
    final males = _passengers.where((p) => p['gender'] == 'M').length;

    return Scaffold(
      appBar: AppBar(title: const Text('Boarding manifest')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                // Summary strip
                Container(
                  color: AppColors.navy,
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                  child: Row(
                    children: [
                      _summary('$booked/$_totalSeats', 'Booked'),
                      _summary('$males', 'Male'),
                      _summary('$females', 'Female'),
                    ],
                  ),
                ),
                Expanded(
                  child: _passengers.isEmpty
                      ? Center(
                          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Icon(Icons.people_outline, size: 56, color: Colors.grey.shade300),
                            const SizedBox(height: 12),
                            const Text('No passengers booked yet', style: TextStyle(color: AppColors.textMuted)),
                          ]),
                        )
                      : RefreshIndicator(
                          onRefresh: _loadManifest,
                          color: AppColors.primary,
                          child: ListView.builder(
                            padding: const EdgeInsets.all(14),
                            itemCount: _passengers.length,
                            itemBuilder: (_, i) {
                              final p = _passengers[i] as Map<String, dynamic>;
                              final gc = _genderColors(p['gender'] as String?);
                              return Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 44,
                                      height: 44,
                                      alignment: Alignment.center,
                                      decoration: BoxDecoration(color: gc.bg, borderRadius: BorderRadius.circular(12)),
                                      child: Text('${p['seatNumber'] ?? '—'}',
                                          style: TextStyle(color: gc.fg, fontWeight: FontWeight.w800, fontSize: 14)),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(p['name'] as String? ?? '—',
                                              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.text)),
                                          const SizedBox(height: 2),
                                          Text(
                                            [
                                              if (p['cnic'] != null) 'CNIC ${p['cnic']}',
                                              if (p['contactPhone'] != null) '📞 ${p['contactPhone']}',
                                            ].join('  ·  '),
                                            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(p['pnr'] as String? ?? '',
                                        style: const TextStyle(fontFamily: 'monospace', fontSize: 10.5, color: AppColors.textMuted)),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                ),
              ],
            ),
    );
  }

  Widget _summary(String value, String label) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
          Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11)),
        ],
      ),
    );
  }
}
