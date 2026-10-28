/**
 * Waifu quiz questions. Answering correctly pays Royal Tokens, the currency
 * reserved for quest and quiz rewards.
 *
 * Every question is authored against a specific waifu's own series and details,
 * so the answer is checkable from the game's own data (and the anime it comes
 * from). Questions are grouped by series; a quiz round draws from the series of
 * the waifu being quizzed.
 */

export interface QuizQuestion {
  id: string;
  /** Series this question belongs to. */
  series: string;
  prompt: string;
  choices: string[];
  /** Index into `choices`. */
  answer: number;
  /** Shown after answering, right or wrong. */
  explain: string;
  /** Royal Tokens paid on a first correct answer. */
  reward: number;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ── Attack on Titan ──
  {
    id: 'aot-1',
    series: 'Attack on Titan',
    prompt: 'What branch of the military does Mikasa serve in?',
    choices: ['The Survey Corps', 'The Military Police', 'The Garrison', 'The Cadet Corps'],
    answer: 0,
    explain: 'Mikasa enlists with the Survey Corps to stay close to Eren.',
    reward: 40,
  },
  {
    id: 'aot-2',
    series: 'Attack on Titan',
    prompt: 'What is Mikasa\'s signature scarf made from?',
    choices: ['Wool', 'The scarf Eren gave her', 'Silk from the interior', 'Her mother\'s shawl'],
    answer: 1,
    explain: 'Eren wraps her in his scarf the day he rescues her.',
    reward: 40,
  },
  {
    id: 'aot-3',
    series: 'Attack on Titan',
    prompt: 'Which of these is Armin\'s greatest strength?',
    choices: ['Raw strength', 'Titan shifting', 'Strategy and planning', 'Swordsmanship'],
    answer: 2,
    explain: 'Armin is the Survey Corps\' strategist, not its strongest fighter.',
    reward: 40,
  },
  {
    id: 'aot-4',
    series: 'Attack on Titan',
    prompt: 'What title does Historia hold?',
    choices: ['Captain', 'The true queen of the walls', 'Commander', 'Squad leader'],
    answer: 1,
    explain: 'Historia is revealed as the legitimate heir to the throne.',
    reward: 45,
  },

  // ── Re:Zero ──
  {
    id: 'rezero-1',
    series: 'Re:Zero',
    prompt: 'What colour is Rem\'s hair?',
    choices: ['Pink', 'Sky blue', 'Silver', 'Blonde'],
    answer: 1,
    explain: 'Rem has sky-blue hair; her twin sister Ram\'s is pink.',
    reward: 40,
  },
  {
    id: 'rezero-2',
    series: 'Re:Zero',
    prompt: 'Rem and Ram are twins. Which one is the elder?',
    choices: ['Rem', 'Ram', 'They are the same age exactly', 'Neither, they are cousins'],
    answer: 1,
    explain: 'Ram is the elder twin, which she reminds Rem of often.',
    reward: 40,
  },
  {
    id: 'rezero-3',
    series: 'Re:Zero',
    prompt: 'What does Rem lose that her sister keeps?',
    choices: ['Her memory', 'Her horn', 'Her sight', 'Her magic'],
    answer: 1,
    explain: 'Rem loses her horn as a child; Ram lost hers earlier.',
    reward: 45,
  },
  {
    id: 'rezero-4',
    series: 'Re:Zero',
    prompt: 'Emilia is a candidate for what?',
    choices: ['The throne of Lugunica', 'Captain of the guard', 'Head of the manor', 'Guild master'],
    answer: 0,
    explain: 'Emilia is one of the royal candidates for the throne.',
    reward: 45,
  },
  {
    id: 'rezero-5',
    series: 'Re:Zero',
    prompt: 'What kind of spirit is contracted to Emilia?',
    choices: ['A fire spirit', 'A cat-like spirit named Puck', 'A dragon', 'A sword spirit'],
    answer: 1,
    explain: 'Puck is Emilia\'s contracted spirit and constant companion.',
    reward: 50,
  },
  {
    id: 'rezero-6',
    series: 'Re:Zero',
    prompt: 'Which family does Rem serve as a maid?',
    choices: ['The Mathers', 'The Lugunicas', 'The Roswaals', 'The Astreas'],
    answer: 2,
    explain: 'Rem and Ram are maids of the Roswaal mansion.',
    reward: 40,
  },

  // ── Darling in the Franxx ──
  {
    id: 'franxx-1',
    series: 'Darling in the Franxx',
    prompt: 'What is the name of the Franxx unit Zero Two pilots?',
    choices: ['Strelizia', 'Delphinium', 'Genista', 'Chlorophytum'],
    answer: 0,
    explain: 'Zero Two pilots Strelizia, initially with Hiro as her partner.',
    reward: 45,
  },
  {
    id: 'franxx-2',
    series: 'Darling in the Franxx',
    prompt: 'What nickname does Zero Two use for her partner?',
    choices: ['Senpai', 'Darling', 'Captain', 'Mister'],
    answer: 1,
    explain: 'Zero Two calls her partner "darling".',
    reward: 40,
  },
  {
    id: 'franxx-3',
    series: 'Darling in the Franxx',
    prompt: 'What are the children at the Plantation raised to become?',
    choices: ['Engineers', 'Franxx pilots', 'Doctors', 'Teachers'],
    answer: 1,
    explain: 'The children are bred and trained to pilot Franxx.',
    reward: 40,
  },

  // ── Naruto ──
  {
    id: 'naruto-1',
    series: 'Naruto',
    prompt: 'Which village does Hinata belong to?',
    choices: ['The Hidden Sand', 'The Hidden Leaf', 'The Hidden Mist', 'The Hidden Cloud'],
    answer: 1,
    explain: 'Hinata is from Konoha, the Hidden Leaf Village.',
    reward: 40,
  },
  {
    id: 'naruto-2',
    series: 'Naruto',
    prompt: 'Which clan does Hinata come from?',
    choices: ['Uchiha', 'Hyuga', 'Nara', 'Yamanaka'],
    answer: 1,
    explain: 'Hinata is the heiress of the Hyuga clan.',
    reward: 40,
  },
  {
    id: 'naruto-3',
    series: 'Naruto',
    prompt: 'What is the Hyuga clan\'s signature ability?',
    choices: ['Shadow possession', 'The Byakugan', 'Puppetry', 'Wood release'],
    answer: 1,
    explain: 'The Byakugan is the Hyuga bloodline limit.',
    reward: 45,
  },
  {
    id: 'naruto-4',
    series: 'Naruto',
    prompt: 'What dream drives Naruto through the series?',
    choices: ['To become Hokage', 'To leave the village', 'To found a clan', 'To master puppetry'],
    answer: 0,
    explain: 'Naruto\'s dream is to be acknowledged and become Hokage.',
    reward: 40,
  },

  // ── Demon Slayer ──
  {
    id: 'ds-1',
    series: 'Demon Slayer',
    prompt: 'What breathing style does Nezuko\'s brother Tanjiro first learn?',
    choices: ['Water Breathing', 'Thunder Breathing', 'Flame Breathing', 'Wind Breathing'],
    answer: 0,
    explain: 'Tanjiro trains in Water Breathing under Urokodaki.',
    reward: 45,
  },
  {
    id: 'ds-2',
    series: 'Demon Slayer',
    prompt: 'What is Nezuko\'s relationship to Tanjiro?',
    choices: ['His cousin', 'His younger sister', 'His rival', 'His teacher'],
    answer: 1,
    explain: 'Nezuko is Tanjiro\'s younger sister, turned into a demon.',
    reward: 40,
  },
  {
    id: 'ds-3',
    series: 'Demon Slayer',
    prompt: 'What does Nezuko wear that keeps her from harming humans?',
    choices: ['A silver chain', 'A bamboo muzzle', 'A warded cloak', 'An iron collar'],
    answer: 1,
    explain: 'The bamboo muzzle is the most visible marker of her restraint.',
    reward: 40,
  },
  {
    id: 'ds-4',
    series: 'Demon Slayer',
    prompt: 'What breathing style does Zenitsu use?',
    choices: ['Water', 'Thunder', 'Mist', 'Stone'],
    answer: 1,
    explain: 'Zenitsu uses Thunder Breathing, mostly while asleep.',
    reward: 40,
  },

  // ── Fate ──
  {
    id: 'fate-1',
    series: 'Fate',
    prompt: 'What class is Saber summoned into?',
    choices: ['Archer', 'Lancer', 'Saber', 'Rider'],
    answer: 2,
    explain: 'Artoria is summoned as the Servant class Saber.',
    reward: 45,
  },
  {
    id: 'fate-2',
    series: 'Fate',
    prompt: 'What is the name of Saber\'s legendary sword?',
    choices: ['Excalibur', 'Gae Bolg', 'Kanshou', 'Rule Breaker'],
    answer: 0,
    explain: 'Excalibur is the sword of the Once and Future King.',
    reward: 45,
  },
  {
    id: 'fate-3',
    series: 'Fate',
    prompt: 'What title does Tohsaka hold in Fuyuki?',
    choices: ['Second Owner', 'Guild master', 'Court mage', 'Head of the Church'],
    answer: 0,
    explain: 'Tohsaka is the Second Owner of the Fuyuki leyline.',
    reward: 40,
  },
  {
    id: 'fate-4',
    series: 'Fate',
    prompt: 'What is the prize for winning the Holy Grail War?',
    choices: ['A wish granted', 'Immortality', 'A crown', 'Command of all Servants'],
    answer: 0,
    explain: 'The Grail is said to grant the victor a single wish.',
    reward: 40,
  },
  {
    id: 'fate-5',
    series: 'Fate',
    prompt: 'What is Jeanne known as?',
    choices: ['The Holy Maiden of Orleans', 'The King of Knights', 'The Second Owner', 'The Wandering Knight'],
    answer: 0,
    explain: 'Jeanne is the Holy Maiden of Orleans.',
    reward: 45,
  },

  // ── Petal Academy ──
  {
    id: 'petal-1',
    series: 'Petal Academy',
    prompt: 'What is Sakura\'s role in her class?',
    choices: ['Class representative', 'Vice principal', 'Team captain', 'Librarian'],
    answer: 0,
    explain: 'Sakura runs the class with a clipboard and a schedule.',
    reward: 40,
  },
  {
    id: 'petal-2',
    series: 'Petal Academy',
    prompt: 'Which club does Yuki belong to?',
    choices: ['The sports club', 'The literature club', 'The cooking club', 'The drama club'],
    answer: 1,
    explain: 'Yuki is the winter literature club member.',
    reward: 40,
  },
  {
    id: 'petal-3',
    series: 'Petal Academy',
    prompt: 'What is Momo the ace of?',
    choices: ['The literature club', 'The sports club', 'The art club', 'The science club'],
    answer: 1,
    explain: 'Momo is the sports club ace.',
    reward: 40,
  },

  // ── Neon Circuit ──
  {
    id: 'neon-1',
    series: 'Neon Circuit',
    prompt: 'What does Akira do in the city?',
    choices: ['Runs a noodle stand', 'Street running', 'Sings in a club', 'Drives a cab'],
    answer: 1,
    explain: 'Akira is a street runner, faster than six districts of traffic law.',
    reward: 40,
  },
  {
    id: 'neon-2',
    series: 'Neon Circuit',
    prompt: 'What does Misaki deliver before sunrise?',
    choices: ['Mail', 'Packages', 'Flowers', 'Batteries'],
    answer: 1,
    explain: 'Misaki is a night courier; do not ask what is in the box.',
    reward: 40,
  },
  {
    id: 'neon-3',
    series: 'Neon Circuit',
    prompt: 'What is Natsumi known for at the arcade?',
    choices: ['Owning the machines', 'Holding every high score', 'Fixing the cabinets', 'Running the counter'],
    answer: 1,
    explain: 'Natsumi holds every high score and defends them.',
    reward: 40,
  },
  {
    id: 'neon-4',
    series: 'Neon Circuit',
    prompt: 'What is Rin\'s specialty?',
    choices: ['Netrunning', 'Street racing', 'Cooking', 'Singing'],
    answer: 0,
    explain: 'Rin talks to machines, and they like her better than you.',
    reward: 40,
  },

  // ── Meadow Rest ──
  {
    id: 'meadow-1',
    series: 'Meadow Rest',
    prompt: 'What does Lily know about?',
    choices: ['Swordplay', 'Which mushrooms heal and which do not', 'Court politics', 'Machine repair'],
    answer: 1,
    explain: 'Lily is the village herbalist.',
    reward: 40,
  },
  {
    id: 'meadow-2',
    series: 'Meadow Rest',
    prompt: 'What does Hana sell at her stall?',
    choices: ['Fish', 'Bouquets, and advice', 'Herbs', 'Bread'],
    answer: 1,
    explain: 'Hana sells bouquets and unsolicited relationship advice.',
    reward: 40,
  },
  {
    id: 'meadow-3',
    series: 'Meadow Rest',
    prompt: 'What does Kaede do at dawn?',
    choices: ['Sweeps the shrine steps', 'Opens the inn', 'Milks the goats', 'Trains with a sword'],
    answer: 0,
    explain: 'Kaede sweeps the shrine steps and chats with the spirits.',
    reward: 40,
  },

  // ── Camelot ──
  {
    id: 'camelot-1',
    series: 'Camelot',
    prompt: 'What is Shion\'s position at court?',
    choices: ['Court mage', 'Wandering knight', 'Head cook', 'Shrine maiden'],
    answer: 0,
    explain: 'Shion is the court mage, and is banned from the library.',
    reward: 40,
  },
  {
    id: 'camelot-2',
    series: 'Camelot',
    prompt: 'What oath does Elise keep?',
    choices: ['To a lord who no longer exists', 'To the shrine', 'To the library', 'To the arcade'],
    answer: 0,
    explain: 'Elise is sworn to a lord who no longer exists, and keeps the oath anyway.',
    reward: 40,
  },

  // ── Wisteria ──
  {
    id: 'wisteria-1',
    series: 'Wisteria',
    prompt: 'What does Kohaku do until her hands bleed?',
    choices: ['Cook', 'Train', 'Sweep', 'Write'],
    answer: 1,
    explain: 'Kohaku trains relentlessly as a demon slayer trainee.',
    reward: 40,
  },
  {
    id: 'wisteria-2',
    series: 'Wisteria',
    prompt: 'What is Aoi responsible for at the estate?',
    choices: ['Training recruits', 'Feeding an entire corps', 'Guarding the gate', 'Keeping records'],
    answer: 1,
    explain: 'Aoi feeds the whole corps and still nags you about posture.',
    reward: 40,
  },
];

export const QUIZ_BY_SERIES: Record<string, QuizQuestion[]> = QUIZ_QUESTIONS.reduce(
  (acc, q) => {
    (acc[q.series] ??= []).push(q);
    return acc;
  },
  {} as Record<string, QuizQuestion[]>,
);

/** Questions for a series, or an empty list if none are authored yet. */
export function quizForSeries(series: string): QuizQuestion[] {
  return QUIZ_BY_SERIES[series] ?? [];
}
