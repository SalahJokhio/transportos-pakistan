import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../data/api_client.dart';
import '../../routes/app_router.dart';
import '../../services/location_service.dart';

class ActiveTripScreen extends StatefulWidget {
  final String tripId;
  const ActiveTripScreen({super.key, required this.tripId});

  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  final LocationService _locationService = LocationService();
  bool _tracking = false;

  final List<String> _statuses = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_TRANSIT', 'ARRIVED'];
  int _statusIndex = 0;

  @override
  void dispose() {
    _locationService.stopTracking();
    super.dispose();
  }

  Future<void> _toggleTracking() async {
    if (_tracking) {
      _locationService.stopTracking();
      setState(() => _tracking = false);
    } else {
      final granted = await _locationService.requestPermission();
      if (!granted) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Location permission required to track this trip')),
        );
        return;
      }
      _locationService.startTracking(widget.tripId);
      setState(() => _tracking = true);
    }
  }

  bool _busy = false;

  Future<void> _advanceStatus() async {
    if (_statusIndex >= _statuses.length - 1 || _busy) return;
    final next = _statuses[_statusIndex + 1];

    // DEPARTED and ARRIVED are real backend transitions (driver start/end).
    // BOARDING and IN_TRANSIT are local UI steps only.
    setState(() => _busy = true);
    try {
      if (next == 'DEPARTED') {
        await ApiClient().startTrip(widget.tripId);
        // Auto-start GPS broadcast once the bus departs.
        final granted = await _locationService.requestPermission();
        if (granted) {
          _locationService.startTracking(widget.tripId);
          if (mounted) setState(() => _tracking = true);
        }
      } else if (next == 'ARRIVED') {
        await ApiClient().endTrip(widget.tripId);
        _locationService.stopTracking();
        if (mounted) setState(() => _tracking = false);
      }
      if (!mounted) return;
      setState(() => _statusIndex++);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not update trip: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Color get _trackingColor => _tracking ? Colors.green : Colors.grey;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Active Trip'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pushNamed(context, AppRoutes.manifest, arguments: widget.tripId),
            child: const Text('Manifest', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Trip ID card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(children: [
                const Icon(Icons.confirmation_number, color: AppTheme.primary),
                const SizedBox(width: 10),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Trip ID', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  Text(widget.tripId.substring(0, 8).toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ]),
              ]),
            ),
          ),
          const SizedBox(height: 12),

          // Status progress
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Trip Status', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: _statuses.asMap().entries.map((e) {
                    final done = e.key <= _statusIndex;
                    return Expanded(
                      child: Column(children: [
                        Container(
                          width: 28, height: 28,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: done ? AppTheme.primary : Colors.grey.shade200,
                          ),
                          child: Icon(Icons.check, color: done ? Colors.white : Colors.grey, size: 16),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          e.value.replaceAll('_', '\n'),
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 9, color: done ? AppTheme.primary : Colors.grey),
                        ),
                      ]),
                    );
                  }).toList(),
                ),
                if (_statusIndex < _statuses.length - 1) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: _busy ? null : _advanceStatus,
                      child: Text(_busy
                          ? 'Updating…'
                          : 'Mark as ${_statuses[_statusIndex + 1].replaceAll('_', ' ')}'),
                    ),
                  ),
                ],
              ]),
            ),
          ),
          const SizedBox(height: 12),

          // GPS tracking card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('GPS Tracking', style: TextStyle(fontWeight: FontWeight.bold)),
                  Container(
                    width: 12, height: 12,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: _trackingColor),
                  ),
                ]),
                const SizedBox(height: 4),
                Text(
                  _tracking ? 'Broadcasting location every 10 seconds' : 'Location sharing is off',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _toggleTracking,
                    icon: Icon(_tracking ? Icons.location_off : Icons.location_on),
                    label: Text(_tracking ? 'Stop Broadcasting' : 'Start Broadcasting'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _tracking ? Colors.red.shade600 : AppTheme.primary,
                    ),
                  ),
                ),
              ]),
            ),
          ),

          const Spacer(),

          // Emergency button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _showEmergencyDialog(context),
              icon: const Icon(Icons.warning_amber, color: Colors.red),
              label: const Text('Report Emergency', style: TextStyle(color: Colors.red)),
              style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.red)),
            ),
          ),
        ]),
      ),
    );
  }

  void _showEmergencyDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Report Emergency'),
        content: const Text('This will alert your dispatcher and nearest support team immediately.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () { Navigator.pop(ctx); /* TODO: send emergency alert */ },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Send Alert'),
          ),
        ],
      ),
    );
  }
}
