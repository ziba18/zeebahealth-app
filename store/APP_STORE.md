# Zeeba Health — App Store Connect status

App record created 9 Nov 2026 on the coworker's team (Paul Rudenko, team 5MZF6USVHW).
**Apple ID 6832575398 · bundle `com.zeebahealth.app` · SKU `zeebahealth-ios` · primary language English (U.K.)**
App ID registered with Sign In with Apple + Push Notifications. `eas.json` submit → `ascAppId` set.
**Owner: do NOT submit for review until told** (and the account is on Extended Review after the Oct 2.3 rejection —
submit once, polished).

## Done (saved in ASC)
- Version 1.0.0 (app.config.ts `version` matches), manual release.
- Promotional text, description, keywords (texts in this folder), support URL https://zeebahealth.com/support,
  marketing URL https://zeebahealth.com, copyright "2026 Zeeba Health".
- Subtitle "Your symptoms, on the record". Category Health & Fitness, secondary Medical. Content rights: no third-party content.
- Privacy policy URL https://api.zeebahealth.com/privacy. App Review notes (new app, no diagnosis, how to review).

## To do before submitting (in order)
1. Owner finishes the Expo Go check of every page (owner rule).
2. ~~Ship the rename to the server~~ — done 9 Nov (privacy page and Apple audience are Zeeba Health).
3. Build + upload: `eas build --platform ios --profile production` (then `eas submit` — not auto-submit).
4. Screenshots (6.9" 1320×2868 required): take on a real iPhone from the TestFlight build, light mode, sample data.
5. Age rating questionnaire (expected: no objectionable content; "Medical/Treatment Information: None" — the app shows
   only the user's own records).
6. App Privacy labels (owner confirms — legal declaration). Expected: Health & Fitness (health), Contact Info (name,
   email), Identifiers (user ID), all linked to the user, not used for tracking; Usage Data (Mixpanel, only with consent).
7. App Review: contact name/phone/email (owner) and a demo account with sample notes (owner creates; never commit the password).
8. Remove Render env `APPLE_ALLOW_EXPO_GO` before launch.
