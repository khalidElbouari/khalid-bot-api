const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
const DEFAULT_MAX_MESSAGES = 16;

const cloneMessages = (messages = []) => messages.map((entry) => ({ ...entry }));

export class SessionStore {
  constructor({ ttl = DEFAULT_TTL } = {}) {
    this.ttl = ttl;
    this.store = new Map();
  }

  cleanup() {
    const now = Date.now();
    for (const [sessionId, entry] of this.store.entries()) {
      if (now - entry.updatedAt > this.ttl) {
        this.store.delete(sessionId);
      }
    }
  }

  ensure(sessionId) {
    this.cleanup();
    if (!this.store.has(sessionId)) {
      this.store.set(sessionId, {
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    return this.store.get(sessionId);
  }

  getHistory(sessionId) {
    if (!sessionId) return [];
    this.cleanup();
    const entry = this.store.get(sessionId);
    if (!entry) return [];
    return cloneMessages(entry.messages);
  }

  appendInteraction(sessionId, userContent, assistantContent, options = {}) {
    const { maxMessages = DEFAULT_MAX_MESSAGES } = options;
    const entry = this.ensure(sessionId);

    entry.messages.push({ role: 'user', content: userContent });
    entry.messages.push({ role: 'assistant', content: assistantContent });

    if (entry.messages.length > maxMessages) {
      entry.messages = entry.messages.slice(-maxMessages);
    }

    entry.updatedAt = Date.now();
  }
}

export const sessionStore = new SessionStore();

export const createSessionId = () => {
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `sid_${timePart}_${randomPart}`;
};
