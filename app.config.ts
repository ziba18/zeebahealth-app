import type { ExpoConfig } from 'expo/config';

// Migrated from app.json so the native Google Sign-In plugin can read
// EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME from .env at build time. Everything
// else mirrors the previous static config.

// The Google Sign-In plugin throws if `iosUrlScheme` is missing/empty,
// which breaks `eas credentials` and other config-reading commands when
// the env var hasn't been populated yet. Mount the plugin only after
// the env var is set, so initial credential setup still works.
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
const googlePlugin: any[] = googleIosUrlScheme
  ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]]
  : [];

const config: ExpoConfig = {
  name: 'Zeeba Health',
  slug: 'zeebahealth',
  version: '1.0.0',
  // EAS Update: JS-only changes ship to installed builds without a new
  // build. The fingerprint changes whenever native code/config changes, so
  // an update only ever reaches builds it is compatible with.
  runtimeVersion: { policy: 'fingerprint' },
  updates: {
    url: 'https://u.expo.dev/69e41ccd-094f-4227-a786-3a2ade8834da',
  },
  orientation: 'portrait',
  icon: './assets/icon.png',
  // Light = Native, Dark = Midnight: follow the phone's appearance (keyboards and system sheets too).
  userInterfaceStyle: 'automatic',
  scheme: 'zeebahealth',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.zeebahealth.app',
    // Apple's required-reason API declaration for the app's own use (UserDefaults, via local
    // storage). Reason CA92.1 = app-only data, per https://docs.expo.dev/guides/apple-privacy/.
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
      ],
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#FFFFFF',
    },
    package: 'com.zeebahealth.app',
    allowBackup: false,
    permissions: [
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    ['expo-router', { asyncRoutes: false }],
    'expo-secure-store',
    'expo-font',
    'expo-sharing',
    'expo-status-bar',
    [
      'expo-image-picker',
      {
        photosPermission: 'Zeeba Health lets you attach a photo to a chat. It stays on your phone.',
        cameraPermission: 'Zeeba Health lets you take a photo to attach to a chat. It stays on your phone.',
        // Not `false`: that deletes NSMicrophoneUsageDescription, which voice
        // dictation (expo-speech-recognition) needs — Apple rejected build 23 for it.
        microphonePermission: 'Zeeba Health needs access to your microphone to let you describe symptoms by voice.',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#F2F2F7',
        dark: { image: './assets/splash-icon.png', backgroundColor: '#0A0C16' },
      },
    ],
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
        },
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#8f3830',
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'Zeeba Health needs access to your microphone to let you describe symptoms by voice.',
        // We only ever call requestMicrophonePermissionsAsync() with
        // requiresOnDeviceRecognition: true, so this permission should
        // never actually be requested — kept accurate in case that changes.
        speechRecognitionPermission: 'Speech recognition is processed on your device — Zeeba Health does not send your voice to a server.',
      },
    ],
    'expo-apple-authentication',
    ['expo-local-authentication', { faceIDPermission: 'Zeeba Health uses Face ID to keep your notes locked on this phone.' }],
    ...googlePlugin,
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: '69e41ccd-094f-4227-a786-3a2ade8834da',
    },
  },
  owner: 'zamaniziba18',
};

export default config;
