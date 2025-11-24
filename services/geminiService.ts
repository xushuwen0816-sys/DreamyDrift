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

export const generateSleepAnalysis = async (
  stats: any, 
  topReasons: string[], 
  timeRange: number, 
  userApiKey?: string
): Promise<string> => {
  const effectiveKey = userApiKey || ENV_API_KEY;
  if (!effectiveKey) throw new Error("NO_API_KEY");

  try {
    const aiClient = new GoogleGenAI({ apiKey: effectiveKey });
    const model = 'gemini-2.5-flash';

    const prompt = `
      请你作为一位温柔、极具洞察力的“AI睡眠心理教练”，根据用户最近 ${timeRange} 天的睡眠数据进行深度复盘。
      
      【用户数据】
      - 熬夜天数（晚于00:00入睡）：${stats.lateCount} 天
      - 严重缺觉天数（睡眠不足7h）：${stats.insufficientCount} 天
      - 主要熬夜原因（按频率）：${topReasons.join(', ') || '暂无详细记录'}
      
      【特别说明】
      用户数据中的“手冲/施法”是指自慰（Masturbation）。请基于科学、健康的视角看待，在分析时不要感到困惑，可视情况给出适度的生理健康提示（如放松作用或避免过度疲劳），保持专业且不带评判。

      【你的任务】
      请不要生成枯燥的报告，而是像一位知心朋友一样对话。请包含以下三个部分：

      1. **共情与理解（必须）**：
         如果用户存在“严重缺觉”或“频繁熬夜”，请先表示理解和安慰。告诉用户你懂他们的疲惫，不需要自责。
      
      2. **深度机制分析**：
         结合用户的“主要熬夜原因”，尝试分析背后的深层心理或生理机制。
         例如：
         - 如果是“报复性熬夜/刷手机”，可能是白天缺乏自主权，晚上在通过时间补偿自己。
         - 如果是“学习/工作”，可能是焦虑驱动。
         - 如果是“自我探索/学习新事物”，肯定这种求知欲，但提醒由于身体是革命的本钱。
      
      3. **可实操的调整建议（2条）**：
         给出非常具体、微小的行动指南。
         - **建议1（生理层面）**：如光照、体温、饮食、环境布置等具体操作。
         - **建议2（心理层面）**：如正念、自我对话、放松练习或认知调整。

      【语气风格】
      治愈、温暖、不带评判性。字数控制在 200-300 字。
      请使用 Markdown 语法，重点内容使用 **加粗** 标注，以便在应用中高亮显示。
    `;

    const response = await aiClient.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "分析生成失败，请稍后再试。";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};