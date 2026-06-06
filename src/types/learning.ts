export interface Language {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  code: string;
}

export interface Unit {
  id: string;
  languageId: string;
  title: string;
  description: string;
  order: number;
  unitColor?: string;
  unitEmoji?: string;
  cefr?: string;
  canDoGoal?: string;
  targetVocabulary?: string[];
  grammarFocus?: string[];
  checkpointQuiz?: {
    id: string;
    title: string;
    exercises: Exercise[];
  };
}

export type LessonType = "video" | "audio" | "chat" | "vocabulary";

export type ActivityType = "translate" | "multiple-choice" | "speaking" | "vocabulary-match";

export interface Activity {
  id: string;
  lessonId: string;
  type: ActivityType;
  question: string;
  options?: string[]; // Used for multiple-choice selections
  correctAnswer: string;
  translationContext?: string; // Context notes helper for translation exercises
}

export type ExerciseType = "mcq" | "fill-in-the-blank" | "matching-pairs" | "tap-word" | "listen-type";

export type ExerciseDifficulty = "intro" | "practice" | "challenge";

export type ExerciseDifficultyBand = "warmup" | "practice" | "challenge";

export type CurriculumConceptType =
  | "vocabulary"
  | "phrase"
  | "grammar"
  | "listening"
  | "conversation";

export type CurriculumSkillArea =
  | "basics"
  | "introductions"
  | "politeness"
  | "food"
  | "travel"
  | "dining";

export interface CurriculumConcept {
  id: string;
  languageId: string;
  title: string;
  description: string;
  type: CurriculumConceptType;
  skillArea: CurriculumSkillArea;
  cefrLevel: string;
  keywords: string[];
  examples?: string[];
  prerequisites?: string[];
  commonMistakes?: string[];
  explanationHint?: string;
  whyItMatters: string;
  reviewPrompt: string;
}

export interface CurriculumLessonPlan {
  lessonId: string;
  unitId: string;
  languageId: string;
  canDoStatement: string;
  primaryConceptIds: string[];
  supportConceptIds?: string[];
  recommendedReviewAfterDays?: number;
  teachingFocus?: string;
}

export type SessionIntent =
  | "lesson"
  | "daily-challenge"
  | "review"
  | "mistakes"
  | "vocabulary"
  | "listening"
  | "checkpoint"
  | "ai-teacher"
  | "chat-tutor";

export interface MatchingPairItem {
  id: string;
  left: string;  // e.g. target language word
  right: string; // e.g. English meaning
}

export interface WordBankOption {
  value: string; // answer value used for checking
  label?: string; // visible target-language tile text
  pronunciation?: string; // learner-friendly pronunciation helper
  translation?: string; // optional English meaning
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string; // instruction or text
  options?: string[]; // MCQs options or Tap Word grid items
  correctAnswer: string; // correct translation or missing word
  acceptedAnswers?: string[]; // additional answer values accepted as correct
  wordBank?: WordBankOption[]; // richer options for fill-in-the-blank word tiles
  audioText?: string; // string to read for listen-type
  pairs?: MatchingPairItem[]; // matching pairs list
  sentence?: string; // sentence with a blank or placeholder
  conceptIds?: string[]; // learning concepts practiced by this exercise
  vocabularyIds?: string[]; // optional vocabulary references for future review
  skillId?: string; // lesson/skill grouping used by the session generator
  unitId?: string; // denormalized metadata added by content or generator
  lessonId?: string; // denormalized metadata added by content or generator
  languageId?: string; // denormalized metadata added by content or generator
  cefrLevel?: string;
  difficulty?: ExerciseDifficulty;
  predictedDifficultyScore?: number; // 0 easy, 1 hard
  difficultyBand?: ExerciseDifficultyBand;
  isRepair?: boolean; // local session-only metadata for mistake repair practice
  repairForExerciseId?: string; // original missed exercise this repair targets
  estimatedSeconds?: number;
}

export interface ExerciseAttempt {
  id: string;
  sessionId: string;
  sessionIntent: SessionIntent;
  exerciseId: string;
  exerciseType: ExerciseType;
  correctAnswer: string;
  selectedAnswer?: string;
  correct: boolean;
  conceptIds: string[];
  lessonId?: string;
  unitId?: string;
  languageId?: string;
  difficulty?: ExerciseDifficulty;
  durationMs?: number;
  predictedDifficultyScore?: number;
  createdAt: number;
}

export interface ConceptMemoryEntry {
  conceptId: string;
  lastPracticed: number;
  practiceCount: number;
  correctCount: number;
  incorrectCount: number;
  halfLifeDays: number;
  latestRecallScore: number;
}

export interface DifficultyMemoryEntry {
  id: string;
  kind: "exercise" | "concept";
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  avgResponseMs: number;
  difficultyScore: number; // 0 easy, 1 hard
  lastPracticed: number;
}

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  description: string;
  type: LessonType;
  order: number;
  xpReward: number;
  durationMinutes: number;
  goals: string[];
  canDoStatement?: string;
  newConceptIds?: string[];
  reviewConceptIds?: string[];
  teachingFocus?: string;
  aiPrompt?: string; // Prompt configured for future AI Teacher video/audio lessons
  activities: Activity[];
  exercises?: Exercise[];
  isCheckpoint?: boolean;
}

export interface VocabularyItem {
  id: string;
  languageId: string;
  word: string;
  translation: string;
  pronunciation: string;
  exampleSentence: string;
  exampleTranslation: string;
}

export interface PhraseItem {
  id: string;
  languageId: string;
  phrase: string;
  translation: string;
  pronunciation: string;
  situation: string; // The contextual setting (e.g., "At a restaurant")
}
