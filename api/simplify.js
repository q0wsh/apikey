// ВРЕМЕННАЯ ПРОВЕРКА — напишет в логи, какой код выполняется
console.log("=== НОВАЯ ВЕРСИЯ КОДА С ПЕРЕБОРОМ МОДЕЛЕЙ ===");
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// СПИСОК МОДЕЛЕЙ - БУДЕТ ПЕРЕБИРАТЬ ПРИ ОШИБКЕ
const MODELS = [
  "gemini-2.0-flash", 
  "gemini-1.5-flash", 
  "gemini-1.5-flash-8b", // Очень маленькая, но быстрая модель
  "gemini-1.5-pro"       // Мощная модель, часто имеет свои лимиты
];

export default async function handler(req, res) {
  // 1. Проверка метода
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, systemPrompt, userPrompt } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const fullPrompt = `${systemPrompt}\n\n${userPrompt || text}`;

  console.log(`📋 Доступные модели: ${MODELS.join(", ")}`);
  // 2. ПЕРЕБИРАЕМ МОДЕЛИ
  let lastError = null;
  
  for (const modelName of MODELS) {
    try {
      console.log(`🔄 Пробуем модель: ${modelName}`);
      
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(fullPrompt);
      const simplifiedText = result.response.text();
      
      console.log(`✅ Успех с моделью: ${modelName}`);
      
      // Успех - возвращаем результат
      return res.status(200).json({ 
        success: true, 
        text: simplifiedText.trim(),
        modelUsed: modelName  // опционально: какая модель сработала
      });
      
    } catch (error) {
      console.log(`❌ Модель ${modelName} не сработала: ${error.message}`);
      lastError = error;
      
      // Если ошибка НЕ про квоту (429) и НЕ "модель не найдена" (404) - прекращаем
      if (!error.message.includes('429') && !error.message.includes('quota') && !error.message.includes('404')) {
        return res.status(500).json({ success: false, error: error.message });
      }
      // Иначе пробуем следующую модель
    }
  }
  
  // 3. Все модели не сработали
  return res.status(429).json({ 
    success: false, 
    error: 'Все модели Gemini временно недоступны. Попробуйте позже или создайте новый API ключ.',
    details: lastError?.message
  });
}
