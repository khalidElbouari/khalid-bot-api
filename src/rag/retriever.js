import { knowledgeBase } from '../data/knowledge-base.js';
import { tokenize, countTokens, uniqueTokens } from '../utils/text.js';

const documents = knowledgeBase.map((doc) => {
  const tokens = tokenize([doc.title, doc.content].join(' '));
  return {
    ...doc,
    tokens,
    tokenCounts: countTokens(tokens),
    length: tokens.length
  };
});

const documentFrequency = (() => {
  const df = new Map();
  for (const doc of documents) {
    for (const token of uniqueTokens(doc.tokens)) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }
  return df;
})();

const TOTAL_DOCUMENTS = documents.length;

const idf = (token) => {
  const freq = documentFrequency.get(token) ?? 0;
  return Math.log((1 + TOTAL_DOCUMENTS) / (1 + freq)) + 1;
};

const weight = (count, token) => {
  if (!count) return 0;
  return (1 + Math.log(count)) * idf(token);
};

export const retrieveContext = (query, options = {}) => {
  const { limit = 3, minScore = 0.1 } = options;
  const queryTokens = tokenize(query);
  const queryCounts = countTokens(queryTokens);
  const filteredTokens = uniqueTokens(queryTokens).filter((token) => documentFrequency.has(token));

  const scored = documents.map((doc) => {
    let score = 0;
    for (const token of filteredTokens) {
      const queryWeight = weight(queryCounts.get(token), token);
      const docWeight = weight(doc.tokenCounts.get(token), token);
      score += queryWeight * docWeight;
    }
    if (score === 0 && filteredTokens.length === 0) {
      // fallback boost for general context when nothing matches
      score = 0.15;
    } else {
      score = score / (doc.length + 1);
    }
    return { ...doc, score };
  });

  return scored
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));
};

export const buildContextSummary = (snippets = []) => {
  if (!snippets.length) {
    return 'Portfolio context unavailable; rely on your direct knowledge of Khalid.';
  }
  return snippets
    .map((snippet, index) => {
      return `${index + 1}. ${snippet.title}: ${snippet.content}`;
    })
    .join('\n');
};
