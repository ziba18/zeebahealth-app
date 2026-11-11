export const Config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000',
  // Google Sign-In OAuth client IDs from Google Cloud Console.
  // - webClientId is the Web OAuth client; the backend verifies ID tokens
  //   against this audience, so GoogleSignin must request it as the
  //   audience even on iOS/Android.
  // - iosClientId / androidClientId are the native client IDs; required
  //   on each platform so Google issues the device a token.
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
};

// Public legal pages, served by the backend (backend/app/routers/legal.py). The privacy URL
// is also the one to give App Store Connect.
export const LegalUrls = {
  privacy: `${Config.apiUrl}/privacy`,
  terms: `${Config.apiUrl}/terms`,
};

// Where "email us" goes. Set EXPO_PUBLIC_SUPPORT_EMAIL to the support mailbox before launch.
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'zamaniziba18@gmail.com';

// The wording of the health-information consent screen (app/(auth)/consent.tsx). Change this
// whenever that wording changes in substance: everyone is then asked again, and the server keeps
// which version each person agreed to.
export const CONSENT_VERSION = '2026-11';
