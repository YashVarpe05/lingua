import type {
  CurriculumConcept,
  CurriculumLessonPlan,
  Exercise,
  Lesson,
  LessonType,
  Unit,
} from "@/types/learning";
import { coreA1Concepts, coreA1LessonPlans } from "./a1Course";

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
    hello: "\u3053\u3093\u306B\u3061\u306F",
    goodbye: "\u3055\u3088\u3046\u306A\u3089",
    thanks: "\u3042\u308A\u304C\u3068\u3046",
    please: "\u304A\u306D\u304C\u3044\u3057\u307E\u3059",
    yes: "\u306F\u3044",
    no: "\u3044\u3044\u3048",
    intro: "\u306F\u3058\u3081\u307E\u3057\u3066",
    water: "\u6C34",
    menu: "\u30E1\u30CB\u30E5\u30FC",
    bill: "\u304A\u4F1A\u8A08",
  },
  ar: {
    hello: "\u0645\u0631\u062D\u0628\u0627",
    goodbye: "\u0645\u0639 \u0627\u0644\u0633\u0644\u0627\u0645\u0629",
    thanks: "\u0634\u0643\u0631\u0627",
    please: "\u0645\u0646 \u0641\u0636\u0644\u0643",
    yes: "\u0646\u0639\u0645",
    no: "\u0644\u0627",
    intro: "\u0627\u0633\u0645\u064A",
    water: "\u0645\u0627\u0621",
    menu: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0637\u0639\u0627\u0645",
    bill: "\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629",
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
    hello: "\u041F\u0440\u0438\u0432\u0435\u0442",
    goodbye: "\u0414\u043E \u0441\u0432\u0438\u0434\u0430\u043D\u0438\u044F",
    thanks: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E",
    please: "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430",
    yes: "\u0414\u0430",
    no: "\u041D\u0435\u0442",
    intro: "\u041C\u0435\u043D\u044F \u0437\u043E\u0432\u0443\u0442",
    water: "\u0412\u043E\u0434\u0430",
    menu: "\u041C\u0435\u043D\u044E",
    bill: "\u0421\u0447\u0451\u0442",
  },
  zh: {
    hello: "\u4F60\u597D",
    goodbye: "\u518D\u89C1",
    thanks: "\u8C22\u8C22",
    please: "\u8BF7",
    yes: "\u662F",
    no: "\u4E0D",
    intro: "\u6211\u53EB",
    water: "\u6C34",
    menu: "\u83DC\u5355",
    bill: "\u8D26\u5355",
  },
  ko: {
    hello: "\uC548\uB155\uD558\uC138\uC694",
    goodbye: "\uC548\uB155\uD788 \uAC00\uC138\uC694",
    thanks: "\uAC10\uC0AC\uD569\uB2C8\uB2E4",
    please: "\uC8FC\uC138\uC694",
    yes: "\uB124",
    no: "\uC544\uB2C8\uC694",
    intro: "\uC81C \uC774\uB984\uC740",
    water: "\uBB3C",
    menu: "\uBA54\uB274",
    bill: "\uACC4\uC0B0\uC11C",
  },
  hi: {
    hello: "\u0928\u092E\u0938\u094D\u0924\u0947",
    goodbye: "\u0905\u0932\u0935\u093F\u0926\u093E",
    thanks: "\u0927\u0928\u094D\u092F\u0935\u093E\u0926",
    please: "\u0915\u0943\u092A\u092F\u093E",
    yes: "\u0939\u093E\u0901",
    no: "\u0928\u0939\u0940\u0902",
    intro: "\u092E\u0947\u0930\u093E \u0928\u093E\u092E",
    water: "\u092A\u093E\u0928\u0940",
    menu: "\u092E\u0947\u0928\u094D\u092F\u0942",
    bill: "\u092C\u093F\u0932",
  },
  nl: {
    hello: "Hallo",
    goodbye: "Tot ziens",
    thanks: "Dank je",
    please: "Alstublieft",
    yes: "Ja",
    no: "Nee",
    intro: "Ik heet",
    water: "Water",
    menu: "Menu",
    bill: "De rekening",
  },
  sv: {
    hello: "Hej",
    goodbye: "Hej d\u00E5",
    thanks: "Tack",
    please: "Sn\u00E4lla",
    yes: "Ja",
    no: "Nej",
    intro: "Jag heter",
    water: "Vatten",
    menu: "Meny",
    bill: "Notan",
  },
  fi: {
    hello: "Hei",
    goodbye: "N\u00E4kemiin",
    thanks: "Kiitos",
    please: "Ole hyv\u00E4",
    yes: "Kyll\u00E4",
    no: "Ei",
    intro: "Minun nimeni on",
    water: "Vesi",
    menu: "Ruokalista",
    bill: "Lasku",
  },
  tr: {
    hello: "Merhaba",
    goodbye: "Ho\u015F\u00E7a kal",
    thanks: "Te\u015Fekk\u00FCrler",
    please: "L\u00FCtfen",
    yes: "Evet",
    no: "Hay\u0131r",
    intro: "Benim ad\u0131m",
    water: "Su",
    menu: "Men\u00FC",
    bill: "Hesap",
  },
  id: {
    hello: "Halo",
    goodbye: "Selamat tinggal",
    thanks: "Terima kasih",
    please: "Tolong",
    yes: "Ya",
    no: "Tidak",
    intro: "Nama saya",
    water: "Air",
    menu: "Menu",
    bill: "Tagihan",
  },
  th: {
    hello: "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35",
    goodbye: "\u0E25\u0E32\u0E01\u0E48\u0E2D\u0E19",
    thanks: "\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13",
    please: "\u0E01\u0E23\u0E38\u0E13\u0E32",
    yes: "\u0E43\u0E0A\u0E48",
    no: "\u0E44\u0E21\u0E48",
    intro: "\u0E09\u0E31\u0E19\u0E0A\u0E37\u0E48\u0E2D",
    water: "\u0E19\u0E49\u0E33",
    menu: "\u0E40\u0E21\u0E19\u0E39",
    bill: "\u0E1A\u0E34\u0E25",
  },
  vi: {
    hello: "Xin ch\u00E0o",
    goodbye: "T\u1EA1m bi\u1EC7t",
    thanks: "C\u1EA3m \u01A1n",
    please: "L\u00E0m \u01A1n",
    yes: "C\u00F3",
    no: "Kh\u00F4ng",
    intro: "T\u00F4i t\u00EAn l\u00E0",
    water: "N\u01B0\u1EDBc",
    menu: "Th\u1EF1c \u0111\u01A1n",
    bill: "H\u00F3a \u0111\u01A1n",
  },
  pl: {
    hello: "Cze\u015B\u0107",
    goodbye: "Do widzenia",
    thanks: "Dzi\u0119kuj\u0119",
    please: "Prosz\u0119",
    yes: "Tak",
    no: "Nie",
    intro: "Mam na imi\u0119",
    water: "Woda",
    menu: "Menu",
    bill: "Rachunek",
  },
  uk: {
    hello: "\u041F\u0440\u0438\u0432\u0456\u0442",
    goodbye: "\u0414\u043E \u043F\u043E\u0431\u0430\u0447\u0435\u043D\u043D\u044F",
    thanks: "\u0414\u044F\u043A\u0443\u044E",
    please: "\u0411\u0443\u0434\u044C \u043B\u0430\u0441\u043A\u0430",
    yes: "\u0422\u0430\u043A",
    no: "\u041D\u0456",
    intro: "\u041C\u0435\u043D\u0435 \u0437\u0432\u0430\u0442\u0438",
    water: "\u0412\u043E\u0434\u0430",
    menu: "\u041C\u0435\u043D\u044E",
    bill: "\u0420\u0430\u0445\u0443\u043D\u043E\u043A",
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

const legacyCurriculumConcepts: CurriculumConcept[] = [
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

const coreA1ConceptIds = new Set(coreA1Concepts.map((concept) => concept.id));

export const curriculumConcepts: CurriculumConcept[] = [
  ...coreA1Concepts,
  ...legacyCurriculumConcepts.filter((concept) => !coreA1ConceptIds.has(concept.id)),
];

const legacyCurriculumLessonPlans: CurriculumLessonPlan[] = [
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

const coreA1LessonPlanIds = new Set(coreA1LessonPlans.map((plan) => plan.lessonId));

export const curriculumLessonPlans: CurriculumLessonPlan[] = [
  ...coreA1LessonPlans,
  ...legacyCurriculumLessonPlans.filter((plan) => !coreA1LessonPlanIds.has(plan.lessonId)),
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
