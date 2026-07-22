import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../data/api_client.dart';
import 'booking_screen.dart';

/// Trips matching the passenger's search — tap one to pick seats & book.
class SearchResultsScreen extends StatefulWidget {
  final String origin;
  final String destination;
  final String date;
  const SearchResultsScreen({super.key, required this.origin, required this.destination, required this.date});

  @override
  State<SearchResultsScreen> createState() => _SearchResultsScreenState();
}

class _SearchResultsScreenState extends State<SearchResultsScreen> {
  List<dynamic> _trips = [];
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
      final trips = await ApiClient().searchTrips(widget.origin, widget.destination, widget.date);
      if (!mounted) return;
      setState(() { _trips = trips; _loading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Could not load trips. Pull to retry.'; _loading = false; });
    }
  }

  String _time(String? iso) {
    if (iso == null) return '--:--';
    final d = DateTime.tryParse(iso)?.toLocal();
    if (d == null) return '--:--';
    return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${widget.origin} → ${widget.destination}')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(children: [Padding(padding: const EdgeInsets.all(32), child: Text(_error!, textAlign: TextAlign.center))])
                : _trips.isEmpty
                    ? ListView(children: const [Padding(padding: EdgeInsets.all(40), child: Text('No buses found for this route/date.', textAlign: TextAlign.center))])
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _trips.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) {
                          final t = _trips[i] as Map<String, dynamic>;
                          final price = (t['basePrice'] ?? 0).toString();
                          final avail = t['availableSeats'];
                          return Card(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(14),
                              title: Text('Departs ${_time(t['departureTime'] as String?)}',
                                  style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text('${avail ?? '-'} seats left'),
                              ),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('Rs $price', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 16)),
                                  const Text('per seat', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                                ],
                              ),
                              onTap: () => Navigator.push(context, MaterialPageRoute(
                                builder: (_) => BookingScreen(trip: t),
                              )),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
