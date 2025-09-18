# Khalid Bot API

Portfolio aware chat backend that delivers Khalid Elbouari's real tone and project knowledge through a Groq powered LLM endpoint with lightweight retrieval augmented generation (RAG).

## Highlights
- Fast HTTP endpoint for Vercel or Express with shared business logic.
- Session aware conversation store with 30 minute TTL.
- Retrieval layer that ranks curated portfolio snippets and feeds them into the system prompt.
- Personality tuned prompt that keeps Khalid's signature expressions and directness.
- Strict input validation and defensive error handling around the Groq API.

## Project Layout
```
api/             # Vercel serverless handler
src/
  config/        # Runtime configuration
  data/          # Portfolio knowledge base powering RAG
  prompts/       # System prompt builder
  rag/           # Retrieval utilities
  services/      # Chat orchestration
  utils/         # Helpers (language detection, text cleanup, sessions)
server.js        # Optional Express bootstrap for local usage
```

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file:
   ```env
   GROQ_API_KEY=your_groq_api_key
   GROQ_MODEL=llama3-70b-8192        # optional override
   GROQ_TIMEOUT_MS=12000             # optional timeout override
   MAX_MESSAGE_LENGTH=600            # optional guardrail
   ```
3. Start the local server:
   ```bash
   npm run dev
   ```
4. Send a request:
   ```bash
   curl -X POST http://localhost:3000/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Parle moi de ton projet Smart Store"}'
   ```

## HTTP Contract
- **Endpoint:** `POST /chat`
- **Body:**
  ```json
  {
    "message": "string",
    "sessionId": "optional string",
    "context": "optional caller hints injected into the system prompt"
  }
  ```
- **Success Response:**
  ```json
  {
    "reply": "string",
    "sessionId": "sid_...",
    "metadata": {
      "detectedLanguage": "fr",
      "historyLength": 2,
      "isComplexQuery": false,
      "knowledgeBaseMatches": [
        { "id": "project-portfolio", "title": "Flagship Projects", "score": 0.42 }
      ],
      "timestamp": "2024-09-18T09:42:00.000Z"
    }
  }
  ```
- **Error Response:** HTTP status with `{ "error": string, "details": optional string }`

## Personal Touch
The RAG store at `src/data/knowledge-base.js` captures Khalid's education, flagship projects, and communication style. Update or add entries to reflect new achievements; the retriever will automatically include the best matching snippets in the prompt.

## Development Notes
- `sessionStore` keeps up to 18 messages for complex threads and trims older entries.
- Language detection prefers French, English, or Darija while falling back to mirroring the user input.
- Retrieval uses TF-IDF style scoring with a curated dataset, keeping the system lightweight without external vector services.
- The service never claims to be an AI assistant and always answers as Khalid with confident closing expressions when the mood fits.

## Scripts
- `npm run dev` – start Express locally.
- `npm start` – run through Vercel dev when available.

Gratsi mille et bon build !
