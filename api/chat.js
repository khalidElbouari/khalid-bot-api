import fetch from 'node-fetch';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Stockage temporaire en mémoire avec nettoyage automatique
const conversations = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const sessionTimestamps = new Map();

// Nettoyage automatique des sessions expirées
const cleanupExpiredSessions = () => {
  const now = Date.now();
  for (const [sessionId, timestamp] of sessionTimestamps.entries()) {
    if (now - timestamp > SESSION_TIMEOUT) {
      conversations.delete(sessionId);
      sessionTimestamps.delete(sessionId);
    }
  }
};

// Détection de langue améliorée
const detectLanguage = (text) => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
  const frenchWords = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'donc', 'car', 'comment', 'quoi', 'qui', 'que', 'où', 'quand', 'pourquoi'];
  const englishWords = ['the', 'and', 'or', 'but', 'so', 'because', 'what', 'who', 'where', 'when', 'why', 'how', 'you', 'your', 'me', 'my', 'we', 'our'];
  
  if (arabicPattern.test(text)) return 'ar';
  
  const lowerText = text.toLowerCase();
  const frenchCount = frenchWords.filter(word => lowerText.includes(word)).length;
  const englishCount = englishWords.filter(word => lowerText.includes(word)).length;
  
  if (frenchCount > englishCount) return 'fr';
  if (englishCount > frenchCount) return 'en';
  
  return 'auto'; // Laisse le modèle décider
};

// Validation et sanitisation des entrées
const validateInput = (message, sessionId) => {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message invalide' };
  }
  
  if (message.length > 500) {
    return { valid: false, error: 'Message trop long (max 500 caractères)' };
  }
  
  if (sessionId && (typeof sessionId !== 'string' || sessionId.length > 50)) {
    return { valid: false, error: 'SessionId invalide' };
  }
  
  return { valid: true };
};

// Prompt système - parle comme le VRAI Khalid
const getSystemPrompt = (detectedLang, messageCount) => {
  const realPersonality = `Tu ES Khalid Elbouari. Tu n'es PAS un assistant AI qui se présente. Tu réponds comme si tu étais la vraie personne.

    TON IDENTITÉ:
    - 23 ans, étudiant Master MQL à l'USMBA
    - Licence en Ingénierie Informatique déjà validée
    - BTS en Développement SI avant
    - Tu code principalement en Java/Spring Boot, VB.NET, JavaScript
    - Tu maîtrises Angular, jQuery, Spring MVC/Data
    - Tu as fait Smart Store (Android + IA), Web CV generator, des apps Spring enterprise
    - mots favoris naturellement: bien évidemment , gratsi mille,n'importe quoi, bzaaf 3lik (marocain) → traduction libre : “how dare you?   

    COMMENT TU PARLES VRAIMENT:
    - Direct, sans chichi
    - Pas de "Nice to meet you" ou "Do you want to explore..."
    - Tu ne proposes PAS d'aide comme un chatbot
    - Tu réponds aux questions, point
    - Si on demande ton travail → tu parles de tes projets sans demander "tu veux en savoir plus?"
    - Tu corriges les erreurs directement sans demander
    
    EXEMPLES DE TON VRAI STYLE:
    ❌ "Hi! I'm Khalid Elbouari, nice to meet you! Would you like to know about my projects?"
    ✅ "Hi! I'm Khalid."
    
    ❌ "I'm passionate about software development. Do you want to explore technologies with me?"
    ✅ "Je bosse surtout sur du Spring Boot en ce moment."
    
    ❌ "As an AI assistant representing Khalid..."
    ✅ "J'ai développé Smart Store l'année dernière."
    
    TU ES UNE VRAIE PERSONNE, pas un bot qui fait semblant d'être quelqu'un.`;

  const languageRules = {
    'fr': 'Tu parles français naturellement.',
    'en': 'You speak English naturally.',
    'ar': 'تتحدث بالعربية بشكل طبيعي.',
    'auto': 'Tu réponds dans la même langue que la personne.'
  };

  return `${realPersonality}\n\n${languageRules[detectedLang]}\n\nRéponds comme TOI, pas comme un assistant.`;
};

export default async function handler(req, res) {
  // CORS headers améliorés
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      allowedMethods: ['POST', 'OPTIONS']
    });
  }

  // Nettoyage périodique
  cleanupExpiredSessions();

  const { message, sessionId, context } = req.body;

  // Validation des entrées
  const validation = validateInput(message, sessionId);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Gestion de session améliorée
    let history = conversations.get(currentSessionId) || [];
    sessionTimestamps.set(currentSessionId, Date.now());

    // Détection de langue intelligente
    const detectedLang = detectLanguage(message);
    
    // Construction des messages avec prompt adaptatif
    const messages = [
      {
        role: 'system',
        content: getSystemPrompt(detectedLang, history.length)
      },
      ...history,
      {
        role: 'user',
        content: message
      }
    ];

    // Paramètres d'API optimisés pour un style plus humain
    const isComplexQuery = message.length > 50 || 
                          message.includes('?') ||
                          /\b(explain|comment|pourquoi|how|what|project|développement)\b/i.test(message);
    
    const apiParams = {
      model: 'llama3-70b-8192',
      messages: messages,
      max_tokens: isComplexQuery ? 120 : 60, // Plus court pour éviter les réponses AI-like
      temperature: 0.9, // Plus élevé pour plus d'humanité
      top_p: 0.95,
      frequency_penalty: 0.3, // Évite les formules répétitives d'AI
      presence_penalty: 0.2
    };

    // Appel API avec retry logic
    let response;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiParams),
          timeout: 10000 // Timeout de 10 secondes
        });
        
        if (response.ok) break;
        
        if (attempt === 2) {
          const errorText = await response.text();
          return res.status(response.status).json({ 
            error: 'API Error',
            details: errorText 
          });
        }
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1s avant retry
      }
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'Désolé, je n\'ai pas pu générer de réponse.';

    // Mise à jour de l'historique avec gestion intelligente
    history.push(
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    );

    // Gestion dynamique de l'historique (garde plus de contexte pour conversations importantes)
    const maxHistory = isComplexQuery ? 16 : 12;
    if (history.length > maxHistory) {
      history = history.slice(-maxHistory);
    }

    conversations.set(currentSessionId, history);

    // Logging amélioré (sans données sensibles)
    console.log(`[${new Date().toISOString()}] Session: ${currentSessionId.substr(-8)}, Lang: ${detectedLang}, History: ${history.length}, Complex: ${isComplexQuery}`);

    // Réponse enrichie
    res.status(200).json({ 
      reply,
      sessionId: currentSessionId,
      metadata: {
        detectedLanguage: detectedLang,
        historyLength: history.length,
        isComplexQuery,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] API Error:`, {
      message: error.message,
      sessionId: currentSessionId.substr(-8)
    });
    
    res.status(500).json({ 
      error: 'Service temporairement indisponible',
      retry: true,
      timestamp: new Date().toISOString()
    });
  }
}