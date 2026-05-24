import { Lesson, VocabularyItem, PhraseItem } from "../types/learning";

export const lessons: Lesson[] = [
  // ==========================================
  // SPANISH LESSONS
  // ==========================================
  
  // Unit 1
  {
    id: "es_u1_l1",
    unitId: "es_unit_1",
    title: "Essential Greetings",
    description: "Learn basic greetings and responses like hello, goodbye, and thank you.",
    type: "vocabulary",
    order: 1,
    xpReward: 10,
    durationMinutes: 3,
    goals: ["Recognize basic greetings", "Say hello and goodbye", "Express gratitude"],
    activities: [
      {
        id: "es_u1_l1_a1",
        lessonId: "es_u1_l1",
        type: "multiple-choice",
        question: "How do you say 'Hello' in Spanish?",
        options: ["Adiós", "Gracias", "Hola", "Por favor"],
        correctAnswer: "Hola",
      },
      {
        id: "es_u1_l1_a2",
        lessonId: "es_u1_l1",
        type: "translate",
        question: "Translate: 'Gracias, de nada'",
        correctAnswer: "Thank you, you're welcome",
        translationContext: "Expressing gratitude and replying politely.",
      },
      {
        id: "es_u1_l1_a3",
        lessonId: "es_u1_l1",
        type: "vocabulary-match",
        question: "Match 'Goodbye' to its Spanish counterpart.",
        options: ["Hola", "Adiós", "De nada", "Buenos días"],
        correctAnswer: "Adiós",
      },
    ],
  },
  {
    id: "es_u1_l2",
    unitId: "es_unit_1",
    title: "AI Teacher: Introductions",
    description: "Join your AI teacher Maria to learn how to introduce yourself and state your name.",
    type: "video",
    order: 2,
    xpReward: 20,
    durationMinutes: 5,
    goals: ["Ask for someone's name", "State your own name in Spanish", "Exchange pleasantries"],
    aiPrompt: "You are Maria, a warm and friendly Spanish teacher. Teach the user how to introduce themselves. Explain the question '¿Cómo te llamas?' (What is your name?) and how to reply with 'Me llamo...' (My name is...). End with 'Mucho gusto' (Nice to meet you). Speak slowly, clearly, and keep it extremely interactive.",
    activities: [
      {
        id: "es_u1_l2_a1",
        lessonId: "es_u1_l2",
        type: "multiple-choice",
        question: "Which phrase means 'What is your name?'",
        options: ["¿Cómo estás?", "¿Cómo te llamas?", "Mucho gusto", "Me llamo Maria"],
        correctAnswer: "¿Cómo te llamas?",
      },
      {
        id: "es_u1_l2_a2",
        lessonId: "es_u1_l2",
        type: "translate",
        question: "Translate: 'Mucho gusto'",
        correctAnswer: "Nice to meet you",
        translationContext: "Exchange this pleasantry after meeting someone new.",
      },
    ],
  },
  {
    id: "es_u1_l3",
    unitId: "es_unit_1",
    title: "AI Chat: First Conversation",
    description: "Chat with Carlos, your AI language partner, to practice your greetings and introduction.",
    type: "chat",
    order: 3,
    xpReward: 15,
    durationMinutes: 4,
    goals: ["Introduce yourself in a conversation", "Respond to simple questions"],
    aiPrompt: "You are Carlos, a helpful local language partner in Madrid. Initiate a chat conversation by saying hello and asking the user's name ('Hola! ¿Cómo te llamas?'). Guide the user to respond in Spanish. Keep your sentences short and beginner-friendly, correcting mistakes gently.",
    activities: [
      {
        id: "es_u1_l3_a1",
        lessonId: "es_u1_l3",
        type: "speaking",
        question: "Pronounce: 'Hola Carlos, mucho gusto'",
        correctAnswer: "Hola Carlos, mucho gusto",
      },
    ],
  },

  // Unit 2
  {
    id: "es_u2_l1",
    unitId: "es_unit_2",
    title: "Ordering Food & Drinks",
    description: "Learn to ask for menus, water, and popular dishes in a Spanish café.",
    type: "vocabulary",
    order: 1,
    xpReward: 10,
    durationMinutes: 4,
    goals: ["Name food basics", "Ask for the menu and water", "Request the check"],
    activities: [
      {
        id: "es_u2_l1_a1",
        lessonId: "es_u2_l1",
        type: "multiple-choice",
        question: "How do you ask for 'the bill' in Spanish?",
        options: ["La cuenta", "La comida", "El agua", "El menú"],
        correctAnswer: "La cuenta",
      },
      {
        id: "es_u2_l1_a2",
        lessonId: "es_u2_l1",
        type: "translate",
        question: "Translate: 'Un agua, por favor'",
        correctAnswer: "A water, please",
        translationContext: "Ordering a basic drink.",
      },
    ],
  },
  {
    id: "es_u2_l2",
    unitId: "es_unit_2",
    title: "AI Chat: At the Café",
    description: "Practice ordering coffee and pastries with Sofia the AI barista.",
    type: "chat",
    order: 2,
    xpReward: 20,
    durationMinutes: 5,
    goals: ["Order a drink and snack politely", "Understand pricing questions"],
    aiPrompt: "You are Sofia, a friendly barista at a café in Buenos Aires. Greet the user ('Buenas tardes! ¿Qué desea tomar?') and guide them through ordering coffee or a snack. Respond realistically, ask if they want anything else, and present the bill ('la cuenta') when asked.",
    activities: [
      {
        id: "es_u2_l2_a1",
        lessonId: "es_u2_l2",
        type: "multiple-choice",
        question: "Which of the following means 'coffee with milk'?",
        options: ["Café solo", "Café con leche", "Té verde", "Jugo de naranja"],
        correctAnswer: "Café con leche",
      },
    ],
  },

  // ==========================================
  // FRENCH LESSONS
  // ==========================================
  
  // Unit 1
  {
    id: "fr_u1_l1",
    unitId: "fr_unit_1",
    title: "Polite Encounters",
    description: "Learn how to greet others politely in French in formal and informal settings.",
    type: "vocabulary",
    order: 1,
    xpReward: 10,
    durationMinutes: 3,
    goals: ["Greet people formally and informally", "Say thank you", "Apologize politely"],
    activities: [
      {
        id: "fr_u1_l1_a1",
        lessonId: "fr_u1_l1",
        type: "multiple-choice",
        question: "How do you say 'Hello' formally in French?",
        options: ["Salut", "Bonjour", "Merci", "Au revoir"],
        correctAnswer: "Bonjour",
      },
      {
        id: "fr_u1_l1_a2",
        lessonId: "fr_u1_l1",
        type: "translate",
        question: "Translate: 'Merci beaucoup'",
        correctAnswer: "Thank you very much",
        translationContext: "Expressing strong gratitude.",
      },
    ],
  },
  {
    id: "fr_u1_l2",
    unitId: "fr_unit_1",
    title: "AI Teacher: Introduce Yourself",
    description: "Learn names, greetings, and introductions with your AI teacher Pierre.",
    type: "video",
    order: 2,
    xpReward: 20,
    durationMinutes: 5,
    goals: ["Ask name in French", "Say 'My name is...'", "Express pleasure in meeting"],
    aiPrompt: "You are Pierre, a charming French language instructor in Paris. Teach the user how to introduce themselves. Cover the expressions 'Comment vous appelez-vous?' (formal name question) and 'Je m'appelle...' (My name is...). Introduce the closing expression 'Enchanté' (Delighted to meet you). Maintain an elegant and engaging tone.",
    activities: [
      {
        id: "fr_u1_l2_a1",
        lessonId: "fr_u1_l2",
        type: "multiple-choice",
        question: "Which word means 'Delighted / Nice to meet you'?",
        options: ["Bonjour", "Merci", "Enchanté", "S'il vous plaît"],
        correctAnswer: "Enchanté",
      },
    ],
  },

  // ==========================================
  // JAPANESE LESSONS
  // ==========================================
  
  // Unit 1
  {
    id: "ja_u1_l1",
    unitId: "ja_unit_1",
    title: "First Contact Japanese",
    description: "Discover greetings and responses that form the basis of Japanese politeness.",
    type: "vocabulary",
    order: 1,
    xpReward: 10,
    durationMinutes: 3,
    goals: ["Say Hello, Goodbye, and Thank You", "Introduce yourself with Hajimemashite"],
    activities: [
      {
        id: "ja_u1_l1_a1",
        lessonId: "ja_u1_l1",
        type: "multiple-choice",
        question: "How do you say 'Thank you' in Japanese?",
        options: ["こんにちは (Konnichiwa)", "ありがとう (Arigatou)", "さようなら (Sayounara)", "すみません (Sumimasen)"],
        correctAnswer: "ありがとう (Arigatou)",
      },
      {
        id: "ja_u1_l1_a2",
        lessonId: "ja_u1_l1",
        type: "translate",
        question: "Translate: 'はじめまして (Hajimemashite)'",
        correctAnswer: "Nice to meet you / How do you do",
        translationContext: "Used strictly when meeting someone for the first time.",
      },
    ],
  },
  {
    id: "ja_u1_l2",
    unitId: "ja_unit_1",
    title: "AI Chat: Self-Introduction",
    description: "Introduce yourself to Kenji, your AI guide in Tokyo.",
    type: "chat",
    order: 2,
    xpReward: 15,
    durationMinutes: 4,
    goals: ["Exchange names", "End a self-introduction with Yoroshiku"],
    aiPrompt: "You are Kenji, a polite Japanese student in Tokyo. Greet the user warmly and introduce yourself ('Hajimemashite, Kenji desu. Yoroshiku onegai shimasu. O-namae wa?'). Encourage the user to state their name using '[Name] desu' and close with 'Yoroshiku'. Use simple romaji or hiragana as preferred by the user.",
    activities: [
      {
        id: "ja_u1_l2_a1",
        lessonId: "ja_u1_l2",
        type: "multiple-choice",
        question: "Which phrase is used at the end of a self-introduction to express goodwill?",
        options: ["ありがとう (Arigatou)", "よろしくおねがいします (Yoroshiku onegai shimasu)", "こんにちは (Konnichiwa)", "すみません (Sumimasen)"],
        correctAnswer: "よろしくおねがいします (Yoroshiku onegai shimasu)",
      },
    ],
  },
];

// ==========================================
// STATIC VOCABULARY DATA
// ==========================================
export const vocabulary: VocabularyItem[] = [
  // Spanish Vocab
  {
    id: "es_v1",
    languageId: "es",
    word: "Hola",
    translation: "Hello",
    pronunciation: "OH-lah",
    exampleSentence: "Hola, ¿cómo estás?",
    exampleTranslation: "Hello, how are you?",
  },
  {
    id: "es_v2",
    languageId: "es",
    word: "Gracias",
    translation: "Thank you",
    pronunciation: "GRAH-syahs",
    exampleSentence: "Muchas gracias por la comida.",
    exampleTranslation: "Thank you very much for the food.",
  },
  {
    id: "es_v3",
    languageId: "es",
    word: "Por favor",
    translation: "Please",
    pronunciation: "por fah-VOR",
    exampleSentence: "Un café, por favor.",
    exampleTranslation: "A coffee, please.",
  },
  {
    id: "es_v4",
    languageId: "es",
    word: "Agua",
    translation: "Water",
    pronunciation: "AH-gwah",
    exampleSentence: "Quiero un vaso de agua.",
    exampleTranslation: "I want a glass of water.",
  },

  // French Vocab
  {
    id: "fr_v1",
    languageId: "fr",
    word: "Bonjour",
    translation: "Hello / Good morning",
    pronunciation: "bohn-zhoor",
    exampleSentence: "Bonjour, comment ça va ?",
    exampleTranslation: "Hello, how is it going?",
  },
  {
    id: "fr_v2",
    languageId: "fr",
    word: "Merci",
    translation: "Thank you",
    pronunciation: "mair-see",
    exampleSentence: "Merci pour votre aide.",
    exampleTranslation: "Thank you for your help.",
  },
  {
    id: "fr_v3",
    languageId: "fr",
    word: "S'il vous plaît",
    translation: "Please (formal/polite)",
    pronunciation: "seel voo pleh",
    exampleSentence: "Un croissant, s'il vous plaît.",
    exampleTranslation: "A croissant, please.",
  },

  // Japanese Vocab
  {
    id: "ja_v1",
    languageId: "ja",
    word: "こんにちは (Konnichiwa)",
    translation: "Hello / Good afternoon",
    pronunciation: "kon-nee-chee-wah",
    exampleSentence: "皆さん, こんにちは (Minasan, konnichiwa).",
    exampleTranslation: "Hello everyone.",
  },
  {
    id: "ja_v2",
    languageId: "ja",
    word: "ありがとう (Arigatou)",
    translation: "Thank you",
    pronunciation: "ah-ree-gah-toh",
    exampleSentence: "手伝ってくれてありがとう (Tetsudatte kurete arigatou).",
    exampleTranslation: "Thank you for helping me.",
  },
  {
    id: "ja_v3",
    languageId: "ja",
    word: "すみません (Sumimasen)",
    translation: "Excuse me / Sorry",
    pronunciation: "soo-mee-mah-sen",
    exampleSentence: "すみません, 駅はどこですか (Sumimasen, eki wa doko desu ka)?",
    exampleTranslation: "Excuse me, where is the station?",
  },
];

// ==========================================
// STATIC PHRASES DATA
// ==========================================
export const phrases: PhraseItem[] = [
  // Spanish Phrases
  {
    id: "es_p1",
    languageId: "es",
    phrase: "¿Cómo estás?",
    translation: "How are you?",
    pronunciation: "CO-mo es-TAS",
    situation: "General greetings",
  },
  {
    id: "es_p2",
    languageId: "es",
    phrase: "Me llamo...",
    translation: "My name is...",
    pronunciation: "mey YAH-mo",
    situation: "Introducing yourself",
  },
  {
    id: "es_p3",
    languageId: "es",
    phrase: "¿Cuánto cuesta esto?",
    translation: "How much does this cost?",
    pronunciation: "CWAN-to CWES-ta ES-to",
    situation: "Shopping & Payments",
  },

  // French Phrases
  {
    id: "fr_p1",
    languageId: "fr",
    phrase: "Comment ça va ?",
    translation: "How's it going?",
    pronunciation: "ko-mahn sah vah",
    situation: "Casual greeting",
  },
  {
    id: "fr_p2",
    languageId: "fr",
    phrase: "Je m'appelle...",
    translation: "My name is...",
    pronunciation: "zhuh mah-pel",
    situation: "Introducing yourself",
  },
  {
    id: "fr_p3",
    languageId: "fr",
    phrase: "Où sont les toilettes ?",
    translation: "Where are the restrooms?",
    pronunciation: "oo sohn ley twah-let",
    situation: "Travel emergencies",
  },

  // Japanese Phrases
  {
    id: "ja_p1",
    languageId: "ja",
    phrase: "お元気ですか (O-genki desu ka)?",
    translation: "Are you well? / How are you?",
    pronunciation: "oh-gen-kee dess kah",
    situation: "Greeting an acquaintance",
  },
  {
    id: "ja_p2",
    languageId: "ja",
    phrase: "はじめまして (Hajimemashite).",
    translation: "Nice to meet you / How do you do.",
    pronunciation: "hah-jee-meh-mash-teh",
    situation: "First introductions",
  },
  {
    id: "ja_p3",
    languageId: "ja",
    phrase: "これをください (Kore wo kudasai).",
    translation: "Please give me this / I'll take this.",
    pronunciation: "koh-reh woh koo-dah-sigh",
    situation: "Ordering food or shopping",
  },
];
