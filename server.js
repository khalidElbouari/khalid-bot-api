import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateChatReply } from './src/services/chat-service.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, context } = req.body ?? {};
    const result = await generateChatReply({ message, sessionId, context });

    if (result.error) {
      return res.status(result.status ?? 500).json({
        error: result.error,
        details: result.details
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('[express] unexpected error', error);
    return res.status(500).json({
      error: 'Unexpected server error',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
