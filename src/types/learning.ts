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

export interface MatchingPairItem {
  id: string;
  left: string;  // e.g. target language word
  right: string; // e.g. English meaning
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string; // instruction or text
  options?: string[]; // MCQs options or Tap Word grid items
  correctAnswer: string; // correct translation or missing word
  audioText?: string; // string to read for listen-type
  pairs?: MatchingPairItem[]; // matching pairs list
  sentence?: string; // sentence with a blank or placeholder
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
