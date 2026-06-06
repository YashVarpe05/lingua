import { getCurriculumFallbackLessonTemplate } from "@/data/curriculum";
import type {
	Exercise,
	ExerciseDifficultyBand,
	Lesson,
	WordBankOption,
} from "@/types/learning";

export type FillBlankOption = WordBankOption;

type BuildFillBlankOptionsInput = {
	exercise: Exercise;
	languageId?: string | null;
	lessons?: Lesson[];
	maxOptions?: number;
	difficultyBand?: ExerciseDifficultyBand;
};

type WordBankCandidate = FillBlankOption & {
	sourceRank: number;
	conceptOverlap: number;
	randomTie: number;
};

type CorePhrase = {
	value: string;
	pronunciation?: string;
	translation: string;
};

const CORE_WORD_BANKS: Record<string, CorePhrase[]> = {
	es: [
		{ value: "Hola", pronunciation: "OH-lah", translation: "Hello" },
		{ value: "Adi\u00F3s", pronunciation: "ah-DYOHS", translation: "Goodbye" },
		{ value: "Gracias", pronunciation: "GRAH-syahs", translation: "Thank you" },
		{ value: "Por favor", pronunciation: "por fah-VOR", translation: "Please" },
		{ value: "Por", pronunciation: "por", translation: "For / by" },
		{ value: "favor", pronunciation: "fah-VOR", translation: "favor" },
		{ value: "De nada", pronunciation: "deh NAH-dah", translation: "You're welcome" },
		{ value: "nada", pronunciation: "NAH-dah", translation: "nothing / welcome phrase" },
		{ value: "S\u00ED", pronunciation: "see", translation: "Yes" },
		{ value: "No", pronunciation: "noh", translation: "No" },
		{ value: "Me llamo", pronunciation: "meh YAH-moh", translation: "My name is" },
		{ value: "Agua", pronunciation: "AH-gwah", translation: "Water" },
		{ value: "men\u00FA", pronunciation: "meh-NOO", translation: "Menu" },
		{ value: "mesa", pronunciation: "MEH-sah", translation: "Table" },
		{ value: "comida", pronunciation: "koh-MEE-dah", translation: "Food" },
	],
	fr: [
		{ value: "Bonjour", pronunciation: "bohn-ZHOOR", translation: "Hello" },
		{ value: "Au revoir", pronunciation: "oh ruh-VWAHR", translation: "Goodbye" },
		{ value: "Merci", pronunciation: "mair-SEE", translation: "Thank you" },
		{ value: "S'il vous pla\u00EEt", pronunciation: "seel voo PLEH", translation: "Please" },
		{ value: "pla\u00EEt", pronunciation: "pleh", translation: "pleases" },
		{ value: "Oui", pronunciation: "wee", translation: "Yes" },
		{ value: "Non", pronunciation: "nohn", translation: "No" },
		{ value: "Je m'appelle", pronunciation: "zhuh mah-PELL", translation: "My name is" },
		{ value: "appelle", pronunciation: "ah-PELL", translation: "called" },
		{ value: "soir", pronunciation: "swahr", translation: "evening" },
		{ value: "Eau", pronunciation: "oh", translation: "Water" },
		{ value: "Menu", pronunciation: "muh-NOO", translation: "Menu" },
		{ value: "L'addition", pronunciation: "lah-dee-SYOHN", translation: "The bill" },
	],
	ja: [
		{ value: "\u3059\u307F\u307E\u305B\u3093", pronunciation: "sumimasen", translation: "Excuse me" },
		{ value: "\u3053\u3093\u306B\u3061\u306F", pronunciation: "konnichiwa", translation: "Hello" },
		{ value: "\u3042\u308A\u304C\u3068\u3046", pronunciation: "arigatou", translation: "Thank you" },
		{ value: "\u3055\u3088\u3046\u306A\u3089", pronunciation: "sayounara", translation: "Goodbye" },
		{ value: "\u306F\u3058\u3081\u307E\u3057\u3066", pronunciation: "hajimemashite", translation: "Nice to meet you" },
		{ value: "\u3067\u3059", pronunciation: "desu", translation: "I am / is" },
		{ value: "\u3088\u308D\u3057\u304F\u304A\u306D\u304C\u3044\u3057\u307E\u3059", pronunciation: "yoroshiku onegai shimasu", translation: "Goodwill close" },
		{ value: "\u304A\u540D\u524D\u306F", pronunciation: "o-namae wa", translation: "Your name?" },
		{ value: "\u304A\u5143\u6C17\u3067\u3059\u304B", pronunciation: "o-genki desu ka", translation: "How are you?" },
		{ value: "\u3053\u308C\u3092\u304F\u3060\u3055\u3044", pronunciation: "kore o kudasai", translation: "This, please" },
	],
	ar: [
		{ value: "\u0645\u0631\u062D\u0628\u0627", pronunciation: "marhaba", translation: "Hello" },
		{ value: "\u0645\u0639 \u0627\u0644\u0633\u0644\u0627\u0645\u0629", pronunciation: "ma'a salama", translation: "Goodbye" },
		{ value: "\u0634\u0643\u0631\u0627", pronunciation: "shukran", translation: "Thank you" },
		{ value: "\u0645\u0646 \u0641\u0636\u0644\u0643", pronunciation: "min fadlak", translation: "Please" },
		{ value: "\u0646\u0639\u0645", pronunciation: "na'am", translation: "Yes" },
		{ value: "\u0644\u0627", pronunciation: "la", translation: "No" },
		{ value: "\u0627\u0633\u0645\u064A", pronunciation: "ismi", translation: "My name is" },
		{ value: "\u0645\u0627\u0621", pronunciation: "ma", translation: "Water" },
		{ value: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0637\u0639\u0627\u0645", pronunciation: "qa'imat al-ta'am", translation: "Menu" },
		{ value: "\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629", pronunciation: "al-fatura", translation: "The bill" },
	],
	de: [
		{ value: "Hallo", pronunciation: "HAH-loh", translation: "Hello" },
		{ value: "Auf Wiedersehen", pronunciation: "owf VEE-der-zayn", translation: "Goodbye" },
		{ value: "Danke", pronunciation: "DAHN-kuh", translation: "Thank you" },
		{ value: "Bitte", pronunciation: "BIT-tuh", translation: "Please" },
		{ value: "Ja", pronunciation: "yah", translation: "Yes" },
		{ value: "Nein", pronunciation: "nine", translation: "No" },
		{ value: "Ich hei\u00DFe", pronunciation: "ikh HIGH-suh", translation: "My name is" },
		{ value: "Wasser", pronunciation: "VAH-ser", translation: "Water" },
		{ value: "Speisekarte", pronunciation: "SHPIE-zuh-kar-tuh", translation: "Menu" },
		{ value: "Rechnung", pronunciation: "REKH-noong", translation: "The bill" },
	],
	it: [
		{ value: "Ciao", pronunciation: "chow", translation: "Hello / goodbye" },
		{ value: "Arrivederci", pronunciation: "ah-ree-veh-DER-chee", translation: "Goodbye" },
		{ value: "Grazie", pronunciation: "GRAHT-see-eh", translation: "Thank you" },
		{ value: "Per favore", pronunciation: "per fah-VOH-reh", translation: "Please" },
		{ value: "S\u00EC", pronunciation: "see", translation: "Yes" },
		{ value: "No", pronunciation: "noh", translation: "No" },
		{ value: "Mi chiamo", pronunciation: "mee KYAH-moh", translation: "My name is" },
		{ value: "Acqua", pronunciation: "AHK-kwah", translation: "Water" },
		{ value: "Men\u00F9", pronunciation: "meh-NOO", translation: "Menu" },
		{ value: "Il conto", pronunciation: "eel KOHN-toh", translation: "The bill" },
	],
	pt: [
		{ value: "Ol\u00E1", pronunciation: "oh-LAH", translation: "Hello" },
		{ value: "Adeus", pronunciation: "ah-DEH-oosh", translation: "Goodbye" },
		{ value: "Obrigado", pronunciation: "oh-bree-GAH-doo", translation: "Thank you" },
		{ value: "Por favor", pronunciation: "por fah-VOR", translation: "Please" },
		{ value: "Sim", pronunciation: "seeng", translation: "Yes" },
		{ value: "N\u00E3o", pronunciation: "now", translation: "No" },
		{ value: "Meu nome \u00E9", pronunciation: "meu NOH-mee eh", translation: "My name is" },
		{ value: "\u00C1gua", pronunciation: "AH-gwah", translation: "Water" },
		{ value: "Card\u00E1pio", pronunciation: "kar-DAH-pyoh", translation: "Menu" },
		{ value: "A conta", pronunciation: "ah KOHN-tah", translation: "The bill" },
	],
	"pt-PT": [
		{ value: "Ol\u00E1", pronunciation: "oh-LAH", translation: "Hello" },
		{ value: "Adeus", pronunciation: "ah-DEH-oosh", translation: "Goodbye" },
		{ value: "Obrigado", pronunciation: "oh-bree-GAH-doo", translation: "Thank you" },
		{ value: "Por favor", pronunciation: "por fah-VOR", translation: "Please" },
		{ value: "Sim", pronunciation: "seeng", translation: "Yes" },
		{ value: "N\u00E3o", pronunciation: "now", translation: "No" },
		{ value: "Chamo-me", pronunciation: "SHAH-moo muh", translation: "My name is" },
		{ value: "\u00C1gua", pronunciation: "AH-gwah", translation: "Water" },
		{ value: "Ementa", pronunciation: "eh-MEN-tah", translation: "Menu" },
		{ value: "A conta", pronunciation: "ah KOHN-tah", translation: "The bill" },
	],
	ru: [
		{ value: "\u041F\u0440\u0438\u0432\u0435\u0442", pronunciation: "privet", translation: "Hello" },
		{ value: "\u0414\u043E \u0441\u0432\u0438\u0434\u0430\u043D\u0438\u044F", pronunciation: "do svidaniya", translation: "Goodbye" },
		{ value: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E", pronunciation: "spasibo", translation: "Thank you" },
		{ value: "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430", pronunciation: "pozhaluysta", translation: "Please" },
		{ value: "\u0414\u0430", pronunciation: "da", translation: "Yes" },
		{ value: "\u041D\u0435\u0442", pronunciation: "net", translation: "No" },
		{ value: "\u041C\u0435\u043D\u044F \u0437\u043E\u0432\u0443\u0442", pronunciation: "menya zovut", translation: "My name is" },
		{ value: "\u0412\u043E\u0434\u0430", pronunciation: "voda", translation: "Water" },
		{ value: "\u041C\u0435\u043D\u044E", pronunciation: "menyu", translation: "Menu" },
		{ value: "\u0421\u0447\u0451\u0442", pronunciation: "schyot", translation: "The bill" },
	],
	zh: [
		{ value: "\u4F60\u597D", pronunciation: "ni hao", translation: "Hello" },
		{ value: "\u518D\u89C1", pronunciation: "zai jian", translation: "Goodbye" },
		{ value: "\u8C22\u8C22", pronunciation: "xie xie", translation: "Thank you" },
		{ value: "\u8BF7", pronunciation: "qing", translation: "Please" },
		{ value: "\u662F", pronunciation: "shi", translation: "Yes" },
		{ value: "\u4E0D", pronunciation: "bu", translation: "No" },
		{ value: "\u6211\u53EB", pronunciation: "wo jiao", translation: "My name is" },
		{ value: "\u6C34", pronunciation: "shui", translation: "Water" },
		{ value: "\u83DC\u5355", pronunciation: "cai dan", translation: "Menu" },
		{ value: "\u8D26\u5355", pronunciation: "zhang dan", translation: "The bill" },
	],
	ko: [
		{ value: "\uC548\uB155\uD558\uC138\uC694", pronunciation: "annyeonghaseyo", translation: "Hello" },
		{ value: "\uC548\uB155\uD788 \uAC00\uC138\uC694", pronunciation: "annyeonghi gaseyo", translation: "Goodbye" },
		{ value: "\uAC10\uC0AC\uD569\uB2C8\uB2E4", pronunciation: "gamsahamnida", translation: "Thank you" },
		{ value: "\uC8FC\uC138\uC694", pronunciation: "juseyo", translation: "Please" },
		{ value: "\uB124", pronunciation: "ne", translation: "Yes" },
		{ value: "\uC544\uB2C8\uC694", pronunciation: "aniyo", translation: "No" },
		{ value: "\uC81C \uC774\uB984\uC740", pronunciation: "je ireumeun", translation: "My name is" },
		{ value: "\uBB3C", pronunciation: "mul", translation: "Water" },
		{ value: "\uBA54\uB274", pronunciation: "menyu", translation: "Menu" },
		{ value: "\uACC4\uC0B0\uC11C", pronunciation: "gyesanseo", translation: "The bill" },
	],
	hi: [
		{ value: "\u0928\u092E\u0938\u094D\u0924\u0947", pronunciation: "namaste", translation: "Hello" },
		{ value: "\u0905\u0932\u0935\u093F\u0926\u093E", pronunciation: "alvida", translation: "Goodbye" },
		{ value: "\u0927\u0928\u094D\u092F\u0935\u093E\u0926", pronunciation: "dhanyavaad", translation: "Thank you" },
		{ value: "\u0915\u0943\u092A\u092F\u093E", pronunciation: "kripaya", translation: "Please" },
		{ value: "\u0939\u093E\u0901", pronunciation: "haan", translation: "Yes" },
		{ value: "\u0928\u0939\u0940\u0902", pronunciation: "nahin", translation: "No" },
		{ value: "\u092E\u0947\u0930\u093E \u0928\u093E\u092E", pronunciation: "mera naam", translation: "My name is" },
		{ value: "\u092A\u093E\u0928\u0940", pronunciation: "pani", translation: "Water" },
		{ value: "\u092E\u0947\u0928\u094D\u092F\u0942", pronunciation: "menu", translation: "Menu" },
		{ value: "\u092C\u093F\u0932", pronunciation: "bill", translation: "The bill" },
	],
	nl: [
		{ value: "Hallo", pronunciation: "HAH-loh", translation: "Hello" },
		{ value: "Tot ziens", pronunciation: "tot zeens", translation: "Goodbye" },
		{ value: "Dank je", pronunciation: "dahnk yuh", translation: "Thank you" },
		{ value: "Alstublieft", pronunciation: "AHL-stu-bleeft", translation: "Please" },
		{ value: "Ja", pronunciation: "yah", translation: "Yes" },
		{ value: "Nee", pronunciation: "nay", translation: "No" },
		{ value: "Ik heet", pronunciation: "ik hayt", translation: "My name is" },
		{ value: "Water", pronunciation: "VAH-ter", translation: "Water" },
		{ value: "Menu", pronunciation: "muh-NOO", translation: "Menu" },
		{ value: "De rekening", pronunciation: "duh RAY-kuh-ning", translation: "The bill" },
	],
	sv: [
		{ value: "Hej", pronunciation: "hey", translation: "Hello" },
		{ value: "Hej d\u00E5", pronunciation: "hey doh", translation: "Goodbye" },
		{ value: "Tack", pronunciation: "tahk", translation: "Thank you" },
		{ value: "Sn\u00E4lla", pronunciation: "SNELL-ah", translation: "Please" },
		{ value: "Ja", pronunciation: "yah", translation: "Yes" },
		{ value: "Nej", pronunciation: "nay", translation: "No" },
		{ value: "Jag heter", pronunciation: "yah HAY-ter", translation: "My name is" },
		{ value: "Vatten", pronunciation: "VAH-ten", translation: "Water" },
		{ value: "Meny", pronunciation: "meh-NEE", translation: "Menu" },
		{ value: "Notan", pronunciation: "NOO-tan", translation: "The bill" },
	],
	fi: [
		{ value: "Hei", pronunciation: "hey", translation: "Hello" },
		{ value: "N\u00E4kemiin", pronunciation: "NA-keh-meen", translation: "Goodbye" },
		{ value: "Kiitos", pronunciation: "KEE-tos", translation: "Thank you" },
		{ value: "Ole hyv\u00E4", pronunciation: "OH-leh HUU-va", translation: "Please" },
		{ value: "Kyll\u00E4", pronunciation: "KUUL-la", translation: "Yes" },
		{ value: "Ei", pronunciation: "ay", translation: "No" },
		{ value: "Minun nimeni on", pronunciation: "MEE-noon NEE-meh-nee on", translation: "My name is" },
		{ value: "Vesi", pronunciation: "VEH-see", translation: "Water" },
		{ value: "Ruokalista", pronunciation: "ROO-oh-kah-lis-tah", translation: "Menu" },
		{ value: "Lasku", pronunciation: "LAHS-koo", translation: "The bill" },
	],
	tr: [
		{ value: "Merhaba", pronunciation: "mehr-hah-BAH", translation: "Hello" },
		{ value: "Ho\u015F\u00E7a kal", pronunciation: "hosh-cha kal", translation: "Goodbye" },
		{ value: "Te\u015Fekk\u00FCrler", pronunciation: "teh-shek-KOOR-ler", translation: "Thank you" },
		{ value: "L\u00FCtfen", pronunciation: "LOOT-fen", translation: "Please" },
		{ value: "Evet", pronunciation: "eh-VET", translation: "Yes" },
		{ value: "Hay\u0131r", pronunciation: "HAH-yuhr", translation: "No" },
		{ value: "Benim ad\u0131m", pronunciation: "beh-NEEM ah-DUHM", translation: "My name is" },
		{ value: "Su", pronunciation: "soo", translation: "Water" },
		{ value: "Men\u00FC", pronunciation: "meh-NOO", translation: "Menu" },
		{ value: "Hesap", pronunciation: "heh-SAHP", translation: "The bill" },
	],
	id: [
		{ value: "Halo", pronunciation: "HAH-loh", translation: "Hello" },
		{ value: "Selamat tinggal", pronunciation: "seh-LAH-maht TING-gahl", translation: "Goodbye" },
		{ value: "Terima kasih", pronunciation: "teh-REE-mah KAH-see", translation: "Thank you" },
		{ value: "Tolong", pronunciation: "TOH-long", translation: "Please" },
		{ value: "Ya", pronunciation: "yah", translation: "Yes" },
		{ value: "Tidak", pronunciation: "TEE-dahk", translation: "No" },
		{ value: "Nama saya", pronunciation: "NAH-mah SAH-yah", translation: "My name is" },
		{ value: "Air", pronunciation: "ah-EER", translation: "Water" },
		{ value: "Menu", pronunciation: "MEH-noo", translation: "Menu" },
		{ value: "Tagihan", pronunciation: "tah-GEE-han", translation: "The bill" },
	],
	th: [
		{ value: "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35", pronunciation: "sawasdee", translation: "Hello" },
		{ value: "\u0E25\u0E32\u0E01\u0E48\u0E2D\u0E19", pronunciation: "la gon", translation: "Goodbye" },
		{ value: "\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13", pronunciation: "khop khun", translation: "Thank you" },
		{ value: "\u0E01\u0E23\u0E38\u0E13\u0E32", pronunciation: "karuna", translation: "Please" },
		{ value: "\u0E43\u0E0A\u0E48", pronunciation: "chai", translation: "Yes" },
		{ value: "\u0E44\u0E21\u0E48", pronunciation: "mai", translation: "No" },
		{ value: "\u0E09\u0E31\u0E19\u0E0A\u0E37\u0E48\u0E2D", pronunciation: "chan chue", translation: "My name is" },
		{ value: "\u0E19\u0E49\u0E33", pronunciation: "nam", translation: "Water" },
		{ value: "\u0E40\u0E21\u0E19\u0E39", pronunciation: "menu", translation: "Menu" },
		{ value: "\u0E1A\u0E34\u0E25", pronunciation: "bin", translation: "The bill" },
	],
	vi: [
		{ value: "Xin ch\u00E0o", pronunciation: "sin chow", translation: "Hello" },
		{ value: "T\u1EA1m bi\u1EC7t", pronunciation: "tahm byet", translation: "Goodbye" },
		{ value: "C\u1EA3m \u01A1n", pronunciation: "gahm uhn", translation: "Thank you" },
		{ value: "L\u00E0m \u01A1n", pronunciation: "lahm uhn", translation: "Please" },
		{ value: "C\u00F3", pronunciation: "gaw", translation: "Yes" },
		{ value: "Kh\u00F4ng", pronunciation: "khom", translation: "No" },
		{ value: "T\u00F4i t\u00EAn l\u00E0", pronunciation: "toy ten lah", translation: "My name is" },
		{ value: "N\u01B0\u1EDBc", pronunciation: "nuoc", translation: "Water" },
		{ value: "Th\u1EF1c \u0111\u01A1n", pronunciation: "thuc don", translation: "Menu" },
		{ value: "H\u00F3a \u0111\u01A1n", pronunciation: "hoa don", translation: "The bill" },
	],
	pl: [
		{ value: "Cze\u015B\u0107", pronunciation: "cheshch", translation: "Hello" },
		{ value: "Do widzenia", pronunciation: "doh vee-DZEN-yah", translation: "Goodbye" },
		{ value: "Dzi\u0119kuj\u0119", pronunciation: "jen-KOO-yeh", translation: "Thank you" },
		{ value: "Prosz\u0119", pronunciation: "PROH-sheh", translation: "Please" },
		{ value: "Tak", pronunciation: "tahk", translation: "Yes" },
		{ value: "Nie", pronunciation: "nyeh", translation: "No" },
		{ value: "Mam na imi\u0119", pronunciation: "mam nah EE-myeh", translation: "My name is" },
		{ value: "Woda", pronunciation: "VOH-dah", translation: "Water" },
		{ value: "Menu", pronunciation: "MEH-noo", translation: "Menu" },
		{ value: "Rachunek", pronunciation: "rah-HOO-nek", translation: "The bill" },
	],
	uk: [
		{ value: "\u041F\u0440\u0438\u0432\u0456\u0442", pronunciation: "pryvit", translation: "Hello" },
		{ value: "\u0414\u043E \u043F\u043E\u0431\u0430\u0447\u0435\u043D\u043D\u044F", pronunciation: "do pobachennya", translation: "Goodbye" },
		{ value: "\u0414\u044F\u043A\u0443\u044E", pronunciation: "dyakuyu", translation: "Thank you" },
		{ value: "\u0411\u0443\u0434\u044C \u043B\u0430\u0441\u043A\u0430", pronunciation: "bud laska", translation: "Please" },
		{ value: "\u0422\u0430\u043A", pronunciation: "tak", translation: "Yes" },
		{ value: "\u041D\u0456", pronunciation: "ni", translation: "No" },
		{ value: "\u041C\u0435\u043D\u0435 \u0437\u0432\u0430\u0442\u0438", pronunciation: "mene zvaty", translation: "My name is" },
		{ value: "\u0412\u043E\u0434\u0430", pronunciation: "voda", translation: "Water" },
		{ value: "\u041C\u0435\u043D\u044E", pronunciation: "menyu", translation: "Menu" },
		{ value: "\u0420\u0430\u0445\u0443\u043D\u043E\u043A", pronunciation: "rakhunok", translation: "The bill" },
	],
};

const SCRIPT_HEAVY_LANGUAGES = new Set([
	"ar",
	"hi",
	"ja",
	"ko",
	"ru",
	"th",
	"uk",
	"zh",
]);

const FALLBACK_TRANSLATIONS: [
	keyof ReturnType<typeof getCurriculumFallbackLessonTemplate>["phrases"],
	string,
][] = [
	["hello", "Hello"],
	["goodbye", "Goodbye"],
	["thanks", "Thank you"],
	["please", "Please"],
	["yes", "Yes"],
	["no", "No"],
	["intro", "My name is / introduction"],
	["water", "Water"],
	["menu", "Menu"],
	["bill", "The bill"],
];

const normalizeKey = (value: string) =>
	value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

const hasNonAscii = (value: string) => /[^\x00-\x7F]/.test(value);

const isAsciiOnly = (value: string) => /^[\x00-\x7F]+$/.test(value);

const shuffleItems = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const getCoreOptions = (languageId?: string | null): FillBlankOption[] =>
	(CORE_WORD_BANKS[languageId ?? ""] ?? []).map((option) => ({
		value: option.value,
		label: option.value,
		pronunciation: option.pronunciation,
		translation: option.translation,
	}));

const getFallbackPhraseOptions = (languageId?: string | null): FillBlankOption[] => {
	if (!languageId) return [];

	const template = getCurriculumFallbackLessonTemplate(languageId, languageId, 1);

	return FALLBACK_TRANSLATIONS.map(([key, translation]) => {
		const value = template.phrases[key];
		const knownOption = findKnownOption(value, languageId);

		return {
			value,
			label: knownOption?.label ?? value,
			pronunciation: knownOption?.pronunciation ?? value,
			translation: knownOption?.translation ?? translation,
		};
	});
};

const findKnownOption = (value: string, languageId?: string | null) => {
	const parsed = parseLabelAndPronunciation(value);
	const candidates = [
		...getCoreOptions(languageId),
		...Object.values(CORE_WORD_BANKS).flatMap((options) =>
			options.map((option) => ({
				value: option.value,
				label: option.value,
				pronunciation: option.pronunciation,
				translation: option.translation,
			}))
		),
	];
	const normalizedValues = new Set([
		normalizeKey(value),
		normalizeKey(parsed.label),
	]);

	return candidates.find((option) => normalizedValues.has(normalizeKey(option.value)));
};

const parseLabelAndPronunciation = (value: string) => {
	const parenthetical = value.match(/^(.+?)\s*\(([^)]+)\)\s*$/);

	if (!parenthetical) {
		return {
			label: value,
			pronunciation: "",
		};
	}

	return {
		label: parenthetical[1].trim(),
		pronunciation: parenthetical[2].trim(),
	};
};

const extractPromptTranslation = (question?: string) => {
	if (!question) return "";

	const quoted = question.match(/['"]([^'"]+)['"]/);
	return quoted?.[1]?.trim() ?? "";
};

export const getFillBlankPronunciation = (
	value: string,
	languageId?: string | null
) => {
	if (!value) return "";

	const parsed = parseLabelAndPronunciation(value);
	const knownOption = findKnownOption(value, languageId);

	return parsed.pronunciation || knownOption?.pronunciation || "";
};

const toFillBlankOption = (
	option: string | FillBlankOption,
	languageId?: string | null,
	inferredTranslation?: string
): FillBlankOption => {
	if (typeof option !== "string") {
		const knownOption = findKnownOption(option.value, languageId);
		const rawPronunciation = option.pronunciation;
		const pronunciationRepeatsLabel =
			rawPronunciation &&
			(normalizeKey(rawPronunciation) === normalizeKey(option.value) ||
				normalizeKey(rawPronunciation) === normalizeKey(option.label ?? ""));
		const enrichedPronunciation = pronunciationRepeatsLabel
			? knownOption?.pronunciation
			: rawPronunciation ??
				knownOption?.pronunciation ??
				getFillBlankPronunciation(option.value, languageId);

		return {
			...option,
			label: option.label ?? knownOption?.label ?? option.value,
			pronunciation: enrichedPronunciation,
			translation: option.translation ?? knownOption?.translation ?? inferredTranslation,
		};
	}

	const parsed = parseLabelAndPronunciation(option);
	const knownOption = findKnownOption(option, languageId);

	return {
		value: option,
		label: parsed.label || knownOption?.label || option,
		pronunciation:
			parsed.pronunciation ||
			knownOption?.pronunciation ||
			getFillBlankPronunciation(option, languageId),
		translation: knownOption?.translation ?? inferredTranslation,
	};
};

const getExerciseCandidates = (
	exercise: Exercise,
	languageId: string | null | undefined,
	sourceRank: number
): WordBankCandidate[] => {
	const values: (string | FillBlankOption)[] = [
		...(exercise.wordBank ?? []),
		...(exercise.options ?? []),
	];

	if (exercise.type === "matching-pairs") {
		values.push(...(exercise.pairs ?? []).map((pair) => pair.left));
	}

	if (exercise.type === "fill-in-the-blank" || exercise.type === "listen-type") {
		values.push(exercise.correctAnswer);
	}

	const conceptIds = new Set(exercise.conceptIds ?? []);

	return values
		.filter((value) =>
			typeof value === "string"
				? value.trim().length > 0
				: value.value.trim().length > 0
		)
		.map((value) => ({
			...toFillBlankOption(value, languageId),
			sourceRank,
			conceptOverlap: conceptIds.size,
			randomTie: Math.random(),
		}));
};

const getLessonForExercise = (exercise: Exercise, lessons: Lesson[]) => {
	if (exercise.lessonId) {
		const exactLesson = lessons.find((lesson) => lesson.id === exercise.lessonId);
		if (exactLesson) return exactLesson;
	}

	return lessons.find((lesson) =>
		(lesson.exercises ?? []).some((lessonExercise) => lessonExercise.id === exercise.id)
	);
};

const collectLessonCandidates = (
	input: BuildFillBlankOptionsInput,
	currentLesson?: Lesson
) => {
	const exerciseConceptIds = new Set(input.exercise.conceptIds ?? []);
	const lessons = input.lessons ?? [];

	return lessons.flatMap((lesson) => {
		const lessonRank = lesson.id === currentLesson?.id ? 72 : 44;

		return (lesson.exercises ?? []).flatMap((lessonExercise) => {
			const sharedConceptCount = (lessonExercise.conceptIds ?? []).filter((conceptId) =>
				exerciseConceptIds.has(conceptId)
			).length;
			const conceptBoost = sharedConceptCount * 8;

			return getExerciseCandidates(
				lessonExercise,
				input.languageId,
				lessonRank + conceptBoost
			).map((candidate) => ({
				...candidate,
				conceptOverlap: sharedConceptCount,
			}));
		});
	});
};

const applyHintVisibility = (
	option: FillBlankOption,
	languageId?: string | null,
	difficultyBand?: ExerciseDifficultyBand
): FillBlankOption => {
	const isChallenge = difficultyBand === "challenge";
	const keepPronunciation =
		!isChallenge || SCRIPT_HEAVY_LANGUAGES.has(languageId ?? "");

	return {
		...option,
		pronunciation: keepPronunciation ? option.pronunciation : undefined,
		translation: isChallenge ? undefined : option.translation,
	};
};

const dedupeCandidates = (candidates: WordBankCandidate[]) => {
	const byValue = new Map<string, WordBankCandidate>();

	candidates.forEach((candidate) => {
		const key = normalizeKey(candidate.label ?? candidate.value);
		const existing = byValue.get(key);
		const score =
			candidate.sourceRank * 100 +
			candidate.conceptOverlap * 10 +
			(candidate.translation ? 2 : 0) +
			(candidate.pronunciation ? 1 : 0);
		const existingScore = existing
			? existing.sourceRank * 100 +
				existing.conceptOverlap * 10 +
				(existing.translation ? 2 : 0) +
				(existing.pronunciation ? 1 : 0)
			: -1;

		if (!existing || score > existingScore) {
			byValue.set(key, candidate);
		}
	});

	return Array.from(byValue.values());
};

export const buildFillBlankOptions = ({
	exercise,
	languageId,
	lessons = [],
	maxOptions = 6,
	difficultyBand,
}: BuildFillBlankOptionsInput) => {
	const promptTranslation = extractPromptTranslation(exercise.question);
	const explicitWordBank = exercise.wordBank ?? [];
	const providedCorrect = explicitWordBank.find(
		(option) => normalizeKey(option.value) === normalizeKey(exercise.correctAnswer)
	);
	const correctOption: FillBlankOption = toFillBlankOption(
		providedCorrect ?? exercise.correctAnswer,
		languageId,
		promptTranslation
	);
	const acceptedKeys = new Set(
		[exercise.correctAnswer, ...(exercise.acceptedAnswers ?? [])].map(normalizeKey)
	);
	const currentLesson = getLessonForExercise(exercise, lessons);
	const coreOptions = getCoreOptions(languageId);
	const preferTargetScript =
		SCRIPT_HEAVY_LANGUAGES.has(languageId ?? "") && hasNonAscii(exercise.correctAnswer);
	const directCandidates: WordBankCandidate[] = [
		...explicitWordBank.map((option) => ({
			...toFillBlankOption(option, languageId),
			sourceRank: 100,
			conceptOverlap: exercise.conceptIds?.length ?? 0,
			randomTie: Math.random(),
		})),
		...(exercise.options ?? []).map((option) => ({
			...toFillBlankOption(option, languageId),
			sourceRank: 92,
			conceptOverlap: exercise.conceptIds?.length ?? 0,
			randomTie: Math.random(),
		})),
	];
	const fallbackCandidates: WordBankCandidate[] = [
		...(coreOptions.length ? coreOptions : getFallbackPhraseOptions(languageId)),
	].map((option) => ({
		...option,
		sourceRank: 32,
		conceptOverlap: 0,
		randomTie: Math.random(),
	}));
	const candidates = dedupeCandidates([
		...directCandidates,
		...collectLessonCandidates({ exercise, languageId, lessons }, currentLesson),
		...fallbackCandidates,
	]);
	const distractors = candidates
		.filter((option) => {
			const key = normalizeKey(option.value);
			const labelKey = normalizeKey(option.label ?? option.value);

			if (acceptedKeys.has(key)) return false;
			if (acceptedKeys.has(labelKey)) return false;
			if (!option.value.trim()) return false;
			if (option.value.length > 42 && option.sourceRank < 90) return false;
			if (preferTargetScript && option.sourceRank < 90 && isAsciiOnly(option.value)) {
				return false;
			}

			return true;
		})
		.sort((a, b) => {
			const sourceDiff = b.sourceRank - a.sourceRank;
			if (sourceDiff !== 0) return sourceDiff;

			const conceptDiff = b.conceptOverlap - a.conceptOverlap;
			if (conceptDiff !== 0) return conceptDiff;

			return b.randomTie - a.randomTie;
		})
		.slice(0, Math.max(maxOptions - 1, 0));

	return shuffleItems([correctOption, ...distractors]).map((option) =>
		applyHintVisibility(option, languageId, difficultyBand)
	);
};
