# Lingua Course Architecture Plan

This document is the teaching source of truth for how Lingua should structure
languages, chapters, lessons, reviews, checkpoints, and exercise design.

For the broader Duolingo-inspired system research behind the learning engine,
session generator, memory model, motivation loop, and implementation order, see
[`docs/duolingo-system-research.md`](duolingo-system-research.md).

It is based on the current app model plus the research links provided by the
project owner:

- Duolingo, "How Duolingo uses AI to create lessons faster"
  https://blog.duolingo.com/large-language-model-duolingo-lessons/
- Frontmatter, "Duolingo: Technology and Design Shape Learning Journeys"
  https://www.frontmatter.io/blog/duolingo-technology-and-design-shape-learning-journeys
- Duolingo Research, "The Duolingo Method for App-based Teaching and Learning"
  https://duolingo-papers.s3.amazonaws.com/reports/Duolingo_whitepaper_duolingo_method_2023.pdf
- Duolingo, "Introducing the new Duolingo learning path"
  https://blog.duolingo.com/new-duolingo-home-screen-design/
- Mobbin Awards Duolingo reference
  https://mobbin.com/awards/app/688f6e68-12be-4b63-80b7-8377c8482911
- Octet Design, "Duolingo Case Study: How This Brand Master Mobile App Design?"
  https://octet.design/journal/duolingo-case-study/

Mobbin and Octet were treated as visual and UX inspiration only. The app must
not copy Duolingo screens one-for-one; it should use the same proven learning
patterns in Lingua's own teaching UI.

## Source to Decision Matrix

| Source finding | Lingua decision |
| --- | --- |
| Duolingo's LLM workflow starts with curriculum design: theme, grammar, vocabulary, exercise type, then AI generation and human review. | Add a content creation process before scaling lesson data. AI can draft exercises, but the unit and lesson blueprint comes first. |
| Duolingo Method: learning by doing uses active, scaffolded interaction, with explicit tips only when they make complex rules easier. | Keep lessons exercise-first. Add short tips only for difficult grammar, formality, script, or pronunciation moments. |
| Duolingo Method: personalization adjusts exercise order/difficulty, resurfaces mistakes, and uses spaced repetition. | Keep `lessonMemory`, `recentMistakes`, review sessions, and forgetting score as the local first version of personalization. |
| Duolingo Method: use standards such as CEFR, then fill gaps with learning expert judgment. | Give every unit a CEFR level and real-world can-do goal. Do not use vague unit titles like "Basics 2". |
| Duolingo learning path: guide learners through a clear path, mix new concepts with review, group content into smaller units, and place practice into the path. | Learn path should show lessons, review nodes, and checkpoint nodes inside each unit. Practice is forward progress, not a separate chore. |
| Frontmatter: progress, celebrations, feedback, streaks, leaderboards, and time-limited challenges drive motivation. | Motivation layers stay tied to learning: feedback drawer, hearts, combo, XP, streak, review due, checkpoint completion. |
| Octet search-indexed case study: Duolingo combines gamification, usability, motivation, onboarding, accessibility, and visual hierarchy. | Lingua should keep screens mobile-first, obvious, low-friction, colorful, and friendly while avoiding unnecessary visual clutter. |
| Mobbin page was not text-accessible beyond generic nav/footer content. | Use Mobbin only as a visual reference if opened manually; do not cite it as evidence for pedagogy. |

## Current App Shape

The current codebase already has a clear base model:

```txt
Language
  Unit
    Lesson
      Exercise
    Checkpoint Quiz
  Review Session
```

Primary files:

- `src/types/learning.ts`
  - `Language`
  - `Unit`
  - `Lesson`
  - `Exercise`
  - `MatchingPairItem`
  - `VocabularyItem`
  - `PhraseItem`
- `src/data/units.ts`
  - Unit/chapter metadata and `checkpointQuiz`
- `src/data/lessons.ts`
  - Lesson metadata, activities, exercises, vocabulary, phrases
- `src/store/useProgressStore.ts`
  - XP, streaks, completed lessons, checkpoints, mistakes, local memory model
- `src/app/(tabs)/learn.tsx`
  - Learn path rendering and unlock states
- `src/app/exercise-session.tsx`
  - Exercise session, review mode, checkpoint mode, feedback, hearts, progress

What is strong:

- `Unit -> Lesson -> Exercise` is simple and teachable.
- `Unit.checkpointQuiz` is the right place for chapter-level assessment.
- `lessonMemory`, recent mistakes, XP, streaks, and checkpoints already support
  a practical local learning loop.
- Exercise UI already supports MCQ, fill blank, matching, tap word, listen/type,
  feedback drawer, hearts, combo, and review sessions.

What needs cleanup:

- Checkpoints should live only at the unit level. `Lesson.isCheckpoint` should be
  deprecated as a content concept.
- `activities` and `exercises` overlap. The app should standardize on
  `exercises` for sessions and keep `activities` only for future lesson preview
  or AI teacher material.
- Some unit descriptions do not match the lesson content.
- Some multilingual strings are mojibake and should be repaired before scaling
  the content.
- The learn path should not unlock the next unit before the previous unit
  checkpoint is passed, unless that is an intentional "explore ahead" mode.

## Research Principles

### 1. Start With Curriculum Design

The Duolingo LLM lesson article describes a workflow where a learning designer
first plans the theme, grammar, vocabulary, and exercise types, then uses AI to
generate candidate exercises that human experts review and edit.

Lingua rule:

```txt
Do not generate random exercises first.
Plan the unit objective, lesson objective, vocabulary, grammar, and exercise
mix first. Then write or generate exercises inside that frame.
```

### 2. Teach by Doing

The Duolingo Method centers active practice. Lessons should not be long lectures.
Each screen should ask the learner to do something small and concrete.

Lingua rule:

```txt
Every lesson should be mostly exercises.
Teaching tips should be short, contextual, and attached to practice.
```

### 3. Personalize Review

The Duolingo Method emphasizes resurfacing content when it is useful to review,
using spaced repetition and learner knowledge. Lingua already has a simplified
local memory model in `lessonMemory`.

Lingua rule:

```txt
Review sessions should pull from:
1. lessons with high forgetting scores,
2. recent mistakes,
3. mixed exercises from the current or recent unit.
```

### 4. Use Standards but Keep Lessons Useful

The Duolingo Method uses CEFR for language courses, while learning experts fill
in practical vocabulary and grammar that standards do not fully specify.

Lingua rule:

```txt
Each unit should have a CEFR level and a real-world can-do goal.
Example: "A1: greet someone, introduce yourself, and ask their name."
```

### 5. Keep Motivation Attached to Learning

Frontmatter and the Duolingo Method both highlight progress feedback, streaks,
celebrations, characters, animations, and immediate responses. These work best
when they support learning rather than distract from it.

Lingua rule:

```txt
Rewards should reinforce useful behavior:
- completing a lesson,
- correcting a mistake,
- reviewing due content,
- passing a checkpoint,
- maintaining daily practice.
```

### 6. Make Hard Things Feel Safe

For scripts like Japanese, learners should recognize characters before being
forced to type them. The early Japanese fill-blank pattern should use selectable
word chunks with romanized pronunciation. Typing Japanese should appear later,
after repeated recognition practice.

Lingua rule:

```txt
Recognition first, guided production second, free production last.
```

## Course Hierarchy

Use this hierarchy for every language:

```txt
Language Course
  Unit / Chapter
    Lesson 1: Introduce
    Lesson 2: Build
    Lesson 3: Use
    Lesson 4: Mix
    Unit Review
    Checkpoint Quiz
```

Recommended unit size:

- 3 to 5 lessons per unit.
- 6 to 8 exercises per lesson.
- 5 checkpoint questions per unit.
- 5 review exercises per review session.

Each unit should answer:

- What real-life outcome can the learner do after this unit?
- What vocabulary must they know?
- What grammar or pattern do they need?
- What previous content should be recycled?
- What mistakes are likely?
- What should the checkpoint prove?

## Unit Blueprint

Every unit should follow this template:

```ts
{
  id: "ja_unit_1",
  languageId: "ja",
  title: "Unit 1: First Conversations",
  description: "Greet someone, introduce yourself, and ask their name.",
  order: 1,
  cefr: "A1",
  unitColor: "#58CC02",
  unitEmoji: "wave",
  canDoGoal: "I can start a polite first conversation.",
  targetVocabulary: ["hello", "thank you", "excuse me", "name"],
  grammarFocus: ["copula/desu", "set greeting phrases"],
  checkpointQuiz: { ... }
}
```

The current `Unit` type includes `canDoGoal`, `targetVocabulary`, and
`grammarFocus`, and `UnitBanner` uses them to explain what the learner will be
able to do in the unit guidebook.

## Lesson Blueprint

Every lesson should follow this template:

```ts
{
  id: "ja_u1_l1",
  unitId: "ja_unit_1",
  title: "Greetings",
  description: "Recognize and use hello, thank you, goodbye, and excuse me.",
  type: "vocabulary",
  order: 1,
  xpReward: 10,
  durationMinutes: 3,
  goals: [
    "Recognize four core greetings",
    "Choose the right greeting for a situation",
    "Complete one greeting from memory"
  ],
  exercises: [...]
}
```

Lesson rules:

- One clear objective per lesson.
- New vocabulary limit: 4 to 7 items.
- New grammar limit: 1 pattern.
- Recycle at least 2 earlier items in every lesson after lesson 1.
- End with the hardest exercise in the lesson.
- Keep each exercise answerable in under 20 seconds.

## Exercise Sequence Per Lesson

Use this default 8-exercise recipe:

```txt
1. Recognition MCQ
   Learner sees a target word/phrase and chooses the English meaning.

2. Meaning MCQ
   Learner sees English and chooses the target-language phrase.

3. Matching Pairs
   Learner connects target-language words to meanings.

4. Tap Word / Word Bank
   Learner selects the correct phrase or builds a short answer.

5. Fill Blank
   Learner completes a familiar phrase with a selectable word chunk.

6. Listening
   Learner hears known content and identifies or types it.

7. Mixed Recall
   Learner chooses between new and recycled content.

8. Challenge Sentence
   Learner translates or completes a full sentence using the lesson goal.
```

For Japanese and other non-Latin scripts:

```txt
Beginner lessons:
  show native script + pronunciation.

Middle lessons:
  show native script first, pronunciation below.

Later lessons:
  hide pronunciation on challenge questions.
```

## Checkpoint Rules

Checkpoint belongs to the unit, not to a fake lesson.

Unlock rule:

```txt
Checkpoint unlocks after all non-checkpoint lessons in the unit are complete.
Next unit unlocks after checkpoint is passed.
```

Quiz rules:

- 5 questions.
- Full sentence translation MCQ.
- Harder than regular lesson exercises.
- Use only vocabulary and grammar already introduced in the unit.
- Passing score: 80%.
- Passed checkpoint marks `completedCheckpoints` with the unit ID.

Result rules:

```txt
Score >= 80:
  "Unit Complete"
  bonus XP
  mark checkpoint complete

Score < 80:
  "Almost there"
  smaller XP or no bonus
  offer retry
```

## Review Rules

Review is not a separate content silo. It is a resurfacing engine.

Review sessions should include:

- High forgetting score lessons from `lessonMemory`.
- Recent mistakes from `recentMistakes`.
- Mixed exercises from the most recently active unit.
- At least two exercise types whenever possible.

Review card copy:

```txt
If forgettingScore > 1.0:
  "Review due"

If forgettingScore > 0.5:
  "Good time to review"

If never practiced:
  "New lesson"
```

## Learn Path Design

The learn path should communicate:

- Where am I?
- What can I do next?
- What is locked?
- What did I finish?
- What should I review?
- Where is the unit checkpoint?

Recommended path per unit:

```txt
Unit Banner
  Lesson node 1: active/completed/locked
  Lesson node 2: active/completed/locked
  Lesson node 3: active/completed/locked
  Review node: optional, due-state visible
  Checkpoint node: locked/active/completed
```

Visual rules:

- Completed: green.
- Active: blue or unit color with bounce/scale affordance.
- Locked: muted gray.
- Checkpoint: gold star/trophy treatment.
- Review due: warm yellow/orange badge.

Avoid using cards for every node. The path should feel like a journey, with
nodes and connectors, not a list of content blocks.

## Motivation System

Motivation should be layered:

```txt
Within exercise:
  immediate feedback drawer, correct answer, haptics.

Within lesson:
  progress bar, hearts, combo.

After lesson:
  XP, score, streak, mistakes repaired.

Across days:
  streak, daily challenge, review due.

Across units:
  checkpoints, unit completion, achievements.
```

Design guardrails:

- Feedback must be specific, never shaming.
- Hearts should create focus, not block learning permanently.
- Streaks should reward consistency, not replace learning goals.
- XP should reflect meaningful practice, not button tapping.
- Celebrations should be short and delightful.

## Content Creation Process

Use this process for new content:

```txt
1. Choose language and CEFR level.
2. Define unit can-do goal.
3. Pick vocabulary and grammar focus.
4. Write lesson objectives.
5. Create an exercise recipe before writing actual questions.
6. Draft exercises manually or with AI.
7. Human-review for correctness, naturalness, and difficulty.
8. Add checkpoint questions.
9. Add review tags or map exercises back to lessons.
10. Test in the app.
```

AI drafting prompt template:

```txt
Write exercises for Lingua.

Language: [language]
CEFR: [A1/A2/etc.]
Unit goal: [can-do goal]
Lesson goal: [single objective]
Vocabulary: [target words]
Grammar focus: [one pattern]
Exercise type: [mcq/fill/tap/matching/listening]
Rules:
- Keep the exercise beginner friendly.
- Use only known vocabulary unless explicitly introducing a new word.
- Include the correct answer and plausible distractors.
- For Japanese beginner content, include native script and pronunciation.
- Keep the answer short enough for a mobile exercise.
```

Human review checklist:

- Is the phrase natural?
- Is the answer unambiguous?
- Are distractors plausible but not unfair?
- Does the exercise use only taught content?
- Is the difficulty right for the lesson position?
- Does the pronunciation help without becoming a crutch?
- Does it render correctly on mobile?

## Starter Course Plan

### Spanish A1

```txt
Unit 1: Introductions and Basics
Goal: greet someone, introduce yourself, ask name, say thank you.

Lessons:
1. Greetings
2. Names and introductions
3. How are you?
4. Polite phrases
Checkpoint: first conversation

Unit 2: Cafe and Daily Requests
Goal: order a drink or snack politely.

Lessons:
1. Cafe greetings
2. Drinks
3. Food words
4. Asking for the bill
Checkpoint: order at a cafe

Unit 3: Dining
Goal: order a simple meal and respond to restaurant questions.
```

### French A1

```txt
Unit 1: First Steps in French
Goal: greet someone, introduce yourself, and use polite basics.

Lessons:
1. Bonjour and greetings
2. Names
3. Merci and politeness
4. Simple conversation
Checkpoint: first conversation
```

### Japanese A1

```txt
Unit 1: First Conversations
Goal: greet someone politely, thank them, excuse yourself, and introduce yourself.

Lessons:
1. Core greetings
2. Excuse me and thank you
3. I am...
4. Nice to meet you
Checkpoint: polite first meeting
```

Japanese beginner support:

- Use hiragana chunks for fill blanks.
- Show romanized pronunciation under word-bank options.
- Do not require keyboard Japanese input in the first unit.
- Introduce typing only after learners have seen the same words many times.

## Implementation Roadmap

### Phase A: Content Consistency

- Repair mojibake strings in lesson data.
- Align unit titles and descriptions with actual lesson content.
- Remove or stop using `Lesson.isCheckpoint` as content.
- Keep `Unit.checkpointQuiz` as the checkpoint source of truth.

### Phase B: Better Metadata

The first three fields are already implemented on `Unit`. Add the remaining
fields only when the UI needs them:

```ts
canDoGoal?: string;
targetVocabulary?: string[];
grammarFocus?: string[];
reviewTags?: string[];
difficulty?: "intro" | "practice" | "challenge";
```

### Phase C: Learn Path Rules

- Checkpoint unlocks after all unit lessons.
- Next unit unlocks after checkpoint pass.
- Review node appears inside each unit.
- Daily challenge points to urgent review or active lesson.

### Phase D: Review Intelligence

- Blend forgetting score, mistakes, and unit recency.
- Prefer mixed exercise types.
- Record practice per reviewed lesson.

### Phase E: Content Expansion

- Build full Unit 1 for Spanish, French, Japanese.
- Add Arabic only after a complete first unit is authored.
- Keep every new lesson inside the blueprint above.

## Definition of Done for a Unit

A unit is complete when:

- It has one can-do goal.
- It has 3 to 5 lessons.
- Each lesson has 6 to 8 exercises.
- Every exercise maps to taught vocabulary or grammar.
- The unit has a 5-question checkpoint.
- The checkpoint is harder than lesson practice.
- Review can pull exercises from the unit.
- The learn path shows lesson, review, and checkpoint states clearly.
- The unit works on mobile without text overlap.
- Typecheck and lint pass after code changes.
