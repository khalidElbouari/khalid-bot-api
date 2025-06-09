# Khalid Bot API 💬

Une API Express qui simule le style de conversation de **Khalid Elbouari** en utilisant le modèle LLaMA 4 via l'API Groq.

## 🚀 Fonctionnalités

- Imite la personnalité et le ton de Khalid (amical, professionnel, positif 😄)
- Utilise des messages structurés (`system`, `user`) pour le prompt
- Express, Node.js, Groq API

## 📦 Dépendances

- express
- cors
- dotenv
- node-fetch

## ⚙️ Configuration

Créer un fichier `.env` à la racine :

```env
GROQ_API_KEY=your_groq_api_key_here