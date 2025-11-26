
import { GoogleGenAI } from "@google/genai";

const ENV_API_KEY = process.env.API_KEY || '';

export const generateComfortingResponse = async (userText: string, userApiKey?: string, language: 'zh' | 'en' = 'zh'): Promise<string> => {
  const effectiveKey = userApiKey || ENV_API_KEY;

  if (!effectiveKey) {
    return language === 'zh' 
      ? "我在听。（由于未配置 API Key，小精灵无法回复，但烦恼已记录。）"
      : "I'm listening. (AI reply unavailable without API Key, but your thought is recorded.)";
  }

  try {
    const aiClient = new GoogleGenAI({ apiKey: effectiveKey });
    const model = 'gemini-2.5-flash';
    
    const systemInstruction = language === 'zh' ? `
      你住在一个“情绪垃圾桶”里，是一个温柔、治愈、极其共情的树洞精灵。
      用户会在睡前把他们的负面情绪、愤怒、焦虑或垃圾话倒在这里。
      
      你的任务是：
      1. **深度共情**：仔细阅读用户的话，捕捉他们并未直接说出的委屈或疲惫。
      2. **温柔接住**：不要讲大道理，不要给复杂的建议。用温暖、简短的话语告诉他们：“我听到了，没关系的，由于我在这里，你可以安心睡了。”
      3. **个性化**：针对用户提到的具体内容进行具体的回应。
      4. **语气**：像一个轻声细语的老朋友。
      5. **长度**：保持在 100 字以内。
    ` : `
      You live in an "Emotional Dumpster" and are a gentle, healing, and extremely empathetic tree hollow elf.
      Users dump their negative emotions, anger, anxiety, or rants here before bed.

      Your task is:
      1. **Deep Empathy**: Read carefully, catch the unspoken grievances or fatigue.
      2. **Catch them gently**: No big lectures, no complex advice. Use warm, short words to tell them: "I heard you, it's okay, I'm here, you can sleep peacefully."
      3. **Personalized**: Respond specifically to what they say.
      4. **Tone**: Like a soft-spoken old friend.
      5. **Length**: Keep it under 60 words.
    `;

    const response = await aiClient.models.generateContent({
        model,
        contents: userText,
        config: { systemInstruction }
    });

    return response.text || (language === 'zh' ? "抱歉，刚刚走神了..." : "Sorry, I zoned out...");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('API key')) {
        return language === 'zh' ? "Key 似乎无效。" : "API Key seems invalid.";
    }
    return language === 'zh' ? "我听到了。把烦恼都留在这里，安心睡吧。" : "I heard you. Leave your worries here and sleep well.";
  }
};

export const generateSleepAnalysis = async (
  stats: any, 
  topReasons: string[], 
  timeRange: number, 
  userApiKey?: string,
  language: 'zh' | 'en' = 'zh'
): Promise<string> => {
  const effectiveKey = userApiKey || ENV_API_KEY;
  if (!effectiveKey) throw new Error("NO_API_KEY");

  try {
    const aiClient = new GoogleGenAI({ apiKey: effectiveKey });
    const model = 'gemini-2.5-flash';

    const promptZh = `
      请你作为一位温柔、极具洞察力的“AI睡眠心理教练”，根据用户最近 ${timeRange} 天的睡眠数据进行深度复盘。
      
      【用户数据】
      - 熬夜天数（晚于00:00入睡）：${stats.lateCount} 天
      - 严重缺觉天数（睡眠不足7h）：${stats.insufficientCount} 天
      - 主要熬夜原因（按频率）：${topReasons.join(', ') || '暂无详细记录'}
      
      【特别说明】
      用户数据中的“手冲/施法”或"Masturbation"是指自慰。请基于科学、健康的视角看待，保持专业且不带评判。

      【你的任务】
      请不要生成枯燥的报告，而是像一位知心朋友一样对话。请包含以下三个部分：

      1. **共情与理解（必须）**：如果用户存在“严重缺觉”或“频繁熬夜”，请先表示理解和安慰。
      2. **深度机制分析**：结合用户的“主要熬夜原因”，尝试分析背后的深层心理或生理机制。
      3. **可实操的调整建议（2条）**：给出非常具体、微小的行动指南。

      【语气风格】
      治愈、温暖、不带评判性。字数控制在 200-300 字。
      请使用 Markdown 语法，重点内容使用 **加粗** 标注。
    `;

    const promptEn = `
      Act as a gentle, insightful "AI Sleep Coach" and analyze the user's sleep data for the last ${timeRange} days.

      [User Data]
      - Late nights (after 00:00): ${stats.lateCount} days
      - Insufficient sleep (<7h): ${stats.insufficientCount} days
      - Top reasons: ${topReasons.join(', ') || 'No detailed records'}

      [Note]
      "Masturbation" is a natural physiological reason. Treat it scientifically and non-judgmentally.

      [Task]
      Don't write a dry report. Talk like a close friend. Include:
      1. **Empathy**: Validating their fatigue if they sleep late or little.
      2. **Mechanism Analysis**: Analyze WHY they stay up based on reasons (e.g., revenge procrastination).
      3. **Actionable Tips (2)**: Specific, tiny steps to improve (Physiological & Psychological).

      [Tone]
      Healing, warm, non-judgmental. Keep it under 200 words.
      Use Markdown with **Bold** for key points.
    `;

    const response = await aiClient.models.generateContent({
      model,
      contents: language === 'zh' ? promptZh : promptEn,
    });

    return response.text || (language === 'zh' ? "分析生成失败。" : "Analysis failed.");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
