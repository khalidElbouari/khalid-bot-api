import { generateChatReply } from '../src/services/chat-service.js';

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '3600');
};

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      allowedMethods: ['POST', 'OPTIONS']
    });
  }

  try {
    const { message, sessionId, context } = req.body ?? {};
    const result = await generateChatReply({ message, sessionId, context });

    if (result.error) {
      return res.status(result.status ?? 500).json({
        error: result.error,
        details: result.details
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[chat handler] unexpected error', error);
    return res.status(500).json({
      error: 'Unexpected server error',
      details: error.message
    });
  }
}
