/**
 * Profanity / slur dictionary used to gate user-generated public content.
 *
 * Goals:
 *  - Block explicitly hateful slurs and overtly foul language so the feed
 *    remains a professional space for students, alumni, and staff.
 *  - Avoid the Scunthorpe problem: only match whole words (\b...\b), not
 *    arbitrary substrings, so "class", "Mississippi", "assemble" stay safe.
 *
 * Maintenance:
 *  - Keep entries lowercase. The check normalizes input to lowercase.
 *  - Common leet-speak variants (1, !, 3, 0) are normalized before checking,
 *    so we don't need a separate row for "sh1t" etc.
 *  - When in doubt, lean conservative — the front-end surface area is small
 *    and false positives only ask the user to rephrase.
 */
const PROFANITY: readonly string[] = [
  // English profanity
  'fuck',
  'fucker',
  'fucking',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'dick',
  'cock',
  'prick',
  'pussy',
  'slut',
  'whore',
  'twat',
  'wank',
  'wanker',
  'jackass',
  'piss',
  'damn',

  // Hateful / racial / homophobic slurs (no obfuscated variants — match exact)
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'chink',
  'gook',
  'kike',
  'spic',
  'wetback',
  'dago',
  'beaner',
  'towelhead',
  'sandnigger',
  'tranny',
  'retard',
  'retarded',

  // Filipino profanity (this platform is NEU — Manila campus)
  'tangina',
  'tang ina',
  'putangina',
  'putang ina',
  'puta',
  'gago',
  'gaga',
  'ulol',
  'tarantado',
  'tarantada',
  'leche',
  'lintik',
  'hayop',
  'hudas',
  'bwiset',
  'buwisit',
  'pakyu',
  'pakshet',
  'syet',
  'shet',
  'tite',
  'puke',
  'kantot',
  'pwet',
  'bobo',
  'tanga',
];

/**
 * Replace common leet-speak substitutions with their letter equivalents
 * so "sh1t", "f@ck", "b!tch" still get matched without bloating the list.
 */
function deobfuscate(input: string): string {
  return input
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't');
}

function escapeRegex(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface ProfanityResult {
  clean: boolean;
  matched: string[];
}

/**
 * Check whether `text` contains any blocked words. Returns the offending words
 * (deduped) so callers can log or surface them. Use whole-word matching so we
 * don't flag innocent strings that happen to contain a slur as a substring.
 */
export function checkProfanity(text: string): ProfanityResult {
  if (!text) return { clean: true, matched: [] };

  const normalized = deobfuscate(text);
  const matched = new Set<string>();

  for (const word of PROFANITY) {
    // Use word boundaries; for multi-word entries (e.g. "tang ina"), \b still
    // applies at the outer edges and the inner space matches literally.
    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    if (pattern.test(normalized)) {
      matched.add(word);
    }
  }

  return { clean: matched.size === 0, matched: [...matched] };
}

export const PROFANITY_REJECTION_MESSAGE =
  'Your post contains language that violates our community standards. Please revise the wording to keep the platform professional and try again.';
