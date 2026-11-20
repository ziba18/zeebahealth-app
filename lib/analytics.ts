// Onboarding funnel analytics: switched off for launch, and no analytics package is installed (20 Nov 2026).
// Mixpanel was removed because it was never on in a launch build and its dependencies carried known
// security issues. The call sites stay so a provider can be added back in one place, but only after
// its own consent line (opt-in, PECR), a processor agreement, a privacy page line, the DPIA and new
// App Privacy answers. Event names only: never symptoms, notes, names, emails or anything she recorded.

export type AnalyticsEvent =
  | 'Welcome Viewed'
  | 'Signup Completed'
  | 'Onboarding Step Completed'
  | 'Onboarding Completed';

/** Does nothing until an analytics provider is approved and added (see the note above). */
export function track(_event: AnalyticsEvent, _props?: Record<string, string | number | boolean>): void {}
