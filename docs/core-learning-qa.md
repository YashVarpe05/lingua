# Core Learning QA Checklist

Use this checklist after curriculum or session-engine changes.

## Automated Checks

- `npm run typecheck`
- `npm run lint`
- `npm run content:check`
- `npm run curriculum:report`
- `npm run qa:progress`

## Curriculum Dashboard

- Open `/debug-curriculum`.
- Confirm English, Spanish, French, Japanese, German, and Arabic are marked ready.
- Confirm the report shows 4 units, 16 lessons, and 4 checkpoints for each core language.

## Core Lesson Smoke Tests

Open one first lesson per core language:

- `/exercise-session?lessonId=en_u1_l1`
- `/exercise-session?lessonId=es_u1_l1`
- `/exercise-session?lessonId=fr_u1_l1`
- `/exercise-session?lessonId=ja_u1_l1`
- `/exercise-session?lessonId=de_u1_l1`
- `/exercise-session?lessonId=ar_u1_l1`

For each lesson:

- Confirm the session loads with hearts, progress, XP, and a question.
- Answer one question incorrectly and confirm the feedback drawer appears.
- Confirm the repair action appears when a useful repair exercise exists.
- Continue and confirm the session advances without console errors.

## Audio

- Reach a listen-type exercise or inspect lesson exercise 6.
- Tap the play button several times.
- Confirm audio replay does not overlap or crash.
- Confirm Japanese and Arabic listen-type exercises show target-script word-bank tiles with pronunciation helpers.
- Confirm English, Spanish, French, and German still allow typing, with the optional "I need help" word bank available on non-challenge listening exercises.
- Confirm German and Arabic listen-type exercises use the same play flow as the other core languages.

## Speaking Practice

- Open `/exercise-session?lessonId=en_u1_l1&mode=speaking`.
- Repeat for one script-heavy language, for example `/exercise-session?lessonId=ja_u1_l1&mode=speaking`.
- Confirm the phrase autoplays once and the replay button does not overlap audio.
- Confirm the phrase card shows target text, pronunciation when available, and a helper translation when available.
- Tap "Try again" and confirm it replays audio without submitting.
- Tap "I said it", then "CHECK", and confirm the feedback drawer, result score, memory, and XP flow still behave normally.
- Confirm speaking/listening/vocabulary/mistakes practice earns XP and saves memory without marking the lesson complete or unlocking path progress.
- Confirm this V1 does not ask for microphone permission or record audio.

## Session Results

- Complete one normal lesson and confirm XP, streak, lesson completion, and result screen update once.
- Start a review session from Practice Hub and confirm it opens exercises for the active language.
- Pass one checkpoint and confirm 50 XP plus completed checkpoint styling.
- Fail one checkpoint and confirm 10 XP, no hearts/combo, and no checkpoint completion.
- Lose all hearts in a normal lesson and confirm the retry modal resets local session state.
