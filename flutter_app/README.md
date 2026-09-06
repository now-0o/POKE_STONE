# Pokestone Android (Flutter)

포케스톤 웹 게임을 Android 전용 Flutter 셸에서 실행하는 앱입니다.

## 현재 구성

- 가로모드 전용 (`landscapeLeft`, `landscapeRight`)
- immersive fullscreen
- Android `appCategory="game"`
- `https://poke-stone.netlify.app` WebView
- JavaScript 활성화
- WebView localStorage 유지
- 앱 시작 스플래시 + 로딩 진행률
- 메인 페이지 로딩 실패 시 재시도 화면
- Android 뒤로가기: 웹 히스토리 우선, 루트에서는 종료 확인
- Android 앱이 백그라운드에서 돌아오면 fullscreen 재적용

## 로컬 실행

Flutter stable이 설치된 환경에서:

```bash
cd flutter_app
flutter create . --platforms=android --org com.pokestone --project-name pokestone_app
dart tool/configure_android.dart
flutter pub get
flutter run
```

`flutter create`는 Android Gradle wrapper와 플랫폼 기본 파일을 생성합니다. 그 다음 `configure_android.dart`가 포케스톤 전용 Android 설정을 적용합니다.

## APK 빌드

```bash
cd flutter_app
flutter create . --platforms=android --org com.pokestone --project-name pokestone_app
dart tool/configure_android.dart
flutter pub get
flutter build apk --release
```

출력:

```text
build/app/outputs/flutter-apk/app-release.apk
```

GitHub Actions의 **Flutter Android APK** 워크플로도 같은 과정을 수행하고 `pokestone-android-apk` 아티팩트로 APK를 업로드합니다.

## 네트워크 구조

앱은 EC2에 직접 연결하지 않고 기존 웹 배포 주소를 엽니다.

```text
Flutter WebView
  -> https://poke-stone.netlify.app
      -> /api/*
          -> Netlify reverse proxy
              -> EC2 backend
```

따라서 기기에서 EC2의 HTTP 주소로 직접 접근하지 않으며 Android cleartext 통신도 비활성화합니다.

## Splash

Android 네이티브 launch background를 어두운 색으로 맞춘 다음 Flutter가 뜨는 즉시 `POKESTONE` 스플래시와 로딩 진행률을 표시합니다. 웹 메인 페이지 로딩이 끝나면 약 0.85초의 최소 노출 시간을 보장한 뒤 자연스럽게 게임 화면으로 전환합니다.

## Play Store 전에 할 일

현재 단계는 실기기 테스트용 1차 셸입니다. Play Store 배포 전에는 아래를 별도로 진행합니다.

- 실제 앱 아이콘 / adaptive icon
- 정식 Android applicationId 확정
- release keystore 및 Play App Signing
- AAB 빌드
- 개인정보처리방침 / 스토어 메타데이터
- 다양한 4:3, 16:10, 21:9 가로 화면 테스트
