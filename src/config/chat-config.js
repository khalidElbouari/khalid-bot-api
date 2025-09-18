export const chatConfig = {
  endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  defaultModel: process.env.GROQ_MODEL ?? 'llama3-70b-8192',
  shortReplyTokens: 96,
  longReplyTokens: 220,
  temperature: 0.85,
  topP: 0.95,
  frequencyPenalty: 0.2,
  presencePenalty: 0.15,
  requestTimeoutMs: Number(process.env.GROQ_TIMEOUT_MS ?? 12000)
};
