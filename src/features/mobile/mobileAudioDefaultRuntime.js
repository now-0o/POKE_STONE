import { setVolume } from '../../audio.js';

const params = new URLSearchParams(window.location.search);
const userAgent = navigator.userAgent || '';
const isNativeAndroidApp = params.get('app') === 'android';
const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(userAgent);

// 모바일에는 별도 음소거/볼륨 UI를 두지 않는다.
// 앱/모바일은 항상 게임 내부 마스터 볼륨 100% + 음소거 해제로 시작하고,
// 실제 청취 볼륨은 사용자가 기기 자체 볼륨으로 조절한다.
if (isNativeAndroidApp || isMobileDevice) {
  setVolume(1);
}
