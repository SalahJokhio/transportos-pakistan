import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../../data/api_client.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _rec;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final rec = await ApiClient().getProfile();
      if (!mounted) return;
      setState(() {
        _rec = rec;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _experience(int months) {
    if (months < 1) return 'New';
    if (months < 12) return '$months mo';
    final y = (months / 12).floor();
    final m = months % 12;
    return m == 0 ? '$y yr' : '$y yr $m mo';
  }

  @override
  Widget build(BuildContext context) {
    final r = _rec;
    final stats = (r?['stats'] as Map?) ?? {};
    final rating = (r?['rating'] as Map?) ?? {};
    final reviews = (r?['recentReviews'] as List?) ?? [];
    final routes = (stats['routesDriven'] as List?) ?? [];
    final avg = rating['average'];

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(title: const Text('My record')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : r == null
              ? const Center(child: Text('Could not load your record', style: TextStyle(color: AppColors.textMuted)))
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppColors.primary,
                  child: ListView(
                    padding: EdgeInsets.zero,
                    children: [
                      // ---- Identity header ----
                      Container(
                        decoration: const BoxDecoration(
                          color: AppColors.navy,
                          borderRadius: BorderRadius.vertical(bottom: Radius.circular(26)),
                        ),
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 30,
                                  backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                                  child: const Icon(Icons.person, color: AppColors.primary, size: 34),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Flexible(
                                            child: Text(r['name'] ?? 'Driver',
                                                style: const TextStyle(
                                                    color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                                          ),
                                          if (r['isVerified'] == true) ...[
                                            const SizedBox(width: 6),
                                            const Icon(Icons.verified, color: AppColors.primary, size: 18),
                                          ],
                                        ],
                                      ),
                                      const SizedBox(height: 3),
                                      Text('CNIC ${r['cnic'] ?? '—'}',
                                          style: const TextStyle(color: Colors.white60, fontSize: 12.5)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 18),
                            // Rating band
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.07),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.star_rounded, color: AppColors.warning, size: 30),
                                  const SizedBox(width: 8),
                                  Text(avg == null ? '—' : '$avg',
                                      style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
                                  const SizedBox(width: 4),
                                  Text('/ 5', style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 14)),
                                  const Spacer(),
                                  Text('${rating['count'] ?? 0} reviews',
                                      style: const TextStyle(color: Colors.white60, fontSize: 12.5)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      // ---- Stat cards ----
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 18, 16, 6),
                        child: Row(
                          children: [
                            _statCard(Icons.route_rounded, '${stats['completedTrips'] ?? 0}', 'Trips done'),
                            const SizedBox(width: 12),
                            _statCard(Icons.speed_rounded, '${stats['totalKm'] ?? 0}', 'km driven'),
                            const SizedBox(width: 12),
                            _statCard(Icons.workspace_premium_rounded,
                                _experience((r['experienceMonths'] as int?) ?? 0), 'Experience'),
                          ],
                        ),
                      ),

                      // ---- Routes driven ----
                      if (routes.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                          child: SoftCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Routes driven',
                                    style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.text)),
                                const SizedBox(height: 10),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: routes
                                      .map((r) => Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                                            decoration: BoxDecoration(
                                                color: AppColors.surface, borderRadius: BorderRadius.circular(20)),
                                            child: Text('$r',
                                                style: const TextStyle(fontSize: 12, color: AppColors.text)),
                                          ))
                                      .toList(),
                                ),
                              ],
                            ),
                          ),
                        ),

                      // ---- Reviews ----
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
                        child: Text('Remarks (${reviews.length})',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, color: AppColors.text)),
                      ),
                      if (reviews.isEmpty)
                        const Padding(
                          padding: EdgeInsets.fromLTRB(16, 8, 16, 30),
                          child: Text('No remarks yet.', style: TextStyle(color: AppColors.textMuted)),
                        )
                      else
                        ...reviews.map((rv) => Padding(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                              child: SoftCard(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(rv['by'] ?? 'Anonymous',
                                            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.text)),
                                        const Spacer(),
                                        Row(
                                          children: List.generate(
                                            5,
                                            (i) => Icon(Icons.star_rounded,
                                                size: 15,
                                                color: i < (rv['rating'] as int? ?? 0)
                                                    ? AppColors.warning
                                                    : AppColors.border),
                                          ),
                                        ),
                                      ],
                                    ),
                                    if ((rv['remark'] as String?)?.isNotEmpty ?? false) ...[
                                      const SizedBox(height: 6),
                                      Text(rv['remark'],
                                          style: const TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.35)),
                                    ],
                                  ],
                                ),
                              ),
                            )),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
    );
  }

  Widget _statCard(IconData icon, String value, String label) {
    return Expanded(
      child: SoftCard(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 24),
            const SizedBox(height: 8),
            FittedBox(
              child: Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text)),
            ),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}
