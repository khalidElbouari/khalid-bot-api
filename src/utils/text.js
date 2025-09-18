const DIACRITIC_REGEX = /\p{Diacritic}/gu;
const NON_WORD_REGEX = /[^a-z0-9]+/g;

export const normalizeWhitespace = (text = '') => text.replace(/\s+/g, ' ').trim();

export const stripDiacritics = (text = '') => {
  if (!text.normalize) {
    return text;
  }
  return text.normalize('NFD').replace(DIACRITIC_REGEX, '');
};

export const tokenize = (text = '') => {
  const asciiSafe = stripDiacritics(text.toLowerCase());
  return asciiSafe.replace(NON_WORD_REGEX, ' ').split(' ').filter(Boolean);
};

export const countTokens = (tokens = []) => {
  const counts = new Map();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
};

export const uniqueTokens = (tokens = []) => Array.from(new Set(tokens));
