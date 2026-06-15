import type {
	CurriculumConcept,
	CurriculumLessonPlan,
	Exercise,
	Lesson,
	Unit,
	WordBankOption,
} from "@/types/learning";

export const CORE_A1_LANGUAGE_IDS = ["en", "es", "fr", "ja", "de", "ar"] as const;

type CoreA1LanguageId = (typeof CORE_A1_LANGUAGE_IDS)[number];

type PhraseKey =
	| "hello"
	| "goodbye"
	| "thanks"
	| "youAreWelcome"
	| "please"
	| "excuseMe"
	| "yes"
	| "no"
	| "myNameIs"
	| "whatIsYourName"
	| "niceToMeetYou"
	| "howAreYou"
	| "imGood"
	| "andYou"
	| "seeYouLater"
	| "iAm"
	| "coffee"
	| "water"
	| "tea"
	| "milk"
	| "menu"
	| "bill"
	| "iWantCoffee"
	| "withMilk"
	| "table"
	| "food"
	| "iWouldLikeFood"
	| "canWeHaveMenu"
	| "whereIs"
	| "restroom"
	| "iNeedHelp"
	| "iDontUnderstand"
	| "station"
	| "hospital";

type Phrase = {
	value: string;
	pronunciation: string;
};

type LessonTemplate = {
	key: string;
	title: string;
	description: string;
	canDoStatement: string;
	teachingFocus: string;
	phraseKeys: PhraseKey[];
	primaryConceptKeys: string[];
	supportConceptKeys?: string[];
	type?: Lesson["type"];
};

type ConceptTemplate = {
	key: string;
	title: string;
	description: string;
	type: CurriculumConcept["type"];
	skillArea: CurriculumConcept["skillArea"];
	phraseKeys: PhraseKey[];
	whyItMatters: string;
	reviewPrompt: string;
	commonMistakes?: string[];
	explanationHint?: string;
};

type CheckpointSentenceTemplate = {
	english: string;
	phraseKeys: PhraseKey[];
	conceptKeys: string[];
};

type UnitTemplate = {
	key: string;
	title: string;
	description: string;
	order: number;
	color: string;
	emoji: string;
	canDoGoal: string;
	grammarFocus: string[];
	concepts: ConceptTemplate[];
	lessons: LessonTemplate[];
	checkpointSentences: CheckpointSentenceTemplate[];
};

const PHRASE_TRANSLATIONS: Record<PhraseKey, string> = {
	hello: "Hello",
	goodbye: "Goodbye",
	thanks: "Thank you",
	youAreWelcome: "You're welcome",
	please: "Please",
	excuseMe: "Excuse me",
	yes: "Yes",
	no: "No",
	myNameIs: "My name is...",
	whatIsYourName: "What is your name?",
	niceToMeetYou: "Nice to meet you",
	howAreYou: "How are you?",
	imGood: "I'm good",
	andYou: "And you?",
	seeYouLater: "See you later",
	iAm: "I am...",
	coffee: "Coffee",
	water: "Water",
	tea: "Tea",
	milk: "Milk",
	menu: "Menu",
	bill: "The bill",
	iWantCoffee: "I want coffee",
	withMilk: "With milk",
	table: "Table",
	food: "Food",
	iWouldLikeFood: "I would like food",
	canWeHaveMenu: "Can we have the menu?",
	whereIs: "Where is...?",
	restroom: "Restroom",
	iNeedHelp: "I need help",
	iDontUnderstand: "I don't understand",
	station: "Station",
	hospital: "Hospital",
};

const PHRASES: Record<CoreA1LanguageId, Record<PhraseKey, Phrase>> = {
	en: {
		hello: { value: "Hello", pronunciation: "heh-LOH" },
		goodbye: { value: "Goodbye", pronunciation: "good-BYE" },
		thanks: { value: "Thank you", pronunciation: "thank yoo" },
		youAreWelcome: { value: "You're welcome", pronunciation: "yoor WEL-kuhm" },
		please: { value: "Please", pronunciation: "pleez" },
		excuseMe: { value: "Excuse me", pronunciation: "ik-SKYOOZ mee" },
		yes: { value: "Yes", pronunciation: "yes" },
		no: { value: "No", pronunciation: "noh" },
		myNameIs: { value: "My name is", pronunciation: "my naym iz" },
		whatIsYourName: { value: "What is your name?", pronunciation: "wuht iz yoor naym" },
		niceToMeetYou: { value: "Nice to meet you", pronunciation: "nys tuh meet yoo" },
		howAreYou: { value: "How are you?", pronunciation: "how ar yoo" },
		imGood: { value: "I'm good", pronunciation: "ym good" },
		andYou: { value: "And you?", pronunciation: "and yoo" },
		seeYouLater: { value: "See you later", pronunciation: "see yoo LAY-ter" },
		iAm: { value: "I am", pronunciation: "eye am" },
		coffee: { value: "Coffee", pronunciation: "KAW-fee" },
		water: { value: "Water", pronunciation: "WAW-ter" },
		tea: { value: "Tea", pronunciation: "tee" },
		milk: { value: "Milk", pronunciation: "milk" },
		menu: { value: "Menu", pronunciation: "MEN-yoo" },
		bill: { value: "The bill", pronunciation: "thuh bil" },
		iWantCoffee: { value: "I want coffee", pronunciation: "eye wahnt KAW-fee" },
		withMilk: { value: "With milk", pronunciation: "with milk" },
		table: { value: "Table", pronunciation: "TAY-buhl" },
		food: { value: "Food", pronunciation: "food" },
		iWouldLikeFood: { value: "I would like food", pronunciation: "eye wood lyk food" },
		canWeHaveMenu: { value: "Can we have the menu?", pronunciation: "kan wee hav thuh MEN-yoo" },
		whereIs: { value: "Where is...?", pronunciation: "wair iz" },
		restroom: { value: "Restroom", pronunciation: "REST-room" },
		iNeedHelp: { value: "I need help", pronunciation: "eye need help" },
		iDontUnderstand: { value: "I don't understand", pronunciation: "eye dohnt un-der-STAND" },
		station: { value: "Station", pronunciation: "STAY-shuhn" },
		hospital: { value: "Hospital", pronunciation: "HAH-spih-tuhl" },
	},
	es: {
		hello: { value: "Hola", pronunciation: "OH-lah" },
		goodbye: { value: "Adiós", pronunciation: "ah-DYOHS" },
		thanks: { value: "Gracias", pronunciation: "GRAH-syahs" },
		youAreWelcome: { value: "De nada", pronunciation: "deh NAH-dah" },
		please: { value: "Por favor", pronunciation: "por fah-VOR" },
		excuseMe: { value: "Perdón", pronunciation: "per-DOHN" },
		yes: { value: "Sí", pronunciation: "see" },
		no: { value: "No", pronunciation: "noh" },
		myNameIs: { value: "Me llamo", pronunciation: "meh YAH-moh" },
		whatIsYourName: { value: "¿Cómo te llamas?", pronunciation: "KOH-moh teh YAH-mahs" },
		niceToMeetYou: { value: "Mucho gusto", pronunciation: "MOO-choh GOOS-toh" },
		howAreYou: { value: "¿Cómo estás?", pronunciation: "KOH-moh es-TAHS" },
		imGood: { value: "Estoy bien", pronunciation: "es-TOY byen" },
		andYou: { value: "¿Y tú?", pronunciation: "ee too" },
		seeYouLater: { value: "Hasta luego", pronunciation: "AHS-tah LWEH-goh" },
		iAm: { value: "Yo soy", pronunciation: "yoh soy" },
		coffee: { value: "Café", pronunciation: "kah-FEH" },
		water: { value: "Agua", pronunciation: "AH-gwah" },
		tea: { value: "Té", pronunciation: "teh" },
		milk: { value: "Leche", pronunciation: "LEH-cheh" },
		menu: { value: "Menú", pronunciation: "meh-NOO" },
		bill: { value: "La cuenta", pronunciation: "lah KWEN-tah" },
		iWantCoffee: { value: "Quiero café", pronunciation: "KYEH-roh kah-FEH" },
		withMilk: { value: "Con leche", pronunciation: "kohn LEH-cheh" },
		table: { value: "Mesa", pronunciation: "MEH-sah" },
		food: { value: "Comida", pronunciation: "koh-MEE-dah" },
		iWouldLikeFood: { value: "Quisiera comida", pronunciation: "kee-SYEH-rah koh-MEE-dah" },
		canWeHaveMenu: { value: "El menú, por favor", pronunciation: "el meh-NOO por fah-VOR" },
		whereIs: { value: "¿Dónde está?", pronunciation: "DOHN-deh es-TAH" },
		restroom: { value: "El baño", pronunciation: "el BAH-nyoh" },
		iNeedHelp: { value: "Necesito ayuda", pronunciation: "neh-seh-SEE-toh ah-YOO-dah" },
		iDontUnderstand: { value: "No entiendo", pronunciation: "noh en-TYEN-doh" },
		station: { value: "La estación", pronunciation: "lah es-tah-SYOHN" },
		hospital: { value: "El hospital", pronunciation: "el ohs-pee-TAHL" },
	},
	fr: {
		hello: { value: "Bonjour", pronunciation: "bohn-ZHOOR" },
		goodbye: { value: "Au revoir", pronunciation: "oh ruh-VWAHR" },
		thanks: { value: "Merci", pronunciation: "mair-SEE" },
		youAreWelcome: { value: "De rien", pronunciation: "duh RYEHN" },
		please: { value: "S'il vous plaît", pronunciation: "seel voo PLEH" },
		excuseMe: { value: "Excusez-moi", pronunciation: "ex-koo-zay MWAH" },
		yes: { value: "Oui", pronunciation: "wee" },
		no: { value: "Non", pronunciation: "nohn" },
		myNameIs: { value: "Je m'appelle", pronunciation: "zhuh mah-PELL" },
		whatIsYourName: { value: "Comment vous appelez-vous?", pronunciation: "koh-mahn voo zah-play VOO" },
		niceToMeetYou: { value: "Enchanté", pronunciation: "ahn-shahn-TAY" },
		howAreYou: { value: "Comment ça va ?", pronunciation: "koh-mahn sah vah" },
		imGood: { value: "Ça va bien", pronunciation: "sah vah byen" },
		andYou: { value: "Et vous?", pronunciation: "ay voo" },
		seeYouLater: { value: "À bientôt", pronunciation: "ah byen-TOH" },
		iAm: { value: "Je suis", pronunciation: "zhuh swee" },
		coffee: { value: "Café", pronunciation: "kah-FEH" },
		water: { value: "Eau", pronunciation: "oh" },
		tea: { value: "Thé", pronunciation: "tay" },
		milk: { value: "Lait", pronunciation: "leh" },
		menu: { value: "Menu", pronunciation: "muh-NOO" },
		bill: { value: "L'addition", pronunciation: "lah-dee-SYOHN" },
		iWantCoffee: { value: "Je veux un café", pronunciation: "zhuh vuh uhn kah-FEH" },
		withMilk: { value: "Avec du lait", pronunciation: "ah-vek doo leh" },
		table: { value: "Table", pronunciation: "tahbl" },
		food: { value: "Nourriture", pronunciation: "noo-ree-TOOR" },
		iWouldLikeFood: { value: "Je voudrais manger", pronunciation: "zhuh voo-DREH mahn-ZHAY" },
		canWeHaveMenu: { value: "Le menu, s'il vous plaît", pronunciation: "luh muh-NOO seel voo PLEH" },
		whereIs: { value: "Où est... ?", pronunciation: "oo eh" },
		restroom: { value: "Les toilettes", pronunciation: "lay twah-LET" },
		iNeedHelp: { value: "J'ai besoin d'aide", pronunciation: "zhay buh-ZWAHN ded" },
		iDontUnderstand: { value: "Je ne comprends pas", pronunciation: "zhuh nuh kohm-PRAHN pah" },
		station: { value: "La gare", pronunciation: "lah gahr" },
		hospital: { value: "L'hôpital", pronunciation: "loh-pee-TAHL" },
	},
	ja: {
		hello: { value: "こんにちは", pronunciation: "konnichiwa" },
		goodbye: { value: "さようなら", pronunciation: "sayounara" },
		thanks: { value: "ありがとう", pronunciation: "arigatou" },
		youAreWelcome: { value: "どういたしまして", pronunciation: "dou itashimashite" },
		please: { value: "お願いします", pronunciation: "onegai shimasu" },
		excuseMe: { value: "すみません", pronunciation: "sumimasen" },
		yes: { value: "はい", pronunciation: "hai" },
		no: { value: "いいえ", pronunciation: "iie" },
		myNameIs: { value: "私の名前は", pronunciation: "watashi no namae wa" },
		whatIsYourName: { value: "お名前は？", pronunciation: "o-namae wa" },
		niceToMeetYou: { value: "はじめまして", pronunciation: "hajimemashite" },
		howAreYou: { value: "お元気ですか？", pronunciation: "o-genki desu ka" },
		imGood: { value: "元気です", pronunciation: "genki desu" },
		andYou: { value: "あなたは？", pronunciation: "anata wa" },
		seeYouLater: { value: "またね", pronunciation: "mata ne" },
		iAm: { value: "私は", pronunciation: "watashi wa" },
		coffee: { value: "コーヒー", pronunciation: "koohii" },
		water: { value: "水", pronunciation: "mizu" },
		tea: { value: "お茶", pronunciation: "ocha" },
		milk: { value: "牛乳", pronunciation: "gyuunyuu" },
		menu: { value: "メニュー", pronunciation: "menyuu" },
		bill: { value: "お会計", pronunciation: "okaikei" },
		iWantCoffee: { value: "コーヒーをください", pronunciation: "koohii o kudasai" },
		withMilk: { value: "ミルク入り", pronunciation: "miruku iri" },
		table: { value: "テーブル", pronunciation: "teeburu" },
		food: { value: "食べ物", pronunciation: "tabemono" },
		iWouldLikeFood: { value: "食べ物をください", pronunciation: "tabemono o kudasai" },
		canWeHaveMenu: { value: "メニューをください", pronunciation: "menyuu o kudasai" },
		whereIs: { value: "どこですか？", pronunciation: "doko desu ka" },
		restroom: { value: "トイレ", pronunciation: "toire" },
		iNeedHelp: { value: "助けてください", pronunciation: "tasukete kudasai" },
		iDontUnderstand: { value: "わかりません", pronunciation: "wakarimasen" },
		station: { value: "駅", pronunciation: "eki" },
		hospital: { value: "病院", pronunciation: "byouin" },
	},
	de: {
		hello: { value: "Hallo", pronunciation: "HAH-loh" },
		goodbye: { value: "Auf Wiedersehen", pronunciation: "owf VEE-der-zayn" },
		thanks: { value: "Danke", pronunciation: "DAHN-kuh" },
		youAreWelcome: { value: "Bitte sehr", pronunciation: "BIT-tuh zehr" },
		please: { value: "Bitte", pronunciation: "BIT-tuh" },
		excuseMe: { value: "Entschuldigung", pronunciation: "ent-SHOOL-dee-goong" },
		yes: { value: "Ja", pronunciation: "yah" },
		no: { value: "Nein", pronunciation: "nine" },
		myNameIs: { value: "Ich heiße", pronunciation: "ikh HIGH-suh" },
		whatIsYourName: { value: "Wie heißen Sie?", pronunciation: "vee HIGH-sen zee" },
		niceToMeetYou: { value: "Freut mich", pronunciation: "froyt mikh" },
		howAreYou: { value: "Wie geht es Ihnen?", pronunciation: "vee gayt es EE-nen" },
		imGood: { value: "Mir geht es gut", pronunciation: "meer gayt es goot" },
		andYou: { value: "Und Ihnen?", pronunciation: "oont EE-nen" },
		seeYouLater: { value: "Bis später", pronunciation: "bis SHPAY-ter" },
		iAm: { value: "Ich bin", pronunciation: "ikh bin" },
		coffee: { value: "Kaffee", pronunciation: "KAH-fay" },
		water: { value: "Wasser", pronunciation: "VAH-ser" },
		tea: { value: "Tee", pronunciation: "tay" },
		milk: { value: "Milch", pronunciation: "milkh" },
		menu: { value: "Speisekarte", pronunciation: "SHPIE-zuh-kar-tuh" },
		bill: { value: "Rechnung", pronunciation: "REKH-noong" },
		iWantCoffee: { value: "Ich möchte Kaffee", pronunciation: "ikh MURKH-tuh KAH-fay" },
		withMilk: { value: "Mit Milch", pronunciation: "mit milkh" },
		table: { value: "Tisch", pronunciation: "tish" },
		food: { value: "Essen", pronunciation: "ES-en" },
		iWouldLikeFood: { value: "Ich möchte Essen", pronunciation: "ikh MURKH-tuh ES-en" },
		canWeHaveMenu: { value: "Die Speisekarte, bitte", pronunciation: "dee SHPIE-zuh-kar-tuh BIT-tuh" },
		whereIs: { value: "Wo ist...?", pronunciation: "voh ist" },
		restroom: { value: "Toilette", pronunciation: "twah-LET-uh" },
		iNeedHelp: { value: "Ich brauche Hilfe", pronunciation: "ikh BROW-khuh HIL-fuh" },
		iDontUnderstand: { value: "Ich verstehe nicht", pronunciation: "ikh fer-SHTAY-uh nikht" },
		station: { value: "Bahnhof", pronunciation: "BAHN-hof" },
		hospital: { value: "Krankenhaus", pronunciation: "KRAHN-ken-hows" },
	},
	ar: {
		hello: { value: "مرحبا", pronunciation: "marhaba" },
		goodbye: { value: "مع السلامة", pronunciation: "ma'a salama" },
		thanks: { value: "شكرا", pronunciation: "shukran" },
		youAreWelcome: { value: "عفوا", pronunciation: "afwan" },
		please: { value: "من فضلك", pronunciation: "min fadlak" },
		excuseMe: { value: "عذرا", pronunciation: "udhran" },
		yes: { value: "نعم", pronunciation: "na'am" },
		no: { value: "لا", pronunciation: "la" },
		myNameIs: { value: "اسمي", pronunciation: "ismi" },
		whatIsYourName: { value: "ما اسمك؟", pronunciation: "ma ismuka" },
		niceToMeetYou: { value: "تشرفنا", pronunciation: "tasharrafna" },
		howAreYou: { value: "كيف حالك؟", pronunciation: "kayfa haluka" },
		imGood: { value: "أنا بخير", pronunciation: "ana bikhayr" },
		andYou: { value: "وأنت؟", pronunciation: "wa anta" },
		seeYouLater: { value: "إلى اللقاء", pronunciation: "ila al-liqa" },
		iAm: { value: "أنا", pronunciation: "ana" },
		coffee: { value: "قهوة", pronunciation: "qahwa" },
		water: { value: "ماء", pronunciation: "ma" },
		tea: { value: "شاي", pronunciation: "shay" },
		milk: { value: "حليب", pronunciation: "haleeb" },
		menu: { value: "قائمة الطعام", pronunciation: "qa'imat al-ta'am" },
		bill: { value: "الفاتورة", pronunciation: "al-fatura" },
		iWantCoffee: { value: "أريد قهوة", pronunciation: "ureed qahwa" },
		withMilk: { value: "مع حليب", pronunciation: "ma'a haleeb" },
		table: { value: "طاولة", pronunciation: "tawila" },
		food: { value: "طعام", pronunciation: "ta'am" },
		iWouldLikeFood: { value: "أريد طعاما", pronunciation: "ureed ta'aman" },
		canWeHaveMenu: { value: "القائمة من فضلك", pronunciation: "al-qaima min fadlak" },
		whereIs: { value: "أين...؟", pronunciation: "ayna" },
		restroom: { value: "الحمام", pronunciation: "al-hammam" },
		iNeedHelp: { value: "أحتاج مساعدة", pronunciation: "ahtaj musa'ada" },
		iDontUnderstand: { value: "لا أفهم", pronunciation: "la afham" },
		station: { value: "المحطة", pronunciation: "al-mahatta" },
		hospital: { value: "المستشفى", pronunciation: "al-mustashfa" },
	},
};

const LANGUAGE_NAMES: Record<CoreA1LanguageId, string> = {
	en: "English",
	es: "Spanish",
	fr: "French",
	ja: "Japanese",
	de: "German",
	ar: "Arabic",
};

const UNIT_TEMPLATES: UnitTemplate[] = [
	{
		key: "unit_1",
		title: "Unit 1: First Conversation",
		description: "Greet people, introduce yourself, and answer simple check-ins.",
		order: 1,
		color: "#58CC02",
		emoji: "\u{1F44B}",
		canDoGoal: "I can start a first conversation with greetings, names, and simple replies.",
		grammarFocus: ["set greeting phrases", "name patterns", "simple question and answer patterns"],
		checkpointSentences: [
			{
				english: "Hello, my name is...",
				phraseKeys: ["hello", "myNameIs"],
				conceptKeys: ["greetings", "names"],
			},
			{
				english: "What is your name?",
				phraseKeys: ["whatIsYourName"],
				conceptKeys: ["names"],
			},
			{
				english: "Nice to meet you. How are you?",
				phraseKeys: ["niceToMeetYou", "howAreYou"],
				conceptKeys: ["nice-to-meet", "wellbeing"],
			},
			{
				english: "I'm good, and you?",
				phraseKeys: ["imGood", "andYou"],
				conceptKeys: ["wellbeing"],
			},
			{
				english: "See you later. Goodbye.",
				phraseKeys: ["seeYouLater", "goodbye"],
				conceptKeys: ["goodbyes"],
			},
		],
		concepts: [
			{
				key: "greetings",
				title: "Greetings",
				description: "Start a conversation with hello and simple opening phrases.",
				type: "phrase",
				skillArea: "basics",
				phraseKeys: ["hello"],
				whyItMatters: "Greetings are the first usable doorway into the language.",
				reviewPrompt: "Review greetings until starting a conversation feels automatic.",
				commonMistakes: ["Confusing hello with goodbye when both appear together."],
				explanationHint: "Use this phrase at the start of a conversation.",
			},
			{
				key: "goodbyes",
				title: "Goodbyes",
				description: "End a conversation politely.",
				type: "phrase",
				skillArea: "basics",
				phraseKeys: ["goodbye", "seeYouLater"],
				whyItMatters: "Ending a conversation is just as useful as starting one.",
				reviewPrompt: "Practice goodbye phrases with greetings for contrast.",
			},
			{
				key: "gratitude",
				title: "Gratitude",
				description: "Thank someone and respond warmly.",
				type: "phrase",
				skillArea: "politeness",
				phraseKeys: ["thanks", "youAreWelcome"],
				whyItMatters: "Thank-you phrases make beginner conversations sound human.",
				reviewPrompt: "Review gratitude phrases so polite replies come back quickly.",
			},
			{
				key: "yes-no",
				title: "Yes and No",
				description: "Recognize basic agreement and disagreement.",
				type: "vocabulary",
				skillArea: "basics",
				phraseKeys: ["yes", "no"],
				whyItMatters: "Yes and no support many early conversations.",
				reviewPrompt: "Practice yes/no quickly to improve response speed.",
			},
			{
				key: "names",
				title: "Names",
				description: "Say your name and ask for someone else's name.",
				type: "conversation",
				skillArea: "introductions",
				phraseKeys: ["myNameIs", "whatIsYourName", "iAm"],
				whyItMatters: "Name exchanges turn isolated phrases into a real interaction.",
				reviewPrompt: "Review name phrases before longer introductions.",
				commonMistakes: ["Answering the name question with a greeting instead of a name pattern."],
			},
			{
				key: "nice-to-meet",
				title: "Nice To Meet You",
				description: "Respond naturally after a name exchange.",
				type: "conversation",
				skillArea: "introductions",
				phraseKeys: ["niceToMeetYou"],
				whyItMatters: "This phrase makes introductions feel complete.",
				reviewPrompt: "Practice the introduction closing phrase with name patterns.",
			},
			{
				key: "wellbeing",
				title: "How Are You",
				description: "Ask and answer a simple check-in.",
				type: "conversation",
				skillArea: "basics",
				phraseKeys: ["howAreYou", "imGood", "andYou"],
				whyItMatters: "Check-ins move learners beyond one-word greetings.",
				reviewPrompt: "Review check-in phrases so greetings can continue naturally.",
			},
		],
		lessons: [
			{
				key: "l1",
				title: "Hello & Goodbye",
				description: "Recognize greetings, goodbyes, and short polite replies.",
				canDoStatement: "I can say hello, goodbye, and thank you.",
				teachingFocus: "Contrast opening and closing phrases with gratitude.",
				phraseKeys: ["hello", "goodbye", "thanks", "youAreWelcome", "please", "yes"],
				primaryConceptKeys: ["greetings", "goodbyes"],
				supportConceptKeys: ["gratitude", "yes-no"],
			},
			{
				key: "l2",
				title: "Thanks & Courtesy",
				description: "Use thank you, you're welcome, please, yes, and no.",
				canDoStatement: "I can respond politely in a short exchange.",
				teachingFocus: "Build polite automatic replies before longer sentences.",
				phraseKeys: ["thanks", "youAreWelcome", "please", "yes", "no", "hello"],
				primaryConceptKeys: ["gratitude", "yes-no"],
				supportConceptKeys: ["greetings"],
			},
			{
				key: "l3",
				title: "Names",
				description: "Introduce yourself and ask someone's name.",
				canDoStatement: "I can say my name and ask for another person's name.",
				teachingFocus: "Pair a name pattern with a natural introduction response.",
				phraseKeys: ["hello", "myNameIs", "whatIsYourName", "niceToMeetYou", "iAm", "thanks"],
				primaryConceptKeys: ["names", "nice-to-meet"],
				supportConceptKeys: ["greetings"],
				type: "video",
			},
			{
				key: "l4",
				title: "First Chat",
				description: "Ask how someone is and end the conversation.",
				canDoStatement: "I can handle a very short first conversation.",
				teachingFocus: "Combine greetings, check-ins, and a closing phrase.",
				phraseKeys: ["hello", "howAreYou", "imGood", "andYou", "seeYouLater", "goodbye"],
				primaryConceptKeys: ["wellbeing", "goodbyes"],
				supportConceptKeys: ["greetings"],
				type: "chat",
			},
		],
	},
	{
		key: "unit_2",
		title: "Unit 2: Politeness & Survival",
		description: "Get attention, ask for help, and say when you do not understand.",
		order: 2,
		color: "#1CB0F6",
		emoji: "\u{1F6DF}",
		canDoGoal: "I can ask politely for help and handle simple survival phrases.",
		grammarFocus: ["polite request chunks", "help phrases", "clarification phrases"],
		checkpointSentences: [
			{
				english: "Excuse me, please.",
				phraseKeys: ["excuseMe", "please"],
				conceptKeys: ["attention", "requests"],
			},
			{
				english: "I need help, please.",
				phraseKeys: ["iNeedHelp", "please"],
				conceptKeys: ["help", "requests"],
			},
			{
				english: "I don't understand. Yes or no?",
				phraseKeys: ["iDontUnderstand", "yes", "no"],
				conceptKeys: ["understanding", "yes-no"],
			},
			{
				english: "Yes, thank you.",
				phraseKeys: ["yes", "thanks"],
				conceptKeys: ["yes-no", "survival-review"],
			},
			{
				english: "Excuse me, where is the restroom?",
				phraseKeys: ["excuseMe", "whereIs", "restroom"],
				conceptKeys: ["attention", "restroom"],
			},
		],
		concepts: [
			{
				key: "attention",
				title: "Getting Attention",
				description: "Use excuse me to start a request politely.",
				type: "phrase",
				skillArea: "politeness",
				phraseKeys: ["excuseMe"],
				whyItMatters: "A polite opener lowers pressure in real interactions.",
				reviewPrompt: "Review the attention phrase with please and help.",
				explanationHint: "This phrase is used before a request or interruption.",
			},
			{
				key: "requests",
				title: "Please",
				description: "Make a short request sound polite.",
				type: "phrase",
				skillArea: "politeness",
				phraseKeys: ["please"],
				whyItMatters: "Please is useful in almost every beginner scenario.",
				reviewPrompt: "Practice please with food and help requests.",
			},
			{
				key: "help",
				title: "Help Requests",
				description: "Ask for help in a simple emergency or travel moment.",
				type: "conversation",
				skillArea: "travel",
				phraseKeys: ["iNeedHelp"],
				whyItMatters: "Help phrases are high-priority survival language.",
				reviewPrompt: "Review help requests sooner after mistakes.",
			},
			{
				key: "understanding",
				title: "I Don't Understand",
				description: "Say that you do not understand.",
				type: "conversation",
				skillArea: "basics",
				phraseKeys: ["iDontUnderstand"],
				whyItMatters: "Clarification phrases keep learners in the conversation.",
				reviewPrompt: "Practice clarification phrases with yes/no replies.",
			},
			{
				key: "yes-no",
				title: "Yes and No",
				description: "Answer simple survival questions with yes or no.",
				type: "vocabulary",
				skillArea: "basics",
				phraseKeys: ["yes", "no"],
				whyItMatters: "Short answers keep a beginner exchange moving.",
				reviewPrompt: "Review yes/no replies with clarification phrases.",
			},
			{
				key: "restroom",
				title: "Restroom",
				description: "Recognize a key place word for travel.",
				type: "vocabulary",
				skillArea: "travel",
				phraseKeys: ["restroom"],
				whyItMatters: "Some survival words are immediately useful.",
				reviewPrompt: "Review place words with where-is phrases.",
			},
			{
				key: "survival-review",
				title: "Survival Review",
				description: "Combine excuse me, help, please, and thanks.",
				type: "conversation",
				skillArea: "travel",
				phraseKeys: ["excuseMe", "iNeedHelp", "please", "thanks"],
				whyItMatters: "Combining short phrases is the bridge to real use.",
				reviewPrompt: "Review survival phrases as a mini conversation.",
			},
		],
		lessons: [
			{
				key: "l1",
				title: "Excuse Me",
				description: "Get someone's attention and ask politely.",
				canDoStatement: "I can get attention politely before asking for something.",
				teachingFocus: "Use an attention phrase before a request.",
				phraseKeys: ["excuseMe", "please", "yes", "no", "thanks", "iDontUnderstand"],
				primaryConceptKeys: ["attention", "requests"],
				supportConceptKeys: ["understanding"],
			},
			{
				key: "l2",
				title: "I Need Help",
				description: "Use a simple help phrase with please and thank you.",
				canDoStatement: "I can ask for help politely.",
				teachingFocus: "Treat help as a reusable phrase chunk.",
				phraseKeys: ["iNeedHelp", "please", "thanks", "excuseMe", "yes", "no"],
				primaryConceptKeys: ["help", "requests"],
				supportConceptKeys: ["attention"],
				type: "chat",
			},
			{
				key: "l3",
				title: "I Don't Understand",
				description: "Tell someone you do not understand and answer yes or no.",
				canDoStatement: "I can say that I do not understand.",
				teachingFocus: "Normalize clarification as useful, not failure.",
				phraseKeys: ["iDontUnderstand", "yes", "no", "please", "excuseMe", "thanks"],
				primaryConceptKeys: ["understanding", "yes-no"],
				supportConceptKeys: ["requests"],
			},
			{
				key: "l4",
				title: "Survival Practice",
				description: "Combine help, restroom, please, and thanks.",
				canDoStatement: "I can use a short survival exchange.",
				teachingFocus: "Practice a realistic travel mini-dialogue.",
				phraseKeys: ["excuseMe", "iNeedHelp", "restroom", "please", "thanks", "goodbye"],
				primaryConceptKeys: ["survival-review", "restroom"],
				supportConceptKeys: ["help", "attention"],
				type: "chat",
			},
		],
	},
	{
		key: "unit_3",
		title: "Unit 3: Cafe & Food",
		description: "Order drinks and food, ask for the menu, and pay.",
		order: 3,
		color: "#FF9600",
		emoji: "\u2615",
		canDoGoal: "I can order simple food and drinks and ask for the menu or bill.",
		grammarFocus: ["I want / I would like", "with phrases", "polite cafe requests"],
		checkpointSentences: [
			{
				english: "I want coffee, please.",
				phraseKeys: ["iWantCoffee", "please"],
				conceptKeys: ["coffee-order", "requests"],
			},
			{
				english: "Coffee with milk.",
				phraseKeys: ["coffee", "withMilk"],
				conceptKeys: ["drinks", "milk"],
			},
			{
				english: "The menu, please.",
				phraseKeys: ["menu", "please"],
				conceptKeys: ["menu", "requests"],
			},
			{
				english: "I would like food.",
				phraseKeys: ["iWouldLikeFood"],
				conceptKeys: ["food-order"],
			},
			{
				english: "The bill, please.",
				phraseKeys: ["bill", "please"],
				conceptKeys: ["bill", "requests"],
			},
		],
		concepts: [
			{
				key: "drinks",
				title: "Drinks",
				description: "Recognize coffee, water, tea, and milk.",
				type: "vocabulary",
				skillArea: "food",
				phraseKeys: ["coffee", "water", "tea", "milk"],
				whyItMatters: "Drink words make cafe practice concrete.",
				reviewPrompt: "Review drink words with ordering phrases.",
			},
			{
				key: "requests",
				title: "Cafe Please",
				description: "Use please inside a cafe request.",
				type: "phrase",
				skillArea: "politeness",
				phraseKeys: ["please"],
				whyItMatters: "Politeness makes short food requests sound natural.",
				reviewPrompt: "Review please with menu and coffee orders.",
			},
			{
				key: "gratitude",
				title: "Cafe Thanks",
				description: "Thank someone after ordering or receiving something.",
				type: "phrase",
				skillArea: "politeness",
				phraseKeys: ["thanks"],
				whyItMatters: "A thank-you phrase completes a simple cafe exchange.",
				reviewPrompt: "Review thanks after food and drink requests.",
			},
			{
				key: "coffee-order",
				title: "Coffee Orders",
				description: "Ask for coffee in a simple sentence.",
				type: "conversation",
				skillArea: "food",
				phraseKeys: ["iWantCoffee"],
				whyItMatters: "Ordering is one of the fastest practical wins.",
				reviewPrompt: "Practice coffee orders with please and thanks.",
			},
			{
				key: "milk",
				title: "With Milk",
				description: "Add a simple modifier to a drink.",
				type: "phrase",
				skillArea: "food",
				phraseKeys: ["withMilk", "milk"],
				whyItMatters: "Modifiers help learners create more specific requests.",
				reviewPrompt: "Review with-milk phrases after drink vocabulary.",
			},
			{
				key: "menu",
				title: "Menu",
				description: "Ask for the menu politely.",
				type: "conversation",
				skillArea: "dining",
				phraseKeys: ["menu", "canWeHaveMenu"],
				whyItMatters: "Menu phrases open the restaurant interaction.",
				reviewPrompt: "Practice menu phrases with polite requests.",
			},
			{
				key: "bill",
				title: "Bill",
				description: "Recognize and ask for the bill.",
				type: "vocabulary",
				skillArea: "dining",
				phraseKeys: ["bill"],
				whyItMatters: "Paying is a key endpoint in cafe and restaurant exchanges.",
				reviewPrompt: "Review bill phrases before restaurant practice.",
			},
			{
				key: "food-order",
				title: "Food Orders",
				description: "Ask for food in a simple sentence.",
				type: "conversation",
				skillArea: "food",
				phraseKeys: ["food", "iWouldLikeFood"],
				whyItMatters: "Food orders move from words to useful sentences.",
				reviewPrompt: "Practice food orders with menu and bill phrases.",
			},
		],
		lessons: [
			{
				key: "l1",
				title: "Drinks",
				description: "Recognize coffee, water, tea, and milk.",
				canDoStatement: "I can identify common drink words.",
				teachingFocus: "Introduce concrete food vocabulary before requests.",
				phraseKeys: ["coffee", "water", "tea", "milk", "please", "thanks"],
				primaryConceptKeys: ["drinks", "requests"],
				supportConceptKeys: ["gratitude"],
			},
			{
				key: "l2",
				title: "Order Coffee",
				description: "Order coffee and ask for milk politely.",
				canDoStatement: "I can order a coffee with milk.",
				teachingFocus: "Turn drink words into a reusable cafe request.",
				phraseKeys: ["iWantCoffee", "withMilk", "coffee", "milk", "please", "thanks"],
				primaryConceptKeys: ["coffee-order", "milk"],
				supportConceptKeys: ["drinks", "requests"],
				type: "chat",
			},
			{
				key: "l3",
				title: "Menu & Bill",
				description: "Ask for the menu and recognize the bill.",
				canDoStatement: "I can ask for the menu and bill.",
				teachingFocus: "Practice restaurant start and end points.",
				phraseKeys: ["menu", "canWeHaveMenu", "bill", "please", "thanks", "water"],
				primaryConceptKeys: ["menu", "bill"],
				supportConceptKeys: ["requests"],
			},
			{
				key: "l4",
				title: "Food Order",
				description: "Ask for simple food at a table.",
				canDoStatement: "I can make a simple food order.",
				teachingFocus: "Combine restaurant words into one practical exchange.",
				phraseKeys: ["table", "food", "iWouldLikeFood", "canWeHaveMenu", "water", "bill"],
				primaryConceptKeys: ["food-order", "menu"],
				supportConceptKeys: ["bill", "drinks"],
				type: "chat",
			},
		],
	},
	{
		key: "unit_4",
		title: "Unit 4: Places, Help & Simple Needs",
		description: "Ask where important places are and explain basic needs.",
		order: 4,
		color: "#CE82FF",
		emoji: "\u{1F4CD}",
		canDoGoal: "I can ask where places are and request basic help while traveling.",
		grammarFocus: ["where-is chunks", "need/help chunks", "travel place words"],
		checkpointSentences: [
			{
				english: "Excuse me, where is the restroom?",
				phraseKeys: ["excuseMe", "whereIs", "restroom"],
				conceptKeys: ["attention", "where", "restroom-place"],
			},
			{
				english: "Where is the station?",
				phraseKeys: ["whereIs", "station"],
				conceptKeys: ["where", "transport-place"],
			},
			{
				english: "I need help, please.",
				phraseKeys: ["iNeedHelp", "please"],
				conceptKeys: ["help-travel", "requests"],
			},
			{
				english: "Where is the hospital?",
				phraseKeys: ["whereIs", "hospital"],
				conceptKeys: ["where", "medical-place"],
			},
			{
				english: "I don't understand.",
				phraseKeys: ["iDontUnderstand"],
				conceptKeys: ["clarification"],
			},
		],
		concepts: [
			{
				key: "where",
				title: "Where Is",
				description: "Ask where something is.",
				type: "conversation",
				skillArea: "travel",
				phraseKeys: ["whereIs"],
				whyItMatters: "Where-is questions unlock many travel situations.",
				reviewPrompt: "Review where-is phrases with place words.",
			},
			{
				key: "attention",
				title: "Travel Attention",
				description: "Use excuse me before asking where something is.",
				type: "phrase",
				skillArea: "politeness",
				phraseKeys: ["excuseMe"],
				whyItMatters: "A polite attention phrase makes travel questions easier to start.",
				reviewPrompt: "Review excuse me before where-is questions.",
			},
			{
				key: "requests",
				title: "Travel Please",
				description: "Use please in short travel requests.",
				type: "phrase",
				skillArea: "politeness",
				phraseKeys: ["please"],
				whyItMatters: "Please keeps simple travel requests friendly.",
				reviewPrompt: "Review please with help and place questions.",
			},
			{
				key: "drinks",
				title: "Water",
				description: "Recognize water as a basic need while traveling.",
				type: "vocabulary",
				skillArea: "food",
				phraseKeys: ["water"],
				whyItMatters: "Water is a common practical request in travel moments.",
				reviewPrompt: "Review water with help and place phrases.",
			},
			{
				key: "restroom-place",
				title: "Restroom Place",
				description: "Recognize the restroom as a key travel place.",
				type: "vocabulary",
				skillArea: "travel",
				phraseKeys: ["restroom"],
				whyItMatters: "High-need place words are worth early repetition.",
				reviewPrompt: "Review restroom with where-is questions.",
			},
			{
				key: "transport-place",
				title: "Station",
				description: "Recognize the station as a travel place.",
				type: "vocabulary",
				skillArea: "travel",
				phraseKeys: ["station"],
				whyItMatters: "Station language supports basic navigation.",
				reviewPrompt: "Practice station with where-is questions.",
			},
			{
				key: "medical-place",
				title: "Hospital",
				description: "Recognize a basic medical place word.",
				type: "vocabulary",
				skillArea: "travel",
				phraseKeys: ["hospital"],
				whyItMatters: "Emergency place words are high-value survival content.",
				reviewPrompt: "Review hospital with help requests.",
			},
			{
				key: "help-travel",
				title: "Travel Help",
				description: "Ask for help in a travel setting.",
				type: "conversation",
				skillArea: "travel",
				phraseKeys: ["iNeedHelp", "please"],
				whyItMatters: "Help requests support real-world confidence.",
				reviewPrompt: "Practice help requests across travel contexts.",
			},
			{
				key: "clarification",
				title: "Clarification",
				description: "Say that you do not understand.",
				type: "conversation",
				skillArea: "basics",
				phraseKeys: ["iDontUnderstand", "yes", "no"],
				whyItMatters: "Clarification keeps communication going.",
				reviewPrompt: "Review clarification after difficult listening items.",
			},
		],
		lessons: [
			{
				key: "l1",
				title: "Where Is It?",
				description: "Ask where a place is.",
				canDoStatement: "I can ask where something is.",
				teachingFocus: "Pair one reusable question with place vocabulary.",
				phraseKeys: ["whereIs", "restroom", "station", "hospital", "excuseMe", "please"],
				primaryConceptKeys: ["where", "restroom-place"],
				supportConceptKeys: ["transport-place", "medical-place"],
			},
			{
				key: "l2",
				title: "Need Help",
				description: "Ask for help with basic needs.",
				canDoStatement: "I can ask for help with a simple need.",
				teachingFocus: "Recycle help language with travel vocabulary.",
				phraseKeys: ["iNeedHelp", "water", "restroom", "please", "thanks", "excuseMe"],
				primaryConceptKeys: ["help-travel", "restroom-place"],
				supportConceptKeys: ["drinks"],
				type: "chat",
			},
			{
				key: "l3",
				title: "Understand Or Not",
				description: "Use yes, no, and I don't understand.",
				canDoStatement: "I can say when I do not understand.",
				teachingFocus: "Build confidence with clarification language.",
				phraseKeys: ["iDontUnderstand", "yes", "no", "please", "excuseMe", "thanks"],
				primaryConceptKeys: ["clarification", "requests"],
				supportConceptKeys: ["attention"],
			},
			{
				key: "l4",
				title: "Mini Travel Chat",
				description: "Ask for places and help in a short travel exchange.",
				canDoStatement: "I can handle a simple travel help exchange.",
				teachingFocus: "Combine places, help, and polite phrases.",
				phraseKeys: ["excuseMe", "whereIs", "station", "iNeedHelp", "hospital", "thanks", "goodbye"],
				primaryConceptKeys: ["transport-place", "medical-place"],
				supportConceptKeys: ["where", "help-travel"],
				type: "chat",
			},
		],
	},
];

const getUnitId = (languageId: CoreA1LanguageId, unitOrder: number) =>
	`${languageId}_unit_${unitOrder}`;

const getLessonId = (languageId: CoreA1LanguageId, unitOrder: number, lessonOrder: number) =>
	`${languageId}_u${unitOrder}_l${lessonOrder}`;

const getConceptId = (
	languageId: CoreA1LanguageId,
	unitKey: string,
	conceptKey: string
) => `${languageId}:${unitKey}:${conceptKey}`;

const unique = <T,>(items: T[]) => Array.from(new Set(items));

const getPhrase = (languageId: CoreA1LanguageId, phraseKey: PhraseKey) =>
	PHRASES[languageId][phraseKey];

const getPhraseValue = (languageId: CoreA1LanguageId, phraseKey: PhraseKey) =>
	getPhrase(languageId, phraseKey).value;

const getPhraseTranslation = (phraseKey: PhraseKey) => PHRASE_TRANSLATIONS[phraseKey];

const getWordBank = (
	languageId: CoreA1LanguageId,
	phraseKeys: PhraseKey[]
): WordBankOption[] =>
	unique(phraseKeys).map((phraseKey) => {
		const phrase = getPhrase(languageId, phraseKey);

		return {
			value: phrase.value,
			label: phrase.value,
			pronunciation: phrase.pronunciation,
			translation: getPhraseTranslation(phraseKey),
		};
	});

const rotate = <T,>(items: T[], amount: number) => {
	if (items.length === 0) return items;
	const offset = amount % items.length;
	return [...items.slice(offset), ...items.slice(0, offset)];
};

const getOptionPhraseKeys = (
	correctKey: PhraseKey,
	preferredKeys: PhraseKey[],
	seed: number,
	maxOptions = 4
) => {
	const options = unique([
		correctKey,
		...rotate(preferredKeys.filter((key) => key !== correctKey), seed),
		...rotate(Object.keys(PHRASE_TRANSLATIONS) as PhraseKey[], seed).filter(
			(key) => key !== correctKey
		),
	]).slice(0, maxOptions);

	return rotate(options, seed % maxOptions);
};

const getOptions = (
	languageId: CoreA1LanguageId,
	correctKey: PhraseKey,
	preferredKeys: PhraseKey[],
	seed: number
) =>
	getOptionPhraseKeys(correctKey, preferredKeys, seed).map((phraseKey) =>
		getPhraseValue(languageId, phraseKey)
	);

const formatPhraseSequence = (
	languageId: CoreA1LanguageId,
	phraseKeys: PhraseKey[]
) => {
	const values = phraseKeys.map((phraseKey) => getPhraseValue(languageId, phraseKey));

	if (languageId === "ja" || languageId === "ar") {
		return values.join(" ");
	}

	return values.join(", ");
};

const getConceptIds = (
	languageId: CoreA1LanguageId,
	unitTemplate: UnitTemplate,
	conceptKeys: string[] = []
) =>
	conceptKeys.map((conceptKey) =>
		getConceptId(languageId, unitTemplate.key, conceptKey)
	);

const buildExercise = (
	languageId: CoreA1LanguageId,
	unitTemplate: UnitTemplate,
	lessonTemplate: LessonTemplate,
	lessonId: string,
	exercise: Exercise
): Exercise => ({
	...exercise,
	lessonId,
	unitId: getUnitId(languageId, unitTemplate.order),
	languageId,
	cefrLevel: "A1",
	skillId: `${languageId}:${unitTemplate.key}`,
});

const buildLessonExercises = (
	languageId: CoreA1LanguageId,
	unitTemplate: UnitTemplate,
	lessonTemplate: LessonTemplate,
	lessonId: string,
	unitPhraseKeys: PhraseKey[]
): Exercise[] => {
	const [first, second, third, fourth, fifth, sixth] = lessonTemplate.phraseKeys;
	const usesScriptListeningTiles = languageId === "ja" || languageId === "ar";
	const lessonConceptIds = getConceptIds(languageId, unitTemplate, [
		...lessonTemplate.primaryConceptKeys,
		...(lessonTemplate.supportConceptKeys ?? []),
	]);
	const primaryConceptIds = getConceptIds(
		languageId,
		unitTemplate,
		lessonTemplate.primaryConceptKeys
	);
	const wordBank = getWordBank(languageId, unique([...lessonTemplate.phraseKeys, ...unitPhraseKeys]));
	const build = (exercise: Exercise) =>
		buildExercise(languageId, unitTemplate, lessonTemplate, lessonId, exercise);

	return [
		build({
			id: `${lessonId}_e1`,
			type: "mcq",
			question: `Which phrase means '${getPhraseTranslation(first)}'?`,
			options: getOptions(languageId, first, lessonTemplate.phraseKeys, 1),
			correctAnswer: getPhraseValue(languageId, first),
			conceptIds: [primaryConceptIds[0] ?? lessonConceptIds[0]],
			difficulty: "intro",
			estimatedSeconds: 12,
		}),
		build({
			id: `${lessonId}_e2`,
			type: "mcq",
			question: `How do you say '${getPhraseTranslation(second)}'?`,
			options: getOptions(languageId, second, lessonTemplate.phraseKeys, 2),
			correctAnswer: getPhraseValue(languageId, second),
			conceptIds: [primaryConceptIds[1] ?? primaryConceptIds[0] ?? lessonConceptIds[0]],
			difficulty: "intro",
			estimatedSeconds: 12,
		}),
		build({
			id: `${lessonId}_e3`,
			type: "fill-in-the-blank",
			question: `Choose the phrase for '${getPhraseTranslation(third)}'`,
			sentence: "___",
			correctAnswer: getPhraseValue(languageId, third),
			wordBank,
			conceptIds: [primaryConceptIds[0] ?? lessonConceptIds[0]],
			difficulty: "practice",
			estimatedSeconds: 18,
		}),
		build({
			id: `${lessonId}_e4`,
			type: "fill-in-the-blank",
			question: `Choose the phrase for '${getPhraseTranslation(fourth)}'`,
			sentence: "___",
			correctAnswer: getPhraseValue(languageId, fourth),
			wordBank,
			conceptIds: [primaryConceptIds[1] ?? primaryConceptIds[0] ?? lessonConceptIds[0]],
			difficulty: "practice",
			estimatedSeconds: 18,
		}),
		build({
			id: `${lessonId}_e5`,
			type: "matching-pairs",
			question: "Match the phrases with their meanings",
			pairs: lessonTemplate.phraseKeys.slice(0, 4).map((phraseKey, index) => ({
				id: `${lessonId}_p${index + 1}`,
				left: getPhraseValue(languageId, phraseKey),
				right: getPhraseTranslation(phraseKey),
			})),
			correctAnswer: "",
			conceptIds: lessonConceptIds,
			difficulty: "practice",
			estimatedSeconds: 28,
		}),
		build({
			id: `${lessonId}_e6`,
			type: "listen-type",
			question: usesScriptListeningTiles
				? "Listen and choose what you hear"
				: "Listen and type what you hear",
			correctAnswer: getPhraseValue(languageId, fifth),
			audioText: getPhraseValue(languageId, fifth),
			wordBank,
			conceptIds: lessonConceptIds,
			difficulty: "practice",
			estimatedSeconds: 22,
		}),
		build({
			id: `${lessonId}_e7`,
			type: "tap-word",
			question: `Select the phrase for '${getPhraseTranslation(sixth)}'`,
			options: getOptions(languageId, sixth, lessonTemplate.phraseKeys, 3),
			correctAnswer: getPhraseValue(languageId, sixth),
			conceptIds: lessonConceptIds,
			difficulty: "challenge",
			estimatedSeconds: 16,
		}),
		build({
			id: `${lessonId}_e8`,
			type: "mcq",
			question: `Challenge: translate '${getPhraseTranslation(sixth)}'`,
			options: getOptions(languageId, sixth, unitPhraseKeys, 4),
			correctAnswer: getPhraseValue(languageId, sixth),
			conceptIds: lessonConceptIds,
			difficulty: "challenge",
			estimatedSeconds: 18,
		}),
	];
};

const buildActivities = (
	languageId: CoreA1LanguageId,
	lessonTemplate: LessonTemplate,
	lessonId: string
) => {
	const [first, second, third] = lessonTemplate.phraseKeys;

	return [
		{
			id: `${lessonId}_a1`,
			lessonId,
			type: "multiple-choice" as const,
			question: `Which phrase means '${getPhraseTranslation(first)}'?`,
			options: getOptions(languageId, first, lessonTemplate.phraseKeys, 1),
			correctAnswer: getPhraseValue(languageId, first),
		},
		{
			id: `${lessonId}_a2`,
			lessonId,
			type: "translate" as const,
			question: `Translate: '${getPhraseValue(languageId, second)}'`,
			correctAnswer: getPhraseTranslation(second),
			translationContext: lessonTemplate.teachingFocus,
		},
		{
			id: `${lessonId}_a3`,
			lessonId,
			type: "vocabulary-match" as const,
			question: `Match '${getPhraseTranslation(third)}' to the right phrase.`,
			options: getOptions(languageId, third, lessonTemplate.phraseKeys, 2),
			correctAnswer: getPhraseValue(languageId, third),
		},
	];
};

const getUnitPhraseKeys = (unitTemplate: UnitTemplate) =>
	unique(unitTemplate.lessons.flatMap((lesson) => lesson.phraseKeys));

const buildCheckpointExercises = (
	languageId: CoreA1LanguageId,
	unitTemplate: UnitTemplate
): Exercise[] => {
	const unitId = getUnitId(languageId, unitTemplate.order);
	const checkpointAnswers = unitTemplate.checkpointSentences.map((sentence) =>
		formatPhraseSequence(languageId, sentence.phraseKeys)
	);

	return unitTemplate.checkpointSentences.slice(0, 5).map((sentence, index) => {
		const correctAnswer = checkpointAnswers[index];
		const distractors = rotate(
			checkpointAnswers.filter((answer) => answer !== correctAnswer),
			index
		).slice(0, 3);

		return {
			id: `${unitId}_cp_${index + 1}`,
			type: "mcq",
			question: `Translate the full sentence: '${sentence.english}'`,
			options: rotate([correctAnswer, ...distractors], index % 4),
			correctAnswer,
			conceptIds: getConceptIds(languageId, unitTemplate, sentence.conceptKeys),
			unitId,
			languageId,
			cefrLevel: "A1",
			difficulty: "challenge",
			estimatedSeconds: 24,
		};
	});
};

const buildUnit = (languageId: CoreA1LanguageId, unitTemplate: UnitTemplate): Unit => {
	const unitPhraseKeys = getUnitPhraseKeys(unitTemplate);
	const languageName = LANGUAGE_NAMES[languageId];

	return {
		id: getUnitId(languageId, unitTemplate.order),
		languageId,
		title: unitTemplate.title,
		description: `${unitTemplate.description} (${languageName} A1)`,
		order: unitTemplate.order,
		unitColor: unitTemplate.color,
		unitEmoji: unitTemplate.emoji,
		cefr: "A1",
		canDoGoal: unitTemplate.canDoGoal,
		targetVocabulary: unitPhraseKeys.map((phraseKey) => getPhraseValue(languageId, phraseKey)),
		grammarFocus: unitTemplate.grammarFocus,
		checkpointQuiz: {
			id: `${getUnitId(languageId, unitTemplate.order)}_checkpoint`,
			title: `${unitTemplate.title.replace(/^Unit \d+: /, "")} Checkpoint`,
			exercises: buildCheckpointExercises(languageId, unitTemplate),
		},
	};
};

const buildLesson = (
	languageId: CoreA1LanguageId,
	unitTemplate: UnitTemplate,
	lessonTemplate: LessonTemplate,
	lessonOrder: number
): Lesson => {
	const lessonId = getLessonId(languageId, unitTemplate.order, lessonOrder);
	const unitPhraseKeys = getUnitPhraseKeys(unitTemplate);
	const primaryConceptIds = getConceptIds(
		languageId,
		unitTemplate,
		lessonTemplate.primaryConceptKeys
	);
	const supportConceptIds = getConceptIds(
		languageId,
		unitTemplate,
		lessonTemplate.supportConceptKeys
	);

	return {
		id: lessonId,
		unitId: getUnitId(languageId, unitTemplate.order),
		title: lessonTemplate.title,
		description: lessonTemplate.description,
		type: lessonTemplate.type ?? "vocabulary",
		order: lessonOrder,
		xpReward: 10,
		durationMinutes: 4,
		goals: [
			lessonTemplate.canDoStatement,
			lessonTemplate.teachingFocus,
			`Practice ${lessonTemplate.phraseKeys.length} useful A1 phrases.`,
		],
		canDoStatement: lessonTemplate.canDoStatement,
		newConceptIds: primaryConceptIds,
		reviewConceptIds: supportConceptIds,
		teachingFocus: lessonTemplate.teachingFocus,
		activities: buildActivities(languageId, lessonTemplate, lessonId),
		exercises: buildLessonExercises(
			languageId,
			unitTemplate,
			lessonTemplate,
			lessonId,
			unitPhraseKeys
		),
	};
};

const buildConcept = (
	languageId: CoreA1LanguageId,
	unitTemplate: UnitTemplate,
	conceptTemplate: ConceptTemplate
): CurriculumConcept => {
	const phraseKeywords = conceptTemplate.phraseKeys.flatMap((phraseKey) => [
		getPhraseValue(languageId, phraseKey),
		getPhrase(languageId, phraseKey).pronunciation,
		getPhraseTranslation(phraseKey),
	]);

	return {
		id: getConceptId(languageId, unitTemplate.key, conceptTemplate.key),
		languageId,
		title: conceptTemplate.title,
		description: `${conceptTemplate.description} (${LANGUAGE_NAMES[languageId]} A1)`,
		type: conceptTemplate.type,
		skillArea: conceptTemplate.skillArea,
		cefrLevel: "A1",
		keywords: unique([...phraseKeywords, conceptTemplate.title]).map((keyword) =>
			keyword.normalize("NFKC").toLowerCase()
		),
		examples: conceptTemplate.phraseKeys
			.slice(0, 3)
			.map((phraseKey) => getPhraseValue(languageId, phraseKey)),
		whyItMatters: conceptTemplate.whyItMatters,
		reviewPrompt: conceptTemplate.reviewPrompt,
		commonMistakes: conceptTemplate.commonMistakes,
		explanationHint: conceptTemplate.explanationHint,
	};
};

const buildLessonPlan = (
	languageId: CoreA1LanguageId,
	unitTemplate: UnitTemplate,
	lessonTemplate: LessonTemplate,
	lessonOrder: number
): CurriculumLessonPlan => ({
	lessonId: getLessonId(languageId, unitTemplate.order, lessonOrder),
	unitId: getUnitId(languageId, unitTemplate.order),
	languageId,
	canDoStatement: lessonTemplate.canDoStatement,
	primaryConceptIds: getConceptIds(
		languageId,
		unitTemplate,
		lessonTemplate.primaryConceptKeys
	),
	supportConceptIds: getConceptIds(
		languageId,
		unitTemplate,
		lessonTemplate.supportConceptKeys
	),
	recommendedReviewAfterDays: unitTemplate.order <= 2 ? 1 : 2,
	teachingFocus: lessonTemplate.teachingFocus,
});

export const coreA1Units: Unit[] = CORE_A1_LANGUAGE_IDS.flatMap((languageId) =>
	UNIT_TEMPLATES.map((unitTemplate) => buildUnit(languageId, unitTemplate))
);

export const coreA1Lessons: Lesson[] = CORE_A1_LANGUAGE_IDS.flatMap((languageId) =>
	UNIT_TEMPLATES.flatMap((unitTemplate) =>
		unitTemplate.lessons.map((lessonTemplate, index) =>
			buildLesson(languageId, unitTemplate, lessonTemplate, index + 1)
		)
	)
);

export const coreA1Concepts: CurriculumConcept[] = CORE_A1_LANGUAGE_IDS.flatMap(
	(languageId) =>
		UNIT_TEMPLATES.flatMap((unitTemplate) =>
			unitTemplate.concepts.map((conceptTemplate) =>
				buildConcept(languageId, unitTemplate, conceptTemplate)
			)
		)
);

export const coreA1LessonPlans: CurriculumLessonPlan[] = CORE_A1_LANGUAGE_IDS.flatMap(
	(languageId) =>
		UNIT_TEMPLATES.flatMap((unitTemplate) =>
			unitTemplate.lessons.map((lessonTemplate, index) =>
				buildLessonPlan(languageId, unitTemplate, lessonTemplate, index + 1)
			)
		)
);
