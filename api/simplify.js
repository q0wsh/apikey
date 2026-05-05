// api/simplify.js
import { GoogleGenerativeAI } from '@google/generative-ai';

// API ключ хранится в переменной окружения на сервере
// (не в коде! будет добавлен позже в настройках Vercel)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // 1. Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Получаем данные от расширения
  const { text, level, systemPrompt, userPrompt } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {
    // 3. Выбираем модель
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // 4. Формируем полный промпт
    const fullPrompt = `${systemPrompt}\n\n${userPrompt || text}`;
    
    // 5. Делаем запрос к Gemini
    const result = await model.generateContent(fullPrompt);
    const simplifiedText = result.response.text();

    // 6. Возвращаем результат расширению
    return res.status(200).json({ 
      success: true, 
      text: simplifiedText.trim() 
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
