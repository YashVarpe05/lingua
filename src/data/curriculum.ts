import type {
  CurriculumConcept,
  CurriculumLessonPlan,
  Exercise,
  Lesson,
  LessonType,
  Unit,
} from "@/types/learning";

type CurriculumExerciseMetadata = {
  conceptIds: string[];
  skillId?: string;
  reviewPrompt?: string;
};

export type CurriculumExplanationConcept = {
  id: string;
  title: string;
  description?: string;
  examples?: string[];
  reviewPrompt?: string;
};

type FallbackPhraseBank = {
  hello: string;
  goodbye: string;
  thanks: string;
  please: string;
  yes: string;
  no: string;
  intro: string;
  water: string;
  menu: string;
  bill: string;
};

export type CurriculumFallbackLessonTemplate = {
  title: string;
  description: string;
  type: LessonType;
  xpReward: number;
  durationMinutes: number;
  goals: string[];
  conceptIds: string[];
  phrases: FallbackPhraseBank;
};

const fallbackPhraseBanks: Record<string, FallbackPhraseBank> = {
  es: {
    hello: "Hola",
    goodbye: "Adiós",
    thanks: "Gracias",
    please: "Por favor",
    yes: "Sí",
    no: "No",
    intro: "Me llamo",
    water: "Agua",
    menu: "Menú",
    bill: "La cuenta",
  },
  fr: {
    hello: "Bonjour",
    goodbye: "Au revoir",
    thanks: "Merci",
    please: "S'il vous plaît",
    yes: "Oui",
    no: "Non",
    intro: "Je m'appelle",
    water: "Eau",
    menu: "Menu",
    bill: "L'addition",
  },
  ja: {
    hello: "Konnichiwa",
    goodbye: "Sayounara",
    thanks: "Arigatou",
    please: "Onegaishimasu",
    yes: "Hai",
    no: "Iie",
    intro: "Hajimemashite",
    water: "Mizu",
    menu: "Menyu",
    bill: "Okaikei",
  },
  ar: {
    hello: "Marhaba",
    goodbye: "Ma'a salama",
    thanks: "Shukran",
    please: "Min fadlak",
    yes: "Na'am",
    no: "La",
    intro: "Ismi",
    water: "Ma",
    menu: "Qa'imat al-ta'am",
    bill: "Al-fatura",
  },
  de: {
    hello: "Hallo",
    goodbye: "Auf Wiedersehen",
    thanks: "Danke",
    please: "Bitte",
    yes: "Ja",
    no: "Nein",
    intro: "Ich heiße",
    water: "Wasser",
    menu: "Speisekarte",
    bill: "Rechnung",
  },
  it: {
    hello: "Ciao",
    goodbye: "Arrivederci",
    thanks: "Grazie",
    please: "Per favore",
    yes: "Sì",
    no: "No",
    intro: "Mi chiamo",
    water: "Acqua",
    menu: "Menù",
    bill: "Il conto",
  },
  pt: {
    hello: "Olá",
    goodbye: "Adeus",
    thanks: "Obrigado",
    please: "Por favor",
    yes: "Sim",
    no: "Não",
    intro: "Meu nome é",
    water: "Água",
    menu: "Cardápio",
    bill: "A conta",
  },
  "pt-PT": {
    hello: "Olá",
    goodbye: "Adeus",
    thanks: "Obrigado",
    please: "Por favor",
    yes: "Sim",
    no: "Não",
    intro: "Chamo-me",
    water: "Água",
    menu: "Ementa",
    bill: "A conta",
  },
  ru: {
    hello: "Privet",
    goodbye: "Do svidaniya",
    thanks: "Spasibo",
    please: "Pozhaluysta",
    yes: "Da",
    no: "Net",
    intro: "Menya zovut",
    water: "Voda",
    menu: "Menyu",
    bill: "Schyot",
  },
  zh: {
    hello: "Ni hao",
    goodbye: "Zai jian",
    thanks: "Xie xie",
    please: "Qing",
    yes: "Shi",
    no: "Bu",
    intro: "Wo jiao",
    water: "Shui",
    menu: "Caidan",
    bill: "Zhangdan",
  },
  ko: {
    hello: "Annyeonghaseyo",
    goodbye: "Annyeonghi gaseyo",
    thanks: "Gamsahamnida",
    please: "Juseyo",
    yes: "Ne",
    no: "Aniyo",
    intro: "Je ireumeun",
    water: "Mul",
    menu: "Menyu",
    bill: "Gyesanseo",
  },
  hi: {
    hello: "Namaste",
    goodbye: "Alvida",
    thanks: "Dhanyavaad",
    please: "Kripaya",
    yes: "Haan",
    no: "Nahin",
    intro: "Mera naam",
    water: "Pani",
    menu: "Menu",
    bill: "Bill",
  },
  en: {
    hello: "Hello",
    goodbye: "Goodbye",
    thanks: "Thank you",
    please: "Please",
    yes: "Yes",
    no: "No",
    intro: "My name is",
    water: "Water",
    menu: "Menu",
    bill: "The bill",
  },
};

const genericPhraseBank: FallbackPhraseBank = fallbackPhraseBanks.en;

export const curriculumConcepts: CurriculumConcept[] = [
  {
    id: "es:basics:greetings",
    languageId: "es",
    title: "Greetings",
    description: "Say hello, goodbye, and simple opening phrases in Spanish.",
    type: "phrase",
    skillArea: "basics",
    cefrLevel: "A1",
    keywords: ["hola", "adios", "hello", "goodbye", "buenos dias", "hasta luego"],
    examples: ["Hola", "Adios", "Hasta luego"],
    whyItMatters: "Greetings are the first building block for real conversations.",
    reviewPrompt: "Review greetings so opening a conversation feels automatic.",
  },
  {
    id: "es:basics:gratitude",
    languageId: "es",
    title: "Gratitude",
    description: "Use polite thank-you phrases.",
    type: "phrase",
    skillArea: "politeness",
    cefrLevel: "A1",
    keywords: ["gracias", "de nada", "thank you", "you are welcome", "youre welcome"],
    examples: ["Gracias", "De nada"],
    whyItMatters: "Polite phrases make beginner conversations feel natural.",
    reviewPrompt: "Practice thank-you phrases to keep polite replies quick.",
  },
  {
    id: "es:basics:wellbeing",
    languageId: "es",
    title: "How Are You",
    description: "Ask and answer simple wellbeing questions.",
    type: "conversation",
    skillArea: "basics",
    cefrLevel: "A1",
    keywords: ["como estas", "cómo estás", "bien", "mal", "how are you", "good", "today"],
    examples: ["¿Cómo estás?", "Bien, gracias"],
    whyItMatters: "Short check-ins make greetings feel like real conversation.",
    reviewPrompt: "Review check-in phrases so greetings can continue naturally.",
  },
  {
    id: "es:introductions:names",
    languageId: "es",
    title: "Introductions",
    description: "Introduce yourself and ask someone's name.",
    type: "conversation",
    skillArea: "introductions",
    cefrLevel: "A1",
    keywords: ["me llamo", "como te llamas", "yo soy", "my name", "what is your name", "mucho gusto", "nice to meet"],
    examples: ["Me llamo Ana", "¿Cómo te llamas?", "Mucho gusto"],
    whyItMatters: "Name exchanges turn memorized words into a conversation.",
    reviewPrompt: "Strengthen introductions so meeting someone feels easy.",
  },
  {
    id: "es:food:cafe-orders",
    languageId: "es",
    title: "Café Orders",
    description: "Order simple drinks and food.",
    type: "conversation",
    skillArea: "food",
    cefrLevel: "A1",
    keywords: ["cafe", "café", "leche", "agua", "menu", "menú", "cuenta", "croissant", "barista", "coffee", "water", "bill", "té verde"],
    examples: ["Quiero café", "La cuenta, por favor"],
    whyItMatters: "Food ordering is a high-value travel skill.",
    reviewPrompt: "Review café words so ordering stays fluent.",
  },
  {
    id: "es:dining:restaurant-requests",
    languageId: "es",
    title: "Restaurant Requests",
    description: "Ask for a table, order food, and handle simple dining phrases.",
    type: "conversation",
    skillArea: "dining",
    cefrLevel: "A1",
    keywords: ["comida", "mesa", "ordenar", "quisiera", "podemos tener", "meal", "food", "table", "restaurant"],
    examples: ["Quisiera ordenar", "Una mesa para dos"],
    whyItMatters: "Restaurant language combines vocabulary with useful sentence patterns.",
    reviewPrompt: "Practice restaurant requests before they fade.",
  },
  {
    id: "fr:basics:greetings",
    languageId: "fr",
    title: "Greetings",
    description: "Say hello and goodbye in everyday French.",
    type: "phrase",
    skillArea: "basics",
    cefrLevel: "A1",
    keywords: ["bonjour", "salut", "au revoir", "hello", "goodbye"],
    examples: ["Bonjour", "Au revoir"],
    whyItMatters: "Greetings are the easiest way to start using French out loud.",
    reviewPrompt: "Review French greetings so they come back quickly.",
  },
  {
    id: "fr:basics:gratitude",
    languageId: "fr",
    title: "Gratitude",
    description: "Use common polite French phrases.",
    type: "phrase",
    skillArea: "politeness",
    cefrLevel: "A1",
    keywords: ["merci", "beaucoup", "de rien", "thank you", "you are welcome", "youre welcome"],
    examples: ["Merci", "Merci beaucoup"],
    whyItMatters: "Polite language helps learners sound warm instead of mechanical.",
    reviewPrompt: "Practice gratitude phrases to keep polite responses fresh.",
  },
  {
    id: "fr:politeness:excuse",
    languageId: "fr",
    title: "Polite Phrases",
    description: "Get attention politely and apologize lightly.",
    type: "phrase",
    skillArea: "politeness",
    cefrLevel: "A1",
    keywords: ["excusez-moi", "excuse moi", "s il vous plait", "please", "excuse me", "sorry"],
    examples: ["Excusez-moi", "S'il vous plaît"],
    whyItMatters: "Politeness phrases are useful in almost every real interaction.",
    reviewPrompt: "Review polite phrases because they are easy to forget under pressure.",
  },
  {
    id: "fr:introductions:names",
    languageId: "fr",
    title: "Introductions",
    description: "Introduce yourself and ask for names.",
    type: "conversation",
    skillArea: "introductions",
    cefrLevel: "A1",
    keywords: ["je m appelle", "comment vous appelez-vous", "enchante", "name", "nice to meet", "oui", "non"],
    examples: ["Je m'appelle Lea", "Enchante"],
    whyItMatters: "Introductions connect vocabulary to real social use.",
    reviewPrompt: "Strengthen introductions so short conversations feel smoother.",
  },
  {
    id: "ja:basics:greetings",
    languageId: "ja",
    title: "Greetings",
    description: "Recognize and use beginner Japanese greetings.",
    type: "phrase",
    skillArea: "basics",
    cefrLevel: "A1",
    keywords: ["konnichiwa", "sayounara", "hello", "goodbye", "good morning"],
    examples: ["Konnichiwa", "Sayounara"],
    whyItMatters: "Japanese greetings build confidence before typing or grammar gets harder.",
    reviewPrompt: "Review greetings with pronunciation so recall stays automatic.",
  },
  {
    id: "ja:basics:gratitude",
    languageId: "ja",
    title: "Gratitude",
    description: "Say thank you in Japanese.",
    type: "phrase",
    skillArea: "politeness",
    cefrLevel: "A1",
    keywords: ["arigatou", "arigato", "thank you"],
    examples: ["Arigatou"],
    whyItMatters: "Polite phrases make beginner Japanese immediately useful.",
    reviewPrompt: "Practice thank-you phrases with romaji support.",
  },
  {
    id: "ja:politeness:sumimasen",
    languageId: "ja",
    title: "Excuse Me",
    description: "Use the common Japanese phrase for excuse me or sorry.",
    type: "phrase",
    skillArea: "politeness",
    cefrLevel: "A1",
    keywords: ["sumimasen", "excuse me", "sorry"],
    examples: ["Sumimasen"],
    whyItMatters: "This phrase is useful constantly in real Japanese interactions.",
    reviewPrompt: "Review sumimasen so the full phrase sticks, not just the ending.",
  },
  {
    id: "ja:introductions:self",
    languageId: "ja",
    title: "Self Introductions",
    description: "Say nice to meet you and start a basic introduction.",
    type: "conversation",
    skillArea: "introductions",
    cefrLevel: "A1",
    keywords: ["hajimemashite", "desu", "o-namae", "yoroshiku", "name", "nice to meet", "self introduction", "kenji"],
    examples: ["Hajimemashite", "Yoroshiku onegaishimasu"],
    whyItMatters: "Self-introduction patterns are the first useful Japanese sentences.",
    reviewPrompt: "Strengthen introduction phrases before moving to longer sentences.",
  },
  {
    id: "ar:basics:greetings",
    languageId: "ar",
    title: "Greetings",
    description: "Use common Arabic greetings.",
    type: "phrase",
    skillArea: "basics",
    cefrLevel: "A1",
    keywords: ["marhaba", "salam", "hello", "goodbye", "ma a salama"],
    examples: ["Marhaba", "Ma'a salama"],
    whyItMatters: "Greetings give learners an easy entry point into Arabic conversation.",
    reviewPrompt: "Review Arabic greetings so the sound pattern stays familiar.",
  },
  {
    id: "ar:basics:gratitude",
    languageId: "ar",
    title: "Gratitude",
    description: "Say thank you and reply politely in Arabic.",
    type: "phrase",
    skillArea: "politeness",
    cefrLevel: "A1",
    keywords: ["shukran", "afwan", "thank you", "you are welcome", "youre welcome"],
    examples: ["Shukran", "Afwan"],
    whyItMatters: "Polite replies are useful from the first day.",
    reviewPrompt: "Practice Arabic polite replies before they fade.",
  },
  {
    id: "ar:politeness:please",
    languageId: "ar",
    title: "Polite Requests",
    description: "Ask politely using please and simple request phrases.",
    type: "phrase",
    skillArea: "politeness",
    cefrLevel: "A1",
    keywords: ["min fadlak", "please", "qahwa", "coffee"],
    examples: ["Min fadlak"],
    whyItMatters: "Simple polite requests make travel and daily interactions easier.",
    reviewPrompt: "Review polite request phrases before practicing longer Arabic sentences.",
  },
  {
    id: "ar:introductions:names",
    languageId: "ar",
    title: "Introductions",
    description: "Introduce yourself and ask for a name.",
    type: "conversation",
    skillArea: "introductions",
    cefrLevel: "A1",
    keywords: ["ismi", "ma ismuka", "name", "my name", "what is your name", "tasharrafna", "nice to meet"],
    examples: ["Ismi", "Ma ismuka?"],
    whyItMatters: "Name phrases make Arabic practice feel conversational.",
    reviewPrompt: "Strengthen Arabic introductions with short repeat practice.",
  },
];

export const curriculumLessonPlans: CurriculumLessonPlan[] = [
  {
    lessonId: "es_u1_l1",
    unitId: "es_unit_1",
    languageId: "es",
    canDoStatement: "I can greet someone and say thank you in Spanish.",
    primaryConceptIds: ["es:basics:greetings", "es:basics:gratitude"],
    recommendedReviewAfterDays: 1,
  },
  {
    lessonId: "es_u1_l2",
    unitId: "es_unit_1",
    languageId: "es",
    canDoStatement: "I can introduce myself in Spanish.",
    primaryConceptIds: ["es:introductions:names"],
    supportConceptIds: ["es:basics:greetings"],
    recommendedReviewAfterDays: 2,
  },
  {
    lessonId: "es_u1_l3",
    unitId: "es_unit_1",
    languageId: "es",
    canDoStatement: "I can handle a short first conversation in Spanish.",
    primaryConceptIds: ["es:basics:greetings", "es:basics:wellbeing"],
    supportConceptIds: ["es:introductions:names", "es:basics:gratitude"],
    recommendedReviewAfterDays: 2,
  },
  {
    lessonId: "es_u2_l1",
    unitId: "es_unit_2",
    languageId: "es",
    canDoStatement: "I can order simple items at a café.",
    primaryConceptIds: ["es:food:cafe-orders"],
    supportConceptIds: ["es:basics:gratitude"],
    recommendedReviewAfterDays: 2,
  },
  {
    lessonId: "es_u2_l2",
    unitId: "es_unit_2",
    languageId: "es",
    canDoStatement: "I can understand useful café and menu phrases.",
    primaryConceptIds: ["es:food:cafe-orders"],
    supportConceptIds: ["es:basics:greetings"],
    recommendedReviewAfterDays: 3,
  },
  {
    lessonId: "es_u3_l1",
    unitId: "es_unit_3",
    languageId: "es",
    canDoStatement: "I can identify useful restaurant vocabulary.",
    primaryConceptIds: ["es:dining:restaurant-requests"],
    supportConceptIds: ["es:food:cafe-orders"],
    recommendedReviewAfterDays: 3,
  },
  {
    lessonId: "es_u3_l2",
    unitId: "es_unit_3",
    languageId: "es",
    canDoStatement: "I can handle a short restaurant exchange.",
    primaryConceptIds: ["es:dining:restaurant-requests"],
    supportConceptIds: ["es:food:cafe-orders"],
    recommendedReviewAfterDays: 4,
  },
  {
    lessonId: "fr_u1_l1",
    unitId: "fr_unit_1",
    languageId: "fr",
    canDoStatement: "I can greet someone and use simple polite French.",
    primaryConceptIds: ["fr:basics:greetings", "fr:basics:gratitude", "fr:politeness:excuse"],
    recommendedReviewAfterDays: 1,
  },
  {
    lessonId: "fr_u1_l2",
    unitId: "fr_unit_1",
    languageId: "fr",
    canDoStatement: "I can introduce myself in French.",
    primaryConceptIds: ["fr:introductions:names"],
    supportConceptIds: ["fr:basics:greetings", "fr:basics:gratitude"],
    recommendedReviewAfterDays: 2,
  },
  {
    lessonId: "ja_u1_l1",
    unitId: "ja_unit_1",
    languageId: "ja",
    canDoStatement: "I can recognize basic Japanese greetings and polite phrases.",
    primaryConceptIds: ["ja:basics:greetings", "ja:basics:gratitude", "ja:politeness:sumimasen"],
    recommendedReviewAfterDays: 1,
  },
  {
    lessonId: "ja_u1_l2",
    unitId: "ja_unit_1",
    languageId: "ja",
    canDoStatement: "I can begin a simple Japanese self-introduction.",
    primaryConceptIds: ["ja:introductions:self"],
    supportConceptIds: ["ja:basics:greetings"],
    recommendedReviewAfterDays: 2,
  },
  {
    lessonId: "ar_u1_l1",
    unitId: "ar_unit_1",
    languageId: "ar",
    canDoStatement: "I can greet someone and say thank you in Arabic.",
    primaryConceptIds: ["ar:basics:greetings", "ar:basics:gratitude"],
    recommendedReviewAfterDays: 1,
  },
  {
    lessonId: "ar_u1_l2",
    unitId: "ar_unit_1",
    languageId: "ar",
    canDoStatement: "I can introduce myself in Arabic.",
    primaryConceptIds: ["ar:introductions:names"],
    supportConceptIds: ["ar:basics:greetings"],
    recommendedReviewAfterDays: 2,
  },
  {
    lessonId: "ar_u1_l3",
    unitId: "ar_unit_1",
    languageId: "ar",
    canDoStatement: "I can make a simple polite request in Arabic.",
    primaryConceptIds: ["ar:politeness:please"],
    supportConceptIds: ["ar:basics:gratitude"],
    recommendedReviewAfterDays: 2,
  },
];

const normalizeForMatch = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.,!'"'?():;[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const unique = <T,>(items: T[]) => Array.from(new Set(items));

const compactStrings = (values: (string | undefined)[]) =>
  values.filter((value): value is string => Boolean(value?.trim()));

const getFallbackTitleFromConceptId = (conceptId: string) => {
  const normalizedConceptId = normalizeForMatch(conceptId.replace(/[-_:]/g, " "));
  const keywordConcept = curriculumConcepts.find((concept) =>
    concept.keywords.some((keyword) => normalizedConceptId.includes(normalizeForMatch(keyword))),
  );

  if (keywordConcept) return keywordConcept.title;

  const parts = conceptId.split(":");
  const topic = parts[parts.length - 1] || "Practice";

  return topic
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getLanguageConcepts = (languageId?: string) =>
  languageId ? curriculumConcepts.filter((concept) => concept.languageId === languageId) : [];

const getPreferredConceptId = (
  languageId: string,
  topic: "greetings" | "gratitude" | "politeness" | "introductions" | "food",
) => {
  const concept = curriculumConcepts.find(
    (item) =>
      item.languageId === languageId &&
      (item.id.includes(topic) ||
        item.title.toLowerCase().includes(topic === "politeness" ? "polite" : topic)),
  );

  return concept?.id ?? `${languageId}:fallback:${topic}`;
};

const getExerciseSearchText = (exercise: Exercise) =>
  compactStrings([
    exercise.question,
    exercise.correctAnswer,
    exercise.sentence,
    exercise.audioText,
    ...(exercise.options ?? []),
    ...(exercise.acceptedAnswers ?? []),
    ...(exercise.wordBank ?? []).flatMap((option) => [
      option.value,
      option.label,
      option.pronunciation,
      option.translation,
    ]),
    ...(exercise.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
  ]).join(" ");

export const getCurriculumConceptById = (conceptId?: string) =>
  conceptId ? curriculumConcepts.find((concept) => concept.id === conceptId) : undefined;

export const getCurriculumLessonPlan = (lessonId?: string) =>
  lessonId ? curriculumLessonPlans.find((plan) => plan.lessonId === lessonId) : undefined;

export const getCurriculumConceptsForLesson = (lessonId?: string) => {
  const lessonPlan = getCurriculumLessonPlan(lessonId);

  if (!lessonPlan) return [];

  return unique([
    ...lessonPlan.primaryConceptIds,
    ...(lessonPlan.supportConceptIds ?? []),
  ])
    .map(getCurriculumConceptById)
    .filter((concept): concept is CurriculumConcept => Boolean(concept));
};

export const getCurriculumMetadataForExercise = (
  exercise: Exercise,
  lesson?: Lesson,
  unit?: Unit,
): CurriculumExerciseMetadata => {
  const lessonPlan = getCurriculumLessonPlan(lesson?.id);
  const languageId = lessonPlan?.languageId ?? unit?.languageId ?? exercise.languageId;
  const lessonConcepts = getCurriculumConceptsForLesson(lesson?.id);
  const languageConcepts = getLanguageConcepts(languageId);
  const candidateConcepts = lessonConcepts.length ? lessonConcepts : languageConcepts;
  const searchText = normalizeForMatch(getExerciseSearchText(exercise));

  const matchedConcepts = candidateConcepts.filter((concept) =>
    concept.keywords.some((keyword) => searchText.includes(normalizeForMatch(keyword))),
  );
  const plannedConcepts = (lessonPlan?.primaryConceptIds ?? [])
    .map(getCurriculumConceptById)
    .filter((concept): concept is CurriculumConcept => Boolean(concept));
  const selectedConcepts = unique([
    ...(matchedConcepts.length ? matchedConcepts : plannedConcepts),
    ...lessonConcepts,
  ]).slice(0, 3);
  const primaryConcept = selectedConcepts[0];
  const unitId = unit?.id ?? lesson?.unitId ?? exercise.unitId;

  return {
    conceptIds: selectedConcepts.map((concept) => concept.id),
    skillId: primaryConcept
      ? `${unitId ?? primaryConcept.languageId}:${primaryConcept.skillArea}`
      : lesson?.id,
    reviewPrompt: primaryConcept?.reviewPrompt,
  };
};

export const getCurriculumFallbackLessonTemplate = (
  languageId: string,
  languageName: string,
  order: number,
): CurriculumFallbackLessonTemplate => {
  const phrases = fallbackPhraseBanks[languageId] ?? genericPhraseBank;
  const greetingConcept = getPreferredConceptId(languageId, "greetings");
  const gratitudeConcept = getPreferredConceptId(languageId, "gratitude");
  const politenessConcept = getPreferredConceptId(languageId, "politeness");
  const introductionConcept = getPreferredConceptId(languageId, "introductions");
  const foodConcept = getPreferredConceptId(languageId, "food");
  const templates: CurriculumFallbackLessonTemplate[] = [
    {
      title: "Greetings & Polite Phrases",
      description: `Learn hello, goodbye, thank you, and please in ${languageName}.`,
      type: "vocabulary",
      xpReward: 10,
      durationMinutes: 3,
      goals: ["Recognize greetings", "Say thank you", "Use a polite request"],
      conceptIds: [greetingConcept, gratitudeConcept, politenessConcept],
      phrases,
    },
    {
      title: "Introduce Yourself",
      description: `Practice a short first introduction in ${languageName}.`,
      type: "video",
      xpReward: 20,
      durationMinutes: 5,
      goals: ["Say your name", "Recognize yes and no", "Start a short exchange"],
      conceptIds: [introductionConcept, greetingConcept],
      phrases,
    },
    {
      title: "Everyday Requests",
      description: `Practice asking for simple everyday things in ${languageName}.`,
      type: "chat",
      xpReward: 15,
      durationMinutes: 4,
      goals: ["Ask politely", "Recognize water and menu", "Use thank you naturally"],
      conceptIds: [politenessConcept, foodConcept, gratitudeConcept],
      phrases,
    },
    {
      title: "Travel Basics",
      description: `Review useful travel phrases before longer conversations in ${languageName}.`,
      type: "chat",
      xpReward: 20,
      durationMinutes: 5,
      goals: ["Ask for help", "Use polite phrases", "Recognize travel words"],
      conceptIds: [politenessConcept, greetingConcept],
      phrases,
    },
    {
      title: "Cafe Practice",
      description: `Practice menu, water, and bill phrases in ${languageName}.`,
      type: "vocabulary",
      xpReward: 10,
      durationMinutes: 4,
      goals: ["Ask for a menu", "Ask for water", "Request the bill"],
      conceptIds: [foodConcept, politenessConcept],
      phrases,
    },
    {
      title: "Conversation Review",
      description: `Review greetings, introductions, and polite replies in ${languageName}.`,
      type: "video",
      xpReward: 15,
      durationMinutes: 6,
      goals: ["Combine phrases", "Answer short prompts", "Prepare for checkpoint practice"],
      conceptIds: [greetingConcept, introductionConcept, gratitudeConcept],
      phrases,
    },
  ];

  return templates[Math.max(order - 1, 0)] ?? templates[0];
};

export const getCurriculumReviewPrompt = (conceptId?: string) =>
  getCurriculumConceptById(conceptId)?.reviewPrompt;

export const getCurriculumConceptTitle = (conceptId?: string) =>
  getCurriculumConceptById(conceptId)?.title ?? (conceptId ? getFallbackTitleFromConceptId(conceptId) : undefined);

export const getCurriculumExplanationContext = (
  conceptIds: string[] = [],
): CurriculumExplanationConcept[] =>
  unique(conceptIds)
    .slice(0, 3)
    .map((conceptId) => {
      const concept = getCurriculumConceptById(conceptId);

      return {
        id: conceptId,
        title: concept?.title ?? getFallbackTitleFromConceptId(conceptId),
        description: concept?.description,
        examples: concept?.examples?.slice(0, 3),
        reviewPrompt: concept?.reviewPrompt,
      };
    });

export const getCurriculumReviewLabel = (conceptIds: string[]) => {
  const titles = unique(
    conceptIds
      .map(getCurriculumConceptTitle)
      .filter((title): title is string => Boolean(title)),
  ).slice(0, 2);

  return titles.join(" + ");
};
