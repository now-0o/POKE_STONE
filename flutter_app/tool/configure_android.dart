import 'dart:io';

void main() {
  final manifest = File('android/app/src/main/AndroidManifest.xml');
  final appGradle = File('android/app/build.gradle.kts');
  final launchBackground = File('android/app/src/main/res/drawable/launch_background.xml');
  final launchBackgroundV21 = File('android/app/src/main/res/drawable-v21/launch_background.xml');

  if (!manifest.existsSync() || !appGradle.existsSync()) {
    stderr.writeln('Android scaffold not found. Run: flutter create . --platforms=android --org com.pokestone --project-name pokestone_app');
    exitCode = 2;
    return;
  }

  var xml = manifest.readAsStringSync();

  if (!xml.contains('android.permission.INTERNET')) {
    xml = xml.replaceFirst(
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <uses-permission android:name="android.permission.INTERNET" />',
    );
  }

  xml = xml.replaceFirst('android:label="pokestone_app"', 'android:label="포케스톤"');

  if (!xml.contains('android:appCategory="game"')) {
    xml = xml.replaceFirst(
      '<application\n',
      '<application\n        android:appCategory="game"\n        android:usesCleartextTraffic="false"\n',
    );
  }

  if (!xml.contains('android:screenOrientation="sensorLandscape"')) {
    xml = xml.replaceFirst(
      'android:name=".MainActivity"',
      'android:name=".MainActivity"\n            android:screenOrientation="sensorLandscape"',
    );
  }

  manifest.writeAsStringSync(xml);

  var gradle = appGradle.readAsStringSync();
  gradle = gradle.replaceFirst(
    'minSdk = flutter.minSdkVersion',
    'minSdk = 24',
  );
  appGradle.writeAsStringSync(gradle);

  const backgroundXml = '''<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@android:color/black" />
</layer-list>
''';

  launchBackground
    ..parent.createSync(recursive: true)
    ..writeAsStringSync(backgroundXml);
  launchBackgroundV21
    ..parent.createSync(recursive: true)
    ..writeAsStringSync(backgroundXml);

  stdout.writeln('Pokestone Android configuration applied.');
}
