import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/theme.dart';

/// In-app checkout for a real JazzCash/EasyPaisa payment. Auto-submits the
/// gateway form (page redirection), then watches for the return URL — when the
/// browser lands back on our /booking/... or /checkout/return page, the payment
/// is done, so we pop with the result.
///
/// Only used when the gateway is live (initiate returned `live: true`); the
/// sandbox flow settles via mock-confirm without a WebView.
class GatewayWebViewScreen extends StatefulWidget {
  final String postUrl;
  final Map<String, String> fields;
  const GatewayWebViewScreen({super.key, required this.postUrl, required this.fields});

  @override
  State<GatewayWebViewScreen> createState() => _GatewayWebViewScreenState();
}

class _GatewayWebViewScreenState extends State<GatewayWebViewScreen> {
  late final WebViewController _controller;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (url) => _checkReturn(url),
        onPageFinished: (_) => setState(() => _loading = false),
        onNavigationRequest: (req) {
          _checkReturn(req.url);
          return NavigationDecision.navigate;
        },
      ))
      ..loadHtmlString(_autoSubmitForm());
  }

  /// A tiny HTML page that POSTs the gateway fields on load.
  String _autoSubmitForm() {
    final inputs = widget.fields.entries
        .map((e) => '<input type="hidden" name="${e.key}" value="${_esc(e.value)}"/>')
        .join();
    return '''
<!doctype html><html><body onload="document.forms[0].submit()">
<form method="POST" action="${_esc(widget.postUrl)}">$inputs</form>
</body></html>''';
  }

  String _esc(String s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

  void _checkReturn(String url) {
    // Our backend's return handler redirects to /booking/<pnr> on success or
    // /checkout/return?status=failed on failure.
    if (url.contains('/booking/')) {
      Navigator.of(context).pop(true);
    } else if (url.contains('/checkout/return')) {
      Navigator.of(context).pop(url.contains('status=failed') ? false : true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Secure payment')),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading) const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        ],
      ),
    );
  }
}
