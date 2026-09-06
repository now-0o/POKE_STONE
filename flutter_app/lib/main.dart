import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

const _gameUrl = 'https://poke-stone.netlify.app';
const _background = Color(0xFF070B10);
const _accent = Color(0xFFFFC857);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

  runApp(const PokestoneApp());
}

class PokestoneApp extends StatelessWidget {
  const PokestoneApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: '포케스톤',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: _background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _accent,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const PokestoneWebGame(),
    );
  }
}

class PokestoneWebGame extends StatefulWidget {
  const PokestoneWebGame({super.key});

  @override
  State<PokestoneWebGame> createState() => _PokestoneWebGameState();
}

class _PokestoneWebGameState extends State<PokestoneWebGame>
    with WidgetsBindingObserver {
  late final WebViewController _controller;
  final DateTime _splashStartedAt = DateTime.now();

  double _progress = 0;
  bool _pageReady = false;
  bool _loadFailed = false;
  String _errorMessage = '';
  Timer? _readyTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(_background)
      ..setVerticalScrollBarEnabled(false)
      ..setHorizontalScrollBarEnabled(false)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (!mounted) return;
            setState(() => _progress = progress / 100);
          },
          onPageStarted: (_) {
            _readyTimer?.cancel();
            if (!mounted) return;
            setState(() {
              _pageReady = false;
              _loadFailed = false;
              _errorMessage = '';
              _progress = 0;
            });
          },
          onPageFinished: (_) => _finishSplashAfterMinimumTime(),
          onWebResourceError: (error) {
            if (error.isForMainFrame != true || !mounted) return;
            setState(() {
              _loadFailed = true;
              _pageReady = false;
              _errorMessage = error.description;
            });
          },
        ),
      )
      ..loadRequest(Uri.parse(_gameUrl));
  }

  Future<void> _finishSplashAfterMinimumTime() async {
    const minimumSplash = Duration(milliseconds: 850);
    final elapsed = DateTime.now().difference(_splashStartedAt);
    final remaining = minimumSplash - elapsed;

    _readyTimer?.cancel();
    _readyTimer = Timer(
      remaining.isNegative ? Duration.zero : remaining,
      () {
        if (!mounted || _loadFailed) return;
        setState(() {
          _progress = 1;
          _pageReady = true;
        });
      },
    );
  }

  Future<void> _retry() async {
    setState(() {
      _loadFailed = false;
      _pageReady = false;
      _errorMessage = '';
      _progress = 0;
    });
    await _controller.loadRequest(Uri.parse(_gameUrl));
  }

  Future<void> _handleBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return;
    }

    if (!mounted) return;
    final shouldExit = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('포케스톤 종료'),
            content: const Text('게임을 종료할까요?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('취소'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('종료'),
              ),
            ],
          ),
        ) ??
        false;

    if (shouldExit) {
      await SystemNavigator.pop();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    }
  }

  @override
  void dispose() {
    _readyTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleBack();
      },
      child: Scaffold(
        body: Stack(
          fit: StackFit.expand,
          children: [
            WebViewWidget(controller: _controller),
            IgnorePointer(
              ignoring: _pageReady,
              child: AnimatedOpacity(
                opacity: _pageReady ? 0 : 1,
                duration: const Duration(milliseconds: 280),
                child: _loadFailed
                    ? _LoadError(
                        message: _errorMessage,
                        onRetry: _retry,
                      )
                    : _Splash(progress: _progress),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash({required this.progress});

  final double progress;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: _background,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: _accent, width: 3),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x44FFC857),
                        blurRadius: 28,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    'P',
                    style: TextStyle(
                      color: _accent,
                      fontSize: 38,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(height: 22),
                const Text(
                  'POKESTONE',
                  style: TextStyle(
                    letterSpacing: 5,
                    fontSize: 25,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 7),
                Text(
                  '포케스톤',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.68),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 28),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: progress <= 0 ? null : progress.clamp(0, 1),
                    minHeight: 4,
                    backgroundColor: Colors.white12,
                    color: _accent,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  '게임 불러오는 중',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.44),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: _background,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.wifi_off_rounded, size: 48, color: _accent),
                const SizedBox(height: 16),
                const Text(
                  '게임에 연결할 수 없습니다',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Text(
                  message.isEmpty ? '네트워크 연결을 확인해 주세요.' : message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white60),
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('다시 연결'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
