import fetch from 'node-fetch';
import { detectLanguage } from '../utils/language.js';
import { buildSystemPrompt } from '../prompts/system-prompt.js';
import { retrieveContext, buildContextSummary } from '../rag/retriever.js';
import { sessionStore, createSessionId } from '../utils/session-store.js';
import { chatConfig } from '../config/chat-config.js';
import { normalizeWhitespace } from '../utils/text.js';

const MAX_MESSAGE_LENGTH = Number(process.env.MAX_MESSAGE_LENGTH ?? 600);
const MAX_SESSION_ID_LENGTH = 80;

const complexityPattern = /\b(explain|comment|pourquoi|how|what|project|architecture|quality|developpement)\b/i;

export const validatePayload = (message, sessionId) => {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required' };
  }

  const trimmed = normalizeWhitespace(message);
  if (!trimmed) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` };
  }

  if (sessionId && (typeof sessionId !== 'string' || sessionId.length > MAX_SESSION_ID_LENGTH)) {
    return { valid: false, error: 'Session id is invalid' };
  }

  return { valid: true, message: trimmed };
};

const isComplexQuery = (message) => {
  if (message.length > 160) return true;
  if (message.includes('?')) return true;
  return complexityPattern.test(message);
};

const buildApiPayload = (messages, complexityFlag) => ({
  model: chatConfig.defaultModel,
  messages,
  temperature: chatConfig.temperature,
  top_p: chatConfig.topP,
  frequency_penalty: chatConfig.frequencyPenalty,
  presence_penalty: chatConfig.presencePenalty,
  max_tokens: complexityFlag ? chatConfig.longReplyTokens : chatConfig.shortReplyTokens,
  user: 'khalid-bot-portfolio'
});

export const generateChatReply = async ({ message, sessionId, context }) => {
  const validation = validatePayload(message, sessionId);
  if (!validation.valid) {
    return { error: validation.error, status: 400 };
  }

  const cleanedMessage = validation.message;
  const activeSessionId = sessionId || createSessionId();
  const history = sessionStore.getHistory(activeSessionId);
  const language = detectLanguage(cleanedMessage);
  const snippets = retrieveContext(cleanedMessage, { limit: 3 });
  const contextSummary = buildContextSummary(snippets);
  const systemPrompt = buildSystemPrompt({
    language,
    historyCount: history.length,
    contextSummary,
    userContext: context
  });

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: cleanedMessage }
  ];

  const complexityFlag = isComplexQuery(cleanedMessage);
  const payload = buildApiPayload(messages, complexityFlag);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), chatConfig.requestTimeoutMs);

  try {
    const response = await fetch(chatConfig.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: 'Groq API error',
        status: response.status,
        details: errorText
      };
    }

    const data = await response.json();
    const reply = normalizeWhitespace(data.choices?.[0]?.message?.content ?? '');
    const finalReply = reply || 'No response generated this time. Bien evidemment.';

    sessionStore.appendInteraction(activeSessionId, cleanedMessage, finalReply, {
      maxMessages: complexityFlag ? 18 : 12
    });

    return {
      reply: finalReply,
      sessionId: activeSessionId,
      metadata: {
        detectedLanguage: language,
        historyLength: sessionStore.getHistory(activeSessionId).length,
        isComplexQuery: complexityFlag,
        knowledgeBaseMatches: snippets.map((snippet) => ({
          id: snippet.id,
          title: snippet.title,
          score: Number(snippet.score.toFixed(3))
        })),
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      error: 'Upstream request failed',
      status: 502,
      details: error.message
    };
  } finally {
    clearTimeout(timeout);
  }
};
