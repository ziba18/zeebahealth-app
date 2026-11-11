import type { Profile } from '../types/database';
import { CONSENT_VERSION } from '../constants/config';
import { useAuthStore, type AuthUser } from '../stores/authStore';
import { isHumanName } from './humanName';

/**
 * Where a signed-in user should land. In order: confirm her email (password accounts), agree to
 * us storing health information, then the first onboarding step she still needs (the name step
 * only when we don't have a real name, e.g. Apple sign-in that hid it), then the app.
 */
export function routeAfterSignIn(
  profile: Profile | null | undefined,
  user: AuthUser | null = useAuthStore.getState().user,
): string {
  if (user?.verification_required) return '/(auth)/verify-email';
  if (user && user.health_consent_version !== CONSENT_VERSION) return '/(auth)/consent';
  if (profile?.onboarding_complete) return '/(tabs)/today';
  if (!isHumanName(profile?.display_name)) return '/(auth)/onboarding/name';
  return '/(auth)/onboarding/basics';
}
