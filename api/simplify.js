import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. СПИСОК КЛЮЧЕЙ (Добавь их в Environment Variables на Vercel)
const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3
].filter(key => !!key); // Оставляем только те, что реально заданы

// 2. СПИСОК МОДЕЛЕЙ (От самых мощных к самым быстрым)
const MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b", // Самые высокие лимиты на бесплатном тарифе
  "gemini-pro"
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, systemPrompt, userPrompt } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const fullPrompt = `${systemPrompt}\n\n${userPrompt || text}`;
  let lastError = null;

  // ГЛАВНЫЙ ЦИКЛ: ПЕРЕБОР КЛЮЧЕЙ
  for (const key of API_KEYS) {
    const genAI = new GoogleGenerativeAI(key);

    // ВНУТРЕННИЙ ЦИКЛ: ПЕРЕБОР МОДЕЛЕЙ ДЛЯ ЭТОГО КЛЮЧА
    for (const modelName of MODELS) {
      try {
        console.log(`🔄 Пробую ключ...${key.slice(-4)} | Модель: ${modelName}`);
        
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const simplifiedText = response.text();

        console.log(`✅ Успех! Модель: ${modelName}`);

        return res.status(200).json({
          success: true,
          text: simplifiedText.trim(),
          modelUsed: modelName
        });

      } catch (error) {
        lastError = error;
        const isQuotaError = error.message.includes('429') || error.message.toLowerCase().includes('quota');
        
        console.log(`❌ Ошибка (${modelName}): ${error.message.slice(0, 50)}...`);

        // Если это НЕ ошибка лимита (например, цензура или битый промпт), 
        // нет смысла пробовать другие ключи — сразу выходим.
        if (!isQuotaError && !error.message.includes('404')) {
          return res.status(500).json({ success: false, error: error.message });
        }
        
        // Если лимит исчерпан — цикл идет к следующей модели или ключу
        continue; 
      }
    }
  }

  // Если мы здесь, значит перебрали всё и ничего не сработало
  return res.status(429).json({
    success: false,
    error: 'Лимит всех ключей исчерпан. Подожди 1 минуту.',
    details: lastError?.message
  });
}
