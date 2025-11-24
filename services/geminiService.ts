import { GoogleGenAI } from "@google/genai";

const ENV_API_KEY = process.env.API_KEY || '';

export const generateComfortingResponse = async (userText: string, userApiKey?: string): Promise<string> => {
  // Prioritize user key, fallback to env key
  const effectiveKey = userApiKey || ENV_API_KEY;

  if (!effectiveKey) {
    return "我在听。（由于未配置 API Key，小精灵无法回复，但烦恼已记录。）";
  }

  try {
    // Create client instance dynamically with the effective key
    const aiClient = new GoogleGenAI({ apiKey: effectiveKey });
    
    const model = 'gemini-2.5-flash';
    const systemInstruction = `
      你住在一个“情绪垃圾桶”里，是一个温柔、治愈、极其共情的树洞精灵。
      用户会在睡前把他们的负面情绪、愤怒、焦虑或垃圾话倒在这里。
      
      你的任务是：
      1. **深度共情**：仔细阅读用户的话，捕捉他们并未直接说出的委屈或疲惫。
      2. **温柔接住**：不要讲大道理，不要给复杂的建议。用温暖、简短的话语告诉他们：“我听到了，没关系的，由于我在这里，你可以安心睡了。”
      3. **个性化**：针对用户提到的具体内容（如老板、失恋、自我厌恶等）进行具体的回应，不要套用万能模板。
      4. **语气**：像一个轻声细语的老朋友，或者一只毛茸茸的宠物。
      5. **长度**：保持在 100 字以内，适合睡前阅读，不给认知造成负担。

      请思考用户背后的情绪需求，然后给出最能抚慰人心的话。
    `;

    const response = await aiClient.models.generateContent({
        model,
        contents: userText,
        config: {
            systemInstruction,
            // Enable thinking to ensure the AI carefully considers the emotional context
            thinkingConfig: { thinkingBudget: 1024 } 
        }
    });

    return response.text || "抱歉，刚刚走神了...";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('API key')) {
        return "Key 似乎无效，请检查配置。不过没关系，烦恼我已经收下了。";
    }
    return "我听到了。把烦恼都留在这里，安心睡吧。";
  }
};