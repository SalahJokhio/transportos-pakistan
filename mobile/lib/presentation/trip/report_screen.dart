import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/api_client.dart';

class ReportScreen extends StatefulWidget {
  final String tripId;
  const ReportScreen({super.key, required this.tripId});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  String _type = 'INCIDENT';
  String? _category;
  final _desc = TextEditingController();
  final _amount = TextEditingController();
  final _litres = TextEditingController();
  final List<String> _media = [];
  bool _uploading = false;
  bool _submitting = false;

  static const _types = [
    ('INCIDENT', 'Incident', Icons.warning_amber_rounded),
    ('REFUEL', 'Refuel', Icons.local_gas_station_rounded),
    ('EXPENSE', 'Expense', Icons.payments_rounded),
    ('NOTE', 'Note', Icons.sticky_note_2_rounded),
  ];

  Map<String, List<String>> get _categories => {
        'INCIDENT': ['TYRE_PUNCTURE', 'BREAKDOWN', 'ACCIDENT', 'DELAY', 'OTHER'],
        'REFUEL': ['FUEL'],
        'EXPENSE': ['TOLL', 'REPAIR', 'FOOD', 'PARKING', 'OTHER'],
        'NOTE': ['OTHER'],
      };

  bool get _needsAmount => _type == 'REFUEL' || _type == 'EXPENSE';

  String _mediaUrl(String path) => '${ApiConstants.baseUrl.replaceAll('/api/v1', '')}$path';

  Future<void> _addPhoto(ImageSource source) async {
    try {
      final picked = await ImagePicker().pickImage(source: source, imageQuality: 70, maxWidth: 1600);
      if (picked == null) return;
      setState(() => _uploading = true);
      final url = await ApiClient().uploadFile(picked.path);
      if (mounted) setState(() => _media.add(url));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Upload failed')));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      await ApiClient().createReport(widget.tripId, {
        'type': _type,
        'category': _category ?? _categories[_type]!.first,
        'description': _desc.text.trim(),
        if (_needsAmount) 'amount': double.tryParse(_amount.text) ?? 0,
        if (_type == 'REFUEL') 'litres': double.tryParse(_litres.text),
        'mediaUrls': _media,
      });
      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Report submitted')));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not submit: $e')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cats = _categories[_type]!;
    return Scaffold(
      appBar: AppBar(title: const Text('Report an issue')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Type', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.text)),
          const SizedBox(height: 10),
          Row(
            children: _types.map((t) {
              final sel = _type == t.$1;
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => setState(() {
                      _type = t.$1;
                      _category = null;
                    }),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: sel ? AppColors.primary : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: sel ? AppColors.primary : AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Icon(t.$3, color: sel ? Colors.white : AppColors.textMuted, size: 22),
                          const SizedBox(height: 4),
                          Text(t.$2,
                              style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w600,
                                  color: sel ? Colors.white : AppColors.textMuted)),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),

          const Text('Category', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.text)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: cats.map((c) {
              final sel = (_category ?? cats.first) == c;
              return GestureDetector(
                onTap: () => setState(() => _category = c),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
                  decoration: BoxDecoration(
                    color: sel ? AppColors.navy : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: sel ? AppColors.navy : AppColors.border),
                  ),
                  child: Text(c.replaceAll('_', ' '),
                      style: TextStyle(fontSize: 12, color: sel ? Colors.white : AppColors.text)),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),

          if (_needsAmount) ...[
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Amount (Rs)', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.text)),
                      const SizedBox(height: 8),
                      TextField(controller: _amount, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: '0')),
                    ],
                  ),
                ),
                if (_type == 'REFUEL') ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Litres', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.text)),
                        const SizedBox(height: 8),
                        TextField(controller: _litres, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: '0')),
                      ],
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 20),
          ],

          const Text('Description', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.text)),
          const SizedBox(height: 8),
          TextField(
            controller: _desc,
            maxLines: 3,
            decoration: const InputDecoration(hintText: 'What happened?'),
          ),
          const SizedBox(height: 20),

          const Text('Photos', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.text)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              ..._media.map((m) => ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(_mediaUrl(m), width: 74, height: 74, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(width: 74, height: 74, color: AppColors.border, child: const Icon(Icons.image))),
                  )),
              GestureDetector(
                onTap: _uploading ? null : () => _showPhotoSheet(),
                child: Container(
                  width: 74,
                  height: 74,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: _uploading
                      ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)))
                      : const Icon(Icons.add_a_photo_outlined, color: AppColors.textMuted),
                ),
              ),
            ],
          ),
          const SizedBox(height: 30),

          ElevatedButton(
            onPressed: _submitting ? null : _submit,
            child: _submitting
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Submit report'),
          ),
        ],
      ),
    );
  }

  void _showPhotoSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined, color: AppColors.primary),
              title: const Text('Take a photo'),
              onTap: () {
                Navigator.pop(context);
                _addPhoto(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined, color: AppColors.primary),
              title: const Text('Choose from gallery'),
              onTap: () {
                Navigator.pop(context);
                _addPhoto(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }
}
