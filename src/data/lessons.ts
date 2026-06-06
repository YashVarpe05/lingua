import { Lesson, VocabularyItem, PhraseItem, WordBankOption } from "../types/learning";

const esGreetingWordBank: WordBankOption[] = [
  { value: "Por", label: "Por", pronunciation: "por", translation: "for / part of 'please'" },
  { value: "nada", label: "nada", pronunciation: "NAH-dah", translation: "nothing / welcome phrase" },
  { value: "Hola", label: "Hola", pronunciation: "OH-lah", translation: "Hello" },
  { value: "Adiós", label: "Adiós", pronunciation: "ah-DYOHS", translation: "Goodbye" },
  { value: "Gracias", label: "Gracias", pronunciation: "GRAH-syahs", translation: "Thank you" },
  { value: "favor", label: "favor", pronunciation: "fah-VOR", translation: "favor" },
];

const esIntroWordBank: WordBankOption[] = [
  { value: "Me", label: "Me", pronunciation: "meh", translation: "me / myself" },
  { value: "soy", label: "soy", pronunciation: "soy", translation: "I am" },
  { value: "llamo", label: "llamo", pronunciation: "YAH-moh", translation: "I call" },
  { value: "Mucho gusto", label: "Mucho gusto", pronunciation: "MOO-choh GOOS-toh", translation: "Nice to meet you" },
  { value: "estás", label: "estás", pronunciation: "es-TAHS", translation: "you are" },
  { value: "Hola", label: "Hola", pronunciation: "OH-lah", translation: "Hello" },
];

const esConversationWordBank: WordBankOption[] = [
  { value: "estás", label: "estás", pronunciation: "es-TAHS", translation: "you are" },
  { value: "luego", label: "luego", pronunciation: "LWEH-goh", translation: "later" },
  { value: "Bien", label: "Bien", pronunciation: "byen", translation: "Good / well" },
  { value: "gracias", label: "gracias", pronunciation: "GRAH-syahs", translation: "thank you" },
  { value: "Hola", label: "Hola", pronunciation: "OH-lah", translation: "Hello" },
  { value: "Adiós", label: "Adiós", pronunciation: "ah-DYOHS", translation: "Goodbye" },
];

const esCafeWordBank: WordBankOption[] = [
  { value: "café", label: "café", pronunciation: "kah-FEH", translation: "coffee" },
  { value: "leche", label: "leche", pronunciation: "LEH-cheh", translation: "milk" },
  { value: "agua", label: "agua", pronunciation: "AH-gwah", translation: "water" },
  { value: "menú", label: "menú", pronunciation: "meh-NOO", translation: "menu" },
  { value: "cuenta", label: "cuenta", pronunciation: "KWEN-tah", translation: "bill" },
  { value: "favor", label: "favor", pronunciation: "fah-VOR", translation: "favor / please phrase" },
];

const esCafeChatWordBank: WordBankOption[] = [
  { value: "croissant", label: "croissant", pronunciation: "kwah-SAHN", translation: "croissant" },
  { value: "verde", label: "verde", pronunciation: "BEHR-deh", translation: "green" },
  { value: "café", label: "café", pronunciation: "kah-FEH", translation: "coffee" },
  { value: "leche", label: "leche", pronunciation: "LEH-cheh", translation: "milk" },
  { value: "té", label: "té", pronunciation: "teh", translation: "tea" },
  { value: "Barista", label: "Barista", pronunciation: "bah-REES-tah", translation: "barista" },
];

const esDiningWordBank: WordBankOption[] = [
  { value: "menú", label: "menú", pronunciation: "meh-NOO", translation: "menu" },
  { value: "mesa", label: "mesa", pronunciation: "MEH-sah", translation: "table" },
  { value: "cuenta", label: "cuenta", pronunciation: "KWEN-tah", translation: "bill" },
  { value: "comida", label: "comida", pronunciation: "koh-MEE-dah", translation: "food" },
  { value: "agua", label: "agua", pronunciation: "AH-gwah", translation: "water" },
  { value: "favor", label: "favor", pronunciation: "fah-VOR", translation: "favor / please phrase" },
];

const esRestaurantWordBank: WordBankOption[] = [
  { value: "comida", label: "comida", pronunciation: "koh-MEE-dah", translation: "food" },
  { value: "favor", label: "favor", pronunciation: "fah-VOR", translation: "favor / please phrase" },
  { value: "cuenta", label: "cuenta", pronunciation: "KWEN-tah", translation: "bill" },
  { value: "menú", label: "menú", pronunciation: "meh-NOO", translation: "menu" },
  { value: "agua", label: "agua", pronunciation: "AH-gwah", translation: "water" },
  { value: "ordenar", label: "ordenar", pronunciation: "or-deh-NAR", translation: "to order" },
];

const frPoliteWordBank: WordBankOption[] = [
  { value: "beaucoup", label: "beaucoup", pronunciation: "boh-KOO", translation: "very much" },
  { value: "rien", label: "rien", pronunciation: "ryehn", translation: "nothing / welcome phrase" },
  { value: "Bonjour", label: "Bonjour", pronunciation: "bohn-ZHOOR", translation: "Hello" },
  { value: "Merci", label: "Merci", pronunciation: "mair-SEE", translation: "Thank you" },
  { value: "Au revoir", label: "Au revoir", pronunciation: "oh ruh-VWAHR", translation: "Goodbye" },
  { value: "Excusez-moi", label: "Excusez-moi", pronunciation: "ex-koo-zay MWAH", translation: "Excuse me" },
];

const frIntroWordBank: WordBankOption[] = [
  { value: "m'", label: "m'", pronunciation: "m", translation: "me before a vowel" },
  { value: "appelle", label: "appelle", pronunciation: "ah-PELL", translation: "called" },
  { value: "Je", label: "Je", pronunciation: "zhuh", translation: "I" },
  { value: "Enchanté", label: "Enchanté", pronunciation: "ahn-shahn-TAY", translation: "Nice to meet you" },
  { value: "Bonjour", label: "Bonjour", pronunciation: "bohn-ZHOOR", translation: "Hello" },
  { value: "Oui", label: "Oui", pronunciation: "wee", translation: "Yes" },
  { value: "Non", label: "Non", pronunciation: "nohn", translation: "No" },
];

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
    exercises: [
      {
        id: "es_u1_l1_e1",
        type: "mcq",
        question: "Select the correct translation for 'Hello'",
        options: ["Adiós", "Gracias", "Hola", "Por favor"],
        correctAnswer: "Hola"
      },
      {
        id: "es_u1_l1_e2",
        type: "fill-in-the-blank",
        question: "Translate 'Please' into Spanish",
        sentence: "___ favor",
        correctAnswer: "Por",
        wordBank: esGreetingWordBank
      },
      {
        id: "es_u1_l1_e3",
        type: "matching-pairs",
        question: "Match the greetings with their meanings",
        pairs: [
          { id: "p1", left: "Hola", right: "Hello" },
          { id: "p2", left: "Adiós", right: "Goodbye" },
          { id: "p3", left: "Gracias", right: "Thank you" },
          { id: "p4", left: "Por favor", right: "Please" }
        ],
        correctAnswer: ""
      },
      {
        id: "es_u1_l1_e4",
        type: "tap-word",
        question: "Select the correct word for 'Goodbye'",
        options: ["Hola", "Gracias", "Adiós", "De nada"],
        correctAnswer: "Adiós"
      },
      {
        id: "es_u1_l1_e5",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Hola",
        audioText: "Hola"
      },
      {
        id: "es_u1_l1_e6",
        type: "mcq",
        question: "Select the correct translation for 'Thank you'",
        options: ["De nada", "Por favor", "Hola", "Gracias"],
        correctAnswer: "Gracias"
      },
      {
        id: "es_u1_l1_e7",
        type: "fill-in-the-blank",
        question: "Translate 'You're welcome' into Spanish",
        sentence: "De ___",
        correctAnswer: "nada",
        wordBank: esGreetingWordBank
      },
      {
        id: "es_u1_l1_e8",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Gracias",
        audioText: "Gracias"
      }
    ]
  },
  {
    id: "es_u1_l2",
    unitId: "es_unit_1",
    title: "AI Teacher: Introductions",
    description: "Join your AI teacher María to learn how to introduce yourself and state your name.",
    type: "video",
    order: 2,
    xpReward: 20,
    durationMinutes: 5,
    goals: ["Ask for someone's name", "State your own name in Spanish", "Exchange pleasantries"],
    aiPrompt: "You are María, a warm, energetic, and highly encouraging Spanish teacher. Your goal is strictly to teach the user how to introduce themselves using the question '¿Cómo te llamas?' (What is your name?) and reply with 'Me llamo...' (My name is...). Introduce 'Mucho gusto' (Nice to meet you) at the end. Stay strictly within this focus and do not teach other words or topics. Speak mostly in English, and introduce Spanish words slowly with translations. Keep your sentences short, natural, and friendly (use contractions like 'let's', 'I'm'). Actively listen to the student's responses: if they make a mistake, gently encourage them to try again. Keep your replies to one or two conversational sentences. Ask the student to repeat or try introducing themselves.",
    activities: [
      {
        id: "es_u1_l2_a1",
        lessonId: "es_u1_l2",
        type: "multiple-choice",
        question: "Which phrase means 'What is your name?'",
        options: ["¿Cómo estás?", "¿Cómo te llamas?", "Mucho gusto", "Me llamo María"],
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
    exercises: [
      {
        id: "es_u1_l2_e1",
        type: "mcq",
        question: "Which phrase means 'What is your name?'",
        options: ["¿Cómo estás?", "¿Cómo te llamas?", "Mucho gusto", "Me llamo"],
        correctAnswer: "¿Cómo te llamas?"
      },
      {
        id: "es_u1_l2_e2",
        type: "fill-in-the-blank",
        question: "Fill in the blank to say 'My name is...'",
        sentence: "___ llamo...",
        correctAnswer: "Me",
        wordBank: esIntroWordBank
      },
      {
        id: "es_u1_l2_e3",
        type: "matching-pairs",
        question: "Match the introduction terms",
        pairs: [
          { id: "p1", left: "¿Cómo te llamas?", right: "What is your name?" },
          { id: "p2", left: "Me llamo", right: "My name is" },
          { id: "p3", left: "Mucho gusto", right: "Nice to meet you" },
          { id: "p4", left: "Yo soy", right: "I am" }
        ],
        correctAnswer: ""
      },
      {
        id: "es_u1_l2_e4",
        type: "tap-word",
        question: "Select the word for 'Nice to meet you'",
        options: ["Mucho gusto", "Me llamo", "Hola", "¿Cómo te llamas?"],
        correctAnswer: "Mucho gusto"
      },
      {
        id: "es_u1_l2_e5",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Mucho gusto",
        audioText: "Mucho gusto"
      },
      {
        id: "es_u1_l2_e6",
        type: "mcq",
        question: "Select the correct translation for 'How are you?'",
        options: ["Me llamo", "¿Cómo te llamas?", "¿Cómo estás?", "Mucho gusto"],
        correctAnswer: "¿Cómo estás?"
      },
      {
        id: "es_u1_l2_e7",
        type: "fill-in-the-blank",
        question: "Fill in the blank to say 'I am María'",
        sentence: "Yo ___ María",
        correctAnswer: "soy",
        wordBank: esIntroWordBank
      },
      {
        id: "es_u1_l2_e8",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Me llamo",
        audioText: "Me llamo"
      }
    ]
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
    exercises: [
      {
        id: "es_u1_l3_e1",
        type: "mcq",
        question: "Translate 'Nice to meet you, Carlos'",
        options: ["Hola Carlos", "Adiós Carlos", "Mucho gusto, Carlos", "Me llamo Carlos"],
        correctAnswer: "Mucho gusto, Carlos"
      },
      {
        id: "es_u1_l3_e2",
        type: "fill-in-the-blank",
        question: "Fill in the blank for 'Hello, how are you?'",
        sentence: "Hola, ¿cómo ___?",
        correctAnswer: "estás",
        acceptedAnswers: ["estas"],
        wordBank: esConversationWordBank
      },
      {
        id: "es_u1_l3_e3",
        type: "matching-pairs",
        question: "Match the conversation elements",
        pairs: [
          { id: "p1", left: "Hola", right: "Hello" },
          { id: "p2", left: "¿Cómo estás?", right: "How are you?" },
          { id: "p3", left: "Bien, gracias", right: "Good, thank you" },
          { id: "p4", left: "Adiós", right: "Goodbye" }
        ],
        correctAnswer: ""
      },
      {
        id: "es_u1_l3_e4",
        type: "tap-word",
        question: "Select the correct word for 'Good'",
        options: ["Mal", "Bien", "Gracias", "Hola"],
        correctAnswer: "Bien"
      },
      {
        id: "es_u1_l3_e5",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Hola, ¿cómo estás?",
        audioText: "Hola, ¿cómo estás?"
      },
      {
        id: "es_u1_l3_e6",
        type: "mcq",
        question: "Translate 'Goodbye, see you later'",
        options: ["Hola, adiós", "Adiós, hasta luego", "Gracias, de nada", "Mucho gusto"],
        correctAnswer: "Adiós, hasta luego"
      },
      {
        id: "es_u1_l3_e7",
        type: "fill-in-the-blank",
        question: "Fill in the blank to say 'See you later'",
        sentence: "Hasta ___",
        correctAnswer: "luego",
        wordBank: esConversationWordBank
      },
      {
        id: "es_u1_l3_e8",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Bien, gracias",
        audioText: "Bien, gracias"
      }
    ]
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
    exercises: [
      {
        id: "es_u2_l1_e1",
        type: "mcq",
        question: "Translate 'The bill, please'",
        options: ["El menú, por favor", "La comida, por favor", "La cuenta, por favor", "Un agua, por favor"],
        correctAnswer: "La cuenta, por favor"
      },
      {
        id: "es_u2_l1_e2",
        type: "fill-in-the-blank",
        question: "Fill in the blank for 'A coffee, please'",
        sentence: "Un ___, por favor",
        correctAnswer: "café",
        acceptedAnswers: ["cafe"],
        wordBank: esCafeWordBank
      },
      {
        id: "es_u2_l1_e3",
        type: "matching-pairs",
        question: "Match the food & drink items",
        pairs: [
          { id: "p1", left: "La cuenta", right: "The bill" },
          { id: "p2", left: "El café", right: "Coffee" },
          { id: "p3", left: "El agua", right: "Water" },
          { id: "p4", left: "El menú", right: "Menu" }
        ],
        correctAnswer: ""
      },
      {
        id: "es_u2_l1_e4",
        type: "tap-word",
        question: "Select the correct word for 'Water'",
        options: ["Agua", "Leche", "Café", "Té"],
        correctAnswer: "Agua"
      },
      {
        id: "es_u2_l1_e5",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Un café, por favor",
        audioText: "Un café, por favor"
      },
      {
        id: "es_u2_l1_e6",
        type: "mcq",
        question: "Translate 'The menu, please'",
        options: ["La cuenta, por favor", "Un agua, por favor", "El menú, por favor", "El café, por favor"],
        correctAnswer: "El menú, por favor"
      },
      {
        id: "es_u2_l1_e7",
        type: "fill-in-the-blank",
        question: "Fill in the blank for 'With milk'",
        sentence: "Con ___",
        correctAnswer: "leche",
        wordBank: esCafeWordBank
      },
      {
        id: "es_u2_l1_e8",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "La cuenta, por favor",
        audioText: "La cuenta, por favor"
      }
    ]
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
    exercises: [
      {
        id: "es_u2_l2_e1",
        type: "mcq",
        question: "Select the correct word for 'Barista'",
        options: ["Barista", "Camarero", "Cliente", "Cocinero"],
        correctAnswer: "Barista"
      },
      {
        id: "es_u2_l2_e2",
        type: "fill-in-the-blank",
        question: "Fill in the blank to say 'I want a croissant'",
        sentence: "Quiero un ___",
        correctAnswer: "croissant",
        wordBank: esCafeChatWordBank
      },
      {
        id: "es_u2_l2_e3",
        type: "matching-pairs",
        question: "Match the café terms",
        pairs: [
          { id: "p1", left: "Barista", right: "Barista" },
          { id: "p2", left: "La cuenta", right: "The bill" },
          { id: "p3", left: "Café con leche", right: "Coffee with milk" },
          { id: "p4", left: "Croissant", right: "Croissant" }
        ],
        correctAnswer: ""
      },
      {
        id: "es_u2_l2_e4",
        type: "tap-word",
        question: "Select the correct word for 'Milk'",
        options: ["Leche", "Agua", "Café", "Té"],
        correctAnswer: "Leche"
      },
      {
        id: "es_u2_l2_e5",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Café con leche",
        audioText: "Café con leche"
      },
      {
        id: "es_u2_l2_e6",
        type: "mcq",
        question: "Translate 'Good afternoon'",
        options: ["Buenos días", "Buenas tardes", "Buenas noches", "Hola"],
        correctAnswer: "Buenas tardes"
      },
      {
        id: "es_u2_l2_e7",
        type: "fill-in-the-blank",
        question: "Fill in the blank for 'Green tea'",
        sentence: "Té ___",
        correctAnswer: "verde",
        wordBank: esCafeChatWordBank
      },
      {
        id: "es_u2_l2_e8",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Buenas tardes",
        audioText: "Buenas tardes"
      }
    ]
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
    exercises: [
      {
        id: "fr_u1_l1_e1",
        type: "mcq",
        question: "How do you say 'Hello' formally in French?",
        options: ["Salut", "Bonjour", "Merci", "Au revoir"],
        correctAnswer: "Bonjour"
      },
      {
        id: "fr_u1_l1_e2",
        type: "fill-in-the-blank",
        question: "Translate 'Thank you very much' into French",
        sentence: "Merci ___",
        correctAnswer: "beaucoup",
        wordBank: frPoliteWordBank
      },
      {
        id: "fr_u1_l1_e3",
        type: "matching-pairs",
        question: "Match the French greetings",
        pairs: [
          { id: "p1", left: "Bonjour", right: "Hello" },
          { id: "p2", left: "Salut", right: "Hi" },
          { id: "p3", left: "Merci", right: "Thank you" },
          { id: "p4", left: "Au revoir", right: "Goodbye" }
        ],
        correctAnswer: ""
      },
      {
        id: "fr_u1_l1_e4",
        type: "tap-word",
        question: "Select the correct word for 'Goodbye'",
        options: ["Bonjour", "Salut", "Au revoir", "Merci"],
        correctAnswer: "Au revoir"
      },
      {
        id: "fr_u1_l1_e5",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Bonjour",
        audioText: "Bonjour"
      },
      {
        id: "fr_u1_l1_e6",
        type: "mcq",
        question: "Translate 'Excuse me'",
        options: ["Excusez-moi", "S'il vous plaît", "Merci", "De rien"],
        correctAnswer: "Excusez-moi"
      },
      {
        id: "fr_u1_l1_e7",
        type: "fill-in-the-blank",
        question: "Translate 'You're welcome' into French",
        sentence: "De ___",
        correctAnswer: "rien",
        wordBank: frPoliteWordBank
      },
      {
        id: "fr_u1_l1_e8",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Merci beaucoup",
        audioText: "Merci beaucoup"
      }
    ]
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
    aiPrompt: "You are Pierre, a warm, energetic, and highly encouraging French teacher. Your goal is strictly to teach the user how to introduce themselves using the question 'Comment vous appelez-vous?' (What is your name?) and reply with 'Je m'appelle...' (My name is...). Introduce 'Enchanté' (Nice to meet you / Delighted) at the end. Stay strictly within this focus and do not teach other words or topics. Speak mostly in English, and introduce French words slowly with translations. Keep your sentences short, natural, and friendly (use contractions like 'let's', 'I'm'). Actively listen to the student's responses: if they make a mistake, gently encourage them to try again. Keep your replies to one or two conversational sentences. Ask the student to repeat or try introducing themselves.",
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
    exercises: [
      {
        id: "fr_u1_l2_e1",
        type: "mcq",
        question: "Which word means 'Delighted / Nice to meet you'?",
        options: ["Bonjour", "Merci", "Enchanté", "S'il vous plaît"],
        correctAnswer: "Enchanté"
      },
      {
        id: "fr_u1_l2_e2",
        type: "fill-in-the-blank",
        question: "Fill in the blank for 'My name is Pierre'",
        sentence: "Je ___ appelle Pierre",
        correctAnswer: "m'",
        wordBank: frIntroWordBank
      },
      {
        id: "fr_u1_l2_e3",
        type: "matching-pairs",
        question: "Match the introduction terms",
        pairs: [
          { id: "p1", left: "Enchanté", right: "Nice to meet you" },
          { id: "p2", left: "Je m'appelle", right: "My name is" },
          { id: "p3", left: "Oui", right: "Yes" },
          { id: "p4", left: "Non", right: "No" }
        ],
        correctAnswer: ""
      },
      {
        id: "fr_u1_l2_e4",
        type: "tap-word",
        question: "Select the word for 'Delighted / Nice to meet you'",
        options: ["Enchanté", "Bonjour", "Merci", "S'il vous plaît"],
        correctAnswer: "Enchanté"
      },
      {
        id: "fr_u1_l2_e5",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Enchanté",
        audioText: "Enchanté"
      },
      {
        id: "fr_u1_l2_e6",
        type: "mcq",
        question: "Translate 'What is your name?'",
        options: ["Comment ça va ?", "Comment vous appelez-vous ?", "Où sont les toilettes ?", "Je m'appelle Pierre"],
        correctAnswer: "Comment vous appelez-vous ?"
      },
      {
        id: "fr_u1_l2_e7",
        type: "fill-in-the-blank",
        question: "Fill in the blank to say 'My name is...'",
        sentence: "Je m'___...",
        correctAnswer: "appelle",
        wordBank: frIntroWordBank
      },
      {
        id: "fr_u1_l2_e8",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "Je m'appelle Pierre",
        audioText: "Je m'appelle Pierre"
      }
    ]
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
    exercises: [
      {
        id: "ja_u1_l1_e1",
        type: "mcq",
        question: "How do you say 'Thank you' in Japanese?",
        options: ["こんにちは (Konnichiwa)", "ありがとう (Arigatou)", "さようなら (Sayounara)", "すみません (Sumimasen)"],
        correctAnswer: "ありがとう (Arigatou)"
      },
      {
        id: "ja_u1_l1_e2",
        type: "fill-in-the-blank",
        question: "Translate 'Excuse me' into Japanese",
        sentence: "___",
        correctAnswer: "\u3059\u307F\u307E\u305B\u3093",
        acceptedAnswers: ["sumimasen", "Sumimasen"],
        wordBank: [
          { value: "\u3059\u307F\u307E\u305B\u3093", label: "\u3059\u307F\u307E\u305B\u3093", pronunciation: "sumimasen", translation: "Excuse me" },
          { value: "\u3042\u308A\u304C\u3068\u3046", label: "\u3042\u308A\u304C\u3068\u3046", pronunciation: "arigatou", translation: "Thank you" },
          { value: "\u3053\u3093\u306B\u3061\u306F", label: "\u3053\u3093\u306B\u3061\u306F", pronunciation: "konnichiwa", translation: "Hello" },
          { value: "\u3055\u3088\u3046\u306A\u3089", label: "\u3055\u3088\u3046\u306A\u3089", pronunciation: "sayounara", translation: "Goodbye" },
          { value: "\u306F\u3058\u3081\u307E\u3057\u3066", label: "\u306F\u3058\u3081\u307E\u3057\u3066", pronunciation: "hajimemashite", translation: "Nice to meet you" }
        ]
      },
      {
        id: "ja_u1_l1_e3",
        type: "matching-pairs",
        question: "Match the Japanese greetings",
        pairs: [
          { id: "p1", left: "こんにちは", right: "Hello" },
          { id: "p2", left: "ありがとう", right: "Thank you" },
          { id: "p3", left: "さようなら", right: "Goodbye" },
          { id: "p4", left: "すみません", right: "Excuse me" }
        ],
        correctAnswer: ""
      },
      {
        id: "ja_u1_l1_e4",
        type: "tap-word",
        question: "Select the word for 'Hello'",
        options: ["こんにちは (Konnichiwa)", "ありがとう (Arigatou)", "さようなら (Sayounara)", "すみません (Sumimasen)"],
        correctAnswer: "こんにちは (Konnichiwa)"
      },
      {
        id: "ja_u1_l1_e5",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "こんにちは",
        audioText: "こんにちは"
      },
      {
        id: "ja_u1_l1_e6",
        type: "mcq",
        question: "Translate 'Goodbye'",
        options: ["こんにちは (Konnichiwa)", "ありがとう (Arigatou)", "さようなら (Sayounara)", "すみません (Sumimasen)"],
        correctAnswer: "さようなら (Sayounara)"
      },
      {
        id: "ja_u1_l1_e7",
        type: "fill-in-the-blank",
        question: "Translate 'Hello' into Japanese",
        sentence: "___",
        correctAnswer: "\u3053\u3093\u306B\u3061\u306F",
        acceptedAnswers: ["konnichiwa", "Konnichiwa"],
        wordBank: [
          { value: "\u3053\u3093\u306B\u3061\u306F", label: "\u3053\u3093\u306B\u3061\u306F", pronunciation: "konnichiwa", translation: "Hello" },
          { value: "\u3059\u307F\u307E\u305B\u3093", label: "\u3059\u307F\u307E\u305B\u3093", pronunciation: "sumimasen", translation: "Excuse me" },
          { value: "\u3042\u308A\u304C\u3068\u3046", label: "\u3042\u308A\u304C\u3068\u3046", pronunciation: "arigatou", translation: "Thank you" },
          { value: "\u3055\u3088\u3046\u306A\u3089", label: "\u3055\u3088\u3046\u306A\u3089", pronunciation: "sayounara", translation: "Goodbye" },
          { value: "\u306F\u3058\u3081\u307E\u3057\u3066", label: "\u306F\u3058\u3081\u307E\u3057\u3066", pronunciation: "hajimemashite", translation: "Nice to meet you" }
        ]
      },
      {
        id: "ja_u1_l1_e8",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "ありがとう",
        audioText: "ありがとう"
      }
    ]
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
    exercises: [
      {
        id: "ja_u1_l2_e1",
        type: "mcq",
        question: "Translate 'Nice to meet you'",
        options: ["こんにちは (Konnichiwa)", "はじめまして (Hajimemashite)", "よろしくおねがいします (Yoroshiku onegai shimasu)", "すみません (Sumimasen)"],
        correctAnswer: "はじめまして (Hajimemashite)"
      },
      {
        id: "ja_u1_l2_e2",
        type: "fill-in-the-blank",
        question: "Translate 'I am Kenji' into Japanese",
        sentence: "\u30B1\u30F3\u30B8 ___",
        correctAnswer: "\u3067\u3059",
        acceptedAnswers: ["desu", "Desu"],
        wordBank: [
          { value: "\u3067\u3059", label: "\u3067\u3059", pronunciation: "desu", translation: "I am / is" },
          { value: "\u306F\u3058\u3081\u307E\u3057\u3066", label: "\u306F\u3058\u3081\u307E\u3057\u3066", pronunciation: "hajimemashite", translation: "Nice to meet you" },
          { value: "\u3088\u308D\u3057\u304F\u304A\u306D\u304C\u3044\u3057\u307E\u3059", label: "\u3088\u308D\u3057\u304F\u304A\u306D\u304C\u3044\u3057\u307E\u3059", pronunciation: "yoroshiku onegai shimasu", translation: "Goodwill close" },
          { value: "\u304A\u540D\u524D\u306F", label: "\u304A\u540D\u524D\u306F", pronunciation: "o-namae wa", translation: "Your name?" },
          { value: "\u3059\u307F\u307E\u305B\u3093", label: "\u3059\u307F\u307E\u305B\u3093", pronunciation: "sumimasen", translation: "Excuse me" }
        ]
      },
      {
        id: "ja_u1_l2_e3",
        type: "matching-pairs",
        question: "Match the Japanese introduction terms",
        pairs: [
          { id: "p1", left: "はじめまして", right: "Nice to meet you" },
          { id: "p2", left: "です", right: "I am" },
          { id: "p3", left: "よろしくおねがいします", right: "Goodwill close" },
          { id: "p4", left: "お名前", right: "Name" }
        ],
        correctAnswer: ""
      },
      {
        id: "ja_u1_l2_e4",
        type: "tap-word",
        question: "Select the word for 'Goodwill close'",
        options: ["よろしくおねがいします (Yoroshiku onegai shimasu)", "はじめまして (Hajimemashite)", "こんにちは (Konnichiwa)", "ありがとう (Arigatou)"],
        correctAnswer: "よろしくおねがいします (Yoroshiku onegai shimasu)"
      },
      {
        id: "ja_u1_l2_e5",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "はじめまして",
        audioText: "はじめまして"
      },
      {
        id: "ja_u1_l2_e6",
        type: "mcq",
        question: "Translate 'What is your name?'",
        options: ["お元気ですか (O-genki desu ka)?", "お名前は (O-namae wa)?", "はじめまして (Hajimemashite)", "これをください (Kore wo kudasai)"],
        correctAnswer: "お名前は (O-namae wa)?"
      },
      {
        id: "ja_u1_l2_e7",
        type: "fill-in-the-blank",
        question: "Translate 'Nice to meet you' into Japanese",
        sentence: "___",
        correctAnswer: "\u306F\u3058\u3081\u307E\u3057\u3066",
        acceptedAnswers: ["hajimemashite", "Hajimemashite"],
        wordBank: [
          { value: "\u306F\u3058\u3081\u307E\u3057\u3066", label: "\u306F\u3058\u3081\u307E\u3057\u3066", pronunciation: "hajimemashite", translation: "Nice to meet you" },
          { value: "\u3088\u308D\u3057\u304F\u304A\u306D\u304C\u3044\u3057\u307E\u3059", label: "\u3088\u308D\u3057\u304F\u304A\u306D\u304C\u3044\u3057\u307E\u3059", pronunciation: "yoroshiku onegai shimasu", translation: "Goodwill close" },
          { value: "\u3067\u3059", label: "\u3067\u3059", pronunciation: "desu", translation: "I am / is" },
          { value: "\u3053\u3093\u306B\u3061\u306F", label: "\u3053\u3093\u306B\u3061\u306F", pronunciation: "konnichiwa", translation: "Hello" },
          { value: "\u3059\u307F\u307E\u305B\u3093", label: "\u3059\u307F\u307E\u305B\u3093", pronunciation: "sumimasen", translation: "Excuse me" }
        ]
      },
      {
        id: "ja_u1_l2_e8",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "よろしくおねがいします",
        audioText: "よろしくおねがいします"
      }
    ]
  },
  {
    id: "es_u3_l1",
    unitId: "es_unit_3",
    title: "Dining Vocabulary",
    description: "Learn vocabulary for ordering food and discussing meals in Spanish.",
    type: "vocabulary",
    order: 1,
    xpReward: 10,
    durationMinutes: 4,
    goals: ["Name common foods", "Ask for a menu"],
    activities: [
      {
        id: "es_u3_l1_a1",
        lessonId: "es_u3_l1",
        type: "multiple-choice",
        question: "What does 'La comida' mean?",
        options: ["The bill", "The food", "The table", "The menu"],
        correctAnswer: "The food",
      },
      {
        id: "es_u3_l1_a2",
        lessonId: "es_u3_l1",
        type: "translate",
        question: "Translate: 'El menú, por favor'",
        correctAnswer: "The menu, please",
        translationContext: "Use this when asking a waiter for the menu.",
      },
    ],
    exercises: [
      {
        id: "es_u3_l1_e1",
        type: "mcq",
        question: "What is 'La cuenta'?",
        options: ["The food", "The bill", "The menu", "The table"],
        correctAnswer: "The bill"
      },
      {
        id: "es_u3_l1_e2",
        type: "mcq",
        question: "Select the correct translation for 'food'",
        options: ["La comida", "La cuenta", "La mesa", "El agua"],
        correctAnswer: "La comida"
      },
      {
        id: "es_u3_l1_e3",
        type: "fill-in-the-blank",
        question: "Complete: 'The menu, please'",
        sentence: "El ___, por favor",
        correctAnswer: "menú",
        acceptedAnswers: ["menu"],
        wordBank: esDiningWordBank
      },
      {
        id: "es_u3_l1_e4",
        type: "matching-pairs",
        question: "Match the dining words",
        pairs: [
          { id: "p1", left: "La cuenta", right: "The bill" },
          { id: "p2", left: "La comida", right: "The food" },
          { id: "p3", left: "La mesa", right: "The table" },
          { id: "p4", left: "El menú", right: "The menu" }
        ],
        correctAnswer: ""
      },
      {
        id: "es_u3_l1_e5",
        type: "tap-word",
        question: "Select the phrase for 'The food is good'",
        options: ["La comida es buena", "La cuenta es buena", "El menú es agua", "La mesa es café"],
        correctAnswer: "La comida es buena"
      },
      {
        id: "es_u3_l1_e6",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "La comida",
        audioText: "La comida"
      },
      {
        id: "es_u3_l1_e7",
        type: "fill-in-the-blank",
        question: "Complete: 'The bill is on the table'",
        sentence: "La cuenta está en la ___",
        correctAnswer: "mesa",
        wordBank: esDiningWordBank
      },
      {
        id: "es_u3_l1_e8",
        type: "mcq",
        question: "Translate: 'Thank you for the meal.'",
        options: ["Gracias por la comida.", "Gracias por la cuenta.", "El menú, por favor.", "La mesa está aquí."],
        correctAnswer: "Gracias por la comida."
      }
    ]
  },
  {
    id: "es_u3_l2",
    unitId: "es_unit_3",
    title: "AI Chat: Ordering Food",
    description: "Chat with a waiter to order food and request the bill.",
    type: "chat",
    order: 2,
    xpReward: 15,
    durationMinutes: 5,
    goals: ["Order food politely", "Ask for the bill"],
    activities: [
      {
        id: "es_u3_l2_a1",
        lessonId: "es_u3_l2",
        type: "multiple-choice",
        question: "Which phrase means 'I would like to order food'?",
        options: ["Quisiera ordenar comida.", "La cuenta, por favor.", "El menú, por favor.", "Gracias por la comida."],
        correctAnswer: "Quisiera ordenar comida.",
      },
      {
        id: "es_u3_l2_a2",
        lessonId: "es_u3_l2",
        type: "translate",
        question: "Translate: 'La cuenta, por favor'",
        correctAnswer: "The bill, please",
        translationContext: "Use this when you are ready to pay at a restaurant.",
      },
    ],
    exercises: [
      {
        id: "es_u3_l2_e1",
        type: "mcq",
        question: "How do you say 'The bill, please'?",
        options: ["La cuenta, por favor", "Hola, buenas tardes", "Gracias por la comida", "Un café, por favor"],
        correctAnswer: "La cuenta, por favor"
      },
      {
        id: "es_u3_l2_e2",
        type: "mcq",
        question: "Select the polite phrase for 'I would like to order food.'",
        options: ["Quisiera ordenar comida.", "Quisiera pagar agua.", "La mesa es buena.", "El menú está tarde."],
        correctAnswer: "Quisiera ordenar comida."
      },
      {
        id: "es_u3_l2_e3",
        type: "fill-in-the-blank",
        question: "Complete: 'I would like to order food'",
        sentence: "Quisiera ordenar ___",
        correctAnswer: "comida",
        wordBank: esRestaurantWordBank
      },
      {
        id: "es_u3_l2_e4",
        type: "matching-pairs",
        question: "Match the restaurant phrases",
        pairs: [
          { id: "p1", left: "Quisiera ordenar", right: "I would like to order" },
          { id: "p2", left: "La cuenta, por favor", right: "The bill, please" },
          { id: "p3", left: "El menú, por favor", right: "The menu, please" },
          { id: "p4", left: "Gracias por la comida", right: "Thank you for the meal" }
        ],
        correctAnswer: ""
      },
      {
        id: "es_u3_l2_e5",
        type: "tap-word",
        question: "Select the best request for a menu and water",
        options: ["¿Podemos tener el menú y agua?", "¿Podemos tener la cuenta y leche?", "Gracias por el café.", "La comida es tarde."],
        correctAnswer: "¿Podemos tener el menú y agua?"
      },
      {
        id: "es_u3_l2_e6",
        type: "listen-type",
        question: "Listen and type what you hear",
        correctAnswer: "La cuenta, por favor",
        audioText: "La cuenta, por favor"
      },
      {
        id: "es_u3_l2_e7",
        type: "fill-in-the-blank",
        question: "Complete the polite request",
        sentence: "La cuenta, por ___",
        correctAnswer: "favor",
        wordBank: esRestaurantWordBank
      },
      {
        id: "es_u3_l2_e8",
        type: "mcq",
        question: "Translate: 'Can we have the menu and water?'",
        options: ["¿Podemos tener el menú y agua?", "¿Podemos tener la cuenta y leche?", "¿Podemos comer el barista?", "¿Podemos beber la mesa?"],
        correctAnswer: "¿Podemos tener el menú y agua?"
      }
    ]
  }
];

export const getAllLessonsFromData = (): Lesson[] => lessons;

export const getLessonById = (lessonId?: string): Lesson | undefined => {
  if (!lessonId) return undefined;
  return lessons.find((lesson) => lesson.id === lessonId);
};

export const getFirstLesson = (): Lesson | undefined => lessons[0];

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
