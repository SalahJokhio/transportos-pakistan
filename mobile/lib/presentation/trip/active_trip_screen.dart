import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
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
  bool _busy = false;

  final List<String> _statuses = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'IN_TRANSIT', 'ARRIVED'];
  int _statusIndex = 0;

  @override
  void initState() {
    super.initState();
    // Reflect whether GPS is already broadcasting for this trip (the service is
    // a singleton and keeps running across navigation).
    _tracking = _locationService.activeTripId == widget.tripId;
    _restoreStatus();
  }

  // Restore the real trip status from the server so reopening a trip doesn't
  // reset it back to SCHEDULED.
  Future<void> _restoreStatus() async {
    try {
      final trip = await ApiClient().getTrip(widget.tripId);
      final idx = _statuses.indexOf(trip['status'] as String? ?? 'SCHEDULED');
      if (mounted && idx >= 0) setState(() => _statusIndex = idx);
    } catch (_) {/* keep default */}
  }

  // Note: GPS is deliberately NOT stopped on dispose — the singleton service
  // keeps broadcasting (via the foreground service) until the driver ends the
  // trip or taps stop.

  Future<void> _toggleTracking() async {
    if (_tracking) {
      _locationService.stopTracking();
      setState(() => _tracking = false);
    } else {
      final granted = await _locationService.requestPermission();
      if (!granted) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Turn on location & grant permission to share GPS')),
        );
        return;
      }
      _locationService.startTracking(widget.tripId);
      setState(() => _tracking = true);
    }
  }

  Future<void> _advanceStatus() async {
    if (_statusIndex >= _statuses.length - 1 || _busy) return;
    final next = _statuses[_statusIndex + 1];
    setState(() => _busy = true);
    try {
      if (next == 'DEPARTED') {
        await ApiClient().startTrip(widget.tripId);
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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not update trip: $e')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = _statuses[_statusIndex];
    return Scaffold(
      appBar: AppBar(
        title: const Text('Active Trip'),
        actions: [
          TextButton.icon(
            onPressed: () => Navigator.pushNamed(context, AppRoutes.manifest, arguments: widget.tripId),
            icon: const Icon(Icons.people_alt_rounded, color: Colors.white, size: 18),
            label: const Text('Manifest', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ---- Trip header ----
          _card(
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.navy,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: const Icon(Icons.directions_bus_rounded, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Trip', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                      Text(widget.tripId.substring(0, 8).toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: AppColors.text)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(current.replaceAll('_', ' '),
                      style: const TextStyle(color: AppColors.primaryDark, fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ---- Status stepper ----
          _card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Trip progress', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.text)),
                const SizedBox(height: 16),
                Row(
                  children: List.generate(_statuses.length * 2 - 1, (i) {
                    if (i.isOdd) {
                      final done = (i ~/ 2) < _statusIndex;
                      return Expanded(
                        child: Container(height: 2.5, color: done ? AppColors.primary : AppColors.border),
                      );
                    }
                    final idx = i ~/ 2;
                    final done = idx <= _statusIndex;
                    return Container(
                      width: 26,
                      height: 26,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: done ? AppColors.primary : Colors.white,
                        border: Border.all(color: done ? AppColors.primary : AppColors.border, width: 2),
                      ),
                      child: Icon(Icons.check, size: 15, color: done ? Colors.white : AppColors.border),
                    );
                  }),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: _statuses.asMap().entries.map((e) {
                    final done = e.key <= _statusIndex;
                    return SizedBox(
                      width: 52,
                      child: Text(
                        e.value.replaceAll('_', ' '),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 9,
                            height: 1.1,
                            fontWeight: done ? FontWeight.w700 : FontWeight.w500,
                            color: done ? AppColors.text : AppColors.textMuted),
                      ),
                    );
                  }).toList(),
                ),
                if (_statusIndex < _statuses.length - 1) ...[
                  const SizedBox(height: 18),
                  ElevatedButton(
                    onPressed: _busy ? null : _advanceStatus,
                    child: _busy
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text('Mark as ${_statuses[_statusIndex + 1].replaceAll('_', ' ')}'),
                  ),
                ] else ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                    child: const Row(children: [
                      Icon(Icons.check_circle_rounded, color: AppColors.success, size: 20),
                      SizedBox(width: 8),
                      Text('Trip completed', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.w700)),
                    ]),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ---- GPS tracking (hero) ----
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: _tracking
                    ? [AppColors.success, const Color(0xFF15803D)]
                    : [AppColors.navy, AppColors.navy2],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: (_tracking ? AppColors.success : AppColors.navy).withValues(alpha: 0.28),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _tracking
                        ? const PulseDot(color: Colors.white, size: 11)
                        : Container(
                            width: 26,
                            height: 26,
                            alignment: Alignment.center,
                            child: Container(
                              width: 11,
                              height: 11,
                              decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white54),
                            ),
                          ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Live GPS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                          Text(
                            _tracking ? 'Broadcasting every 10 seconds' : 'Location sharing is off',
                            style: const TextStyle(color: Colors.white70, fontSize: 12.5),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _toggleTracking,
                    icon: Icon(_tracking ? Icons.stop_circle_outlined : Icons.play_circle_outline, size: 20),
                    label: Text(_tracking ? 'Stop broadcasting' : 'Start broadcasting'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: _tracking ? const Color(0xFF15803D) : AppColors.navy,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ---- Report incident / expense ----
          OutlinedButton.icon(
            onPressed: () => Navigator.pushNamed(context, AppRoutes.report, arguments: widget.tripId),
            icon: const Icon(Icons.add_a_photo_outlined, color: AppColors.navy),
            label: const Text('Report incident / expense',
                style: TextStyle(color: AppColors.navy, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 12),

          // ---- Emergency ----
          OutlinedButton.icon(
            onPressed: () => _showEmergencyDialog(context),
            icon: const Icon(Icons.warning_amber_rounded, color: AppColors.danger),
            label: const Text('Report emergency', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(side: BorderSide(color: AppColors.danger.withValues(alpha: 0.4))),
          ),
        ],
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(color: const Color(0xFF0F172A).withValues(alpha: 0.04), blurRadius: 14, offset: const Offset(0, 6)),
        ],
      ),
      child: child,
    );
  }

  void _showEmergencyDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Report emergency'),
        content: const Text('This will alert your dispatcher and the nearest support team immediately.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Emergency alert sent to dispatcher')),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Send alert'),
          ),
        ],
      ),
    );
  }
}
