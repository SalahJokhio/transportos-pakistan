// Smoke test: the driver app boots to its splash screen without crashing.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:transport_os_driver/main.dart';

void main() {
  testWidgets('App boots without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const TransportOSDriverApp());
    // First frame renders (splash). A MaterialApp should be present.
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
