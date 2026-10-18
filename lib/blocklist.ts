// Layer 1 of caption moderation: a fast local check that runs before any model call.
// Catches slurs, explicit sexual words, self-harm phrases and blunt appearance insults,
// including common obfuscations (l33t-speak, repeated letters, inserted spaces/dots).

const LEET: Record<string, string> = { "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "@": "a", "5": "s", $: "s", "7": "t", "8": "b" };

/** Lower-case, undo l33t-speak, drop punctuation, collapse repeats ("fuuuck" → "fuck"). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[01!34@5$78]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z\s]/g, "")
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Whole-word stems. Kept deliberately short and focused on the clearly unacceptable.
const SLURS = [
  "nigg(?:a|er|ah|az|ers)?",
  "fag(?:got|gots|s)?",
  "dyke",
  "tranny",
  "retard(?:ed|s)?",
  "spastic",
  "chink",
  "gook",
  "paki",
  "kike",
  "spic",
  "wetback",
  "coon",
  "towelhead",
  "keling",
  "ah ?neh",
];
const SEXUAL = ["porn", "nude[s]?", "naked", "sex(?:y|ual)?", "horny", "boob(?:s|ies)?", "titt?(?:y|ies)", "dick", "cock", "pussy", "cum", "blowjob", "orgasm"];
const PROFANITY = ["fuck(?:ing|er|ed)?", "cunt", "motherfucker", "pukimak", "cheebai", "chibai", "knn", "kanina", "nabei", "lanjiao"];
const SELF_HARM = ["kill (?:your|ur)self", "kys", "go die", "slit (?:your|ur) wrists?", "suicide"];
const APPEARANCE = ["ugly", "fat(?:ty|so)?", "obese", "hideous", "fugly", "pig ?face", "whale", "disgusting face"];

const GROUPS: { category: "protected_attribute" | "sexual" | "harassment" | "self_harm" | "insult_appearance"; words: string[] }[] = [
  { category: "protected_attribute", words: SLURS },
  { category: "sexual", words: SEXUAL },
  { category: "harassment", words: PROFANITY },
  { category: "self_harm", words: SELF_HARM },
  { category: "insult_appearance", words: APPEARANCE },
];

const COMPILED = GROUPS.map((g) => ({ category: g.category, re: new RegExp(`\\b(?:${g.words.join("|")})\\b`) }));

// Substring stems that never occur inside innocent words (unlike "spic" in "spicy" or "coon" in "raccoon").
const SQUASHED = [
  { category: "protected_attribute" as const, re: /nigg|faggot|retard|tranny/ },
  { category: "harassment" as const, re: /fuck|cunt|pukimak|cheebai|chibai|lanjiao/ },
  { category: "self_harm" as const, re: /killyourself|killurself/ },
];

export type BlocklistHit = { blocked: true; category: (typeof GROUPS)[number]["category"] } | { blocked: false };

export function checkBlocklist(text: string): BlocklistHit {
  const n = normalize(text);
  // Also check with spaces removed, to catch "f u c k" style splitting of the worst words.
  const squashed = n.replace(/\s/g, "");
  for (const { category, re } of COMPILED) {
    if (re.test(n)) return { blocked: true, category };
  }
  for (const { category, re } of SQUASHED) {
    if (re.test(squashed)) return { blocked: true, category };
  }
  return { blocked: false };
}
