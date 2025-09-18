const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/u;

const frenchVocabulary = [
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'le', 'la', 'les',
  'un', 'une', 'des', 'et', 'ou', 'mais', 'donc', 'car', 'bonjour', 'merci',
  'comment', 'quoi', 'qui', 'que', 'ou', 'quand', 'pourquoi', 'developpement'
];

const englishVocabulary = [
  'the', 'and', 'or', 'but', 'so', 'because', 'what', 'who', 'where', 'when',
  'why', 'how', 'you', 'your', 'me', 'my', 'we', 'our', 'project', 'code',
  'developer', 'software'
];

const countMatches = (words, text) =>
  words.reduce((total, word) => (text.includes(word) ? total + 1 : total), 0);

export const detectLanguage = (text = '') => {
  if (!text) return 'auto';

  if (arabicRegex.test(text)) {
    return 'ar';
  }

  const lower = text.toLowerCase();
  const frenchScore = countMatches(frenchVocabulary, lower);
  const englishScore = countMatches(englishVocabulary, lower);

  if (frenchScore > englishScore && frenchScore > 0) {
    return 'fr';
  }

  if (englishScore > frenchScore && englishScore > 0) {
    return 'en';
  }

  return 'auto';
};
