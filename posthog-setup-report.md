<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Lingua language learning app. The `posthog-react-native` SDK (already a project dependency) was wired up end-to-end: a shared client config, a `PostHogProvider` wrapping the root layout, manual screen tracking with Expo Router, user identification on sign-in/sign-up, and 10 business-critical events across 5 screens. `app.config.js` was created to inject environment variables into `expo-constants` extras, and `.env` was populated with the project token and host.

| Event | Description | File |
|---|---|---|
| `onboarding_get_started` | User taps "Get Started" on the onboarding screen, beginning the sign-up funnel | `src/app/onboarding.tsx` |
| `sign_up_completed` | User successfully completes email+password sign-up and verifies OTP, or finishes social OAuth | `src/app/(auth)/signup.tsx` |
| `social_auth_started` | User taps a social auth button (Google, Facebook, Apple) on sign-up or sign-in screen | `src/app/(auth)/signup.tsx`, `src/app/(auth)/signin.tsx` |
| `sign_in_completed` | User successfully completes email OTP sign-in or social OAuth sign-in | `src/app/(auth)/signin.tsx` |
| `language_selected` | User confirms a language selection — includes `language_id`, `language_name`, and `is_change` | `src/app/languages.tsx` |
| `lesson_opened` | User opens the lesson details modal — includes `lesson_id`, `lesson_title`, `lesson_type`, `language_id`, `xp_reward` | `src/app/(tabs)/index.tsx` |
| `lesson_started` | User taps "Start Lesson" to navigate to the lesson route | `src/app/(tabs)/index.tsx` |
| `lesson_completed` | User completes a lesson and earns XP — includes `xp_earned`, `lesson_type`, `method` | `src/app/(tabs)/index.tsx` |
| `sign_out` | User signs out via Developer Options | `src/app/(tabs)/index.tsx` |
| `progress_reset` | User resets all lesson progress and XP via Developer Options | `src/app/(tabs)/index.tsx` |

User identification (`posthog.identify`) is called on both sign-up and sign-in completion, passing the Clerk user/session ID and email. `posthog.reset()` is called on sign-out. `$exception` events capture social auth errors on both auth screens. Screen tracking fires automatically on every route change via `posthog.screen()` in the root layout.

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1625901)
- [Sign-ups over time](/insights/gqRPWN3i) — daily new user registrations
- [Lesson completions over time](/insights/niyfxdYg) — lessons opened vs completed (engagement quality)
- [Onboarding to lesson funnel](/insights/jKbc6vnd) — Get Started → Sign-up → Language selected → First lesson completed
- [Language selection breakdown](/insights/G0PbfoFb) — which languages users pick most
- [Daily active learners](/insights/e0BpdiX7) — unique users opening lessons per day (DAU proxy)

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
