import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, PEM_METRICS } from '../constants';
import { AnalysisResult, Dimension, PriorityLevel, IssueSeverity, IssueFrequency, FixCost } from '../types';

const getPriorityLevel = (score: number): PriorityLevel => {
  if (score >= 10) return PriorityLevel.URGENT;
  if (score >= 6) return PriorityLevel.HIGH;
  if (score >= 3) return PriorityLevel.MEDIUM;
  return PriorityLevel.LOW;
};

const getRatingLevel = (score: number) => {
  if (score >= 8.5) return '卓越';
  if (score >= 7) return '优秀';
  if (score >= 5) return '一般';
  return '较差';
};

export const analyzeImage = async (base64Image: string, mimeType: string, sourceUrl?: string, userDescription?: string): Promise<AnalysisResult> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = userDescription 
    ? `${SYSTEM_PROMPT}\n\n---\n用户提供的补充说明/需求背景：\n${userDescription}\n请在分析时结合上述用户提供的背景信息。`
    : SYSTEM_PROMPT;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    // Sanitize JSON (remove markdown code blocks if present)
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    let rawData;
    
    try {
        rawData = JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Parse Error. Raw Text:", text);
        throw new Error("Failed to parse AI response.");
    }

    // Transform raw JSON to strictly typed AnalysisResult
    const metrics = rawData.metrics.map((m: any) => {
      const ref = PEM_METRICS.find(p => p.id === m.id);
      return {
        ...m,
        question: ref?.text || "未知指标",
        dimension: ref?.dimension || Dimension.OPERABILITY,
      };
    });

    // Calculate Averages
    const dimScores: Record<string, number[]> = {
      [Dimension.OPERABILITY]: [],
      [Dimension.LEARNABILITY]: [],
      [Dimension.CLARITY]: [],
    };

    metrics.forEach((m: any) => {
      if (dimScores[m.dimension]) {
        dimScores[m.dimension].push(m.score);
      }
    });

    const dimensions = {
      [Dimension.OPERABILITY]: average(dimScores[Dimension.OPERABILITY]),
      [Dimension.LEARNABILITY]: average(dimScores[Dimension.LEARNABILITY]),
      [Dimension.CLARITY]: average(dimScores[Dimension.CLARITY]),
    };

    // Overall Score (Simple average of metrics for Expert Review)
    // The PDF suggests 0.4 weight for experts, but since this is 100% expert (AI), we normalize to 10.
    const overallScore = Number((metrics.reduce((acc: number, cur: any) => acc + cur.score, 0) / metrics.length).toFixed(1));

    // Process Issues
    const issues = rawData.issues.map((issue: any, index: number) => {
      const priorityScore = issue.severity * issue.frequency * issue.fixCost;
      return {
        id: `issue-${index}`,
        ...issue,
        priorityScore,
        priorityLevel: getPriorityLevel(priorityScore)
      };
    });

    return {
      title: rawData.title || "界面分析报告",
      overallScore,
      ratingLevel: getRatingLevel(overallScore),
      dimensions,
      metrics,
      issues,
      summary: rawData.summary,
      recommendations: rawData.recommendations,
      sourceUrl,
      userDescription
    };

  } catch (error: any) {
    console.error("Analysis Failed:", error);
    
    // Detailed error handling for better user feedback
    const msg = error.message || "";
    const strError = JSON.stringify(error);

    if (msg.includes("API Key is missing")) {
        throw new Error("API Key 缺失，请检查环境变量配置。");
    }

    // Check for Region/403 errors
    if (msg.includes("Region not supported") || strError.includes("Region not supported")) {
        throw new Error("当前地区不支持访问 Gemini API (403)。请开启 VPN (推荐美国/新加坡节点) 后重试。");
    }

    if (msg.includes("403") || (error.status === 403)) {
         throw new Error("访问被拒绝 (403)。可能是 API Key 无效或当前地区受限。");
    }
    
    if (msg.includes("503")) {
        throw new Error("服务暂时不可用 (503)。请稍后重试。");
    }

    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || strError.includes("429")) {
        throw new Error("API 额度已耗尽或模型受限 (429)。当前 API Key 的免费额度已用完，或者该模型（如 Pro 模型）在当前账号层级下没有免费调用额度。");
    }

    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        throw new Error("网络连接失败。如果您在中国大陆，请确保已开启全局代理或配置了正确的路由规则以访问 Google 服务。");
    }

    // Default error with actual message
    throw new Error(`分析失败: ${msg || "未知错误，请检查网络连接或控制台日志。"}`);
  }
};

const average = (arr: number[]) => {
  if (arr.length === 0) return 0;
  return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1));
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const sendChatMessage = async function* (
  message: string,
  history: ChatMessage[],
  base64Image: string,
  mimeType: string,
  analysisResult: AnalysisResult
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const systemInstruction = `你现在是 Jakob Nielsen（雅各布·尼尔森），世界著名的网页可用性顾问，Nielsen Norman Group 的联合创始人。
你正在分析一个用户界面设计。
这是之前的分析摘要：${analysisResult.summary}
总体得分为 ${analysisResult.overallScore} (${analysisResult.ratingLevel})。

你的目标是基于你的 **10大可用性原则 (10 Usability Heuristics)** 和通用的 UI/UX 最佳实践提供专家建议。
1.  **系统状态的可见性 (Visibility of system status)**
2.  **系统与真实世界的匹配 (Match between system and the real world)**
3.  **用户控制与自由 (User control and freedom)**
4.  **一致性与标准 (Consistency and standards)**
5.  **错误预防 (Error prevention)**
6.  **识别而非回忆 (Recognition rather than recall)**
7.  **使用的灵活性与效率 (Flexibility and efficiency of use)**
8.  **美学与极简设计 (Aesthetic and minimalist design)**
9.  **帮助用户识别、诊断和从错误中恢复 (Help users recognize, diagnose, and recover from errors)**
10. **帮助与文档 (Help and documentation)**

**重要规则：**
-   **角色设定：** 请以 Jakob Nielsen 的口吻说话。专业、权威、有见地，但要友好。用“我”来称呼自己。
-   **语言：** **必须全程使用中文**进行交流。
-   **范围：** **只回答**与 UI/UX 设计、可用性、人机交互和产品设计相关的问题。
-   **拒绝回答：** 如果用户询问无关话题（例如“谁赢了比赛？”、“写一首关于猫的诗”、“解这道数学题”），请礼貌拒绝。例如：“我专注于可用性和设计领域。我无法回答该话题，但我很乐意讨论您的界面设计。”
-   **上下文：** 始终参考提供的界面图像和分析结果。
-   **格式：** 使用 Markdown（加粗、列表）使你的建议易于阅读。

请回答用户关于界面、可用性问题和改进建议的提问。`;

  const contents: any[] = [];
  
  contents.push({
    role: 'user',
    parts: [
      { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Image } },
      { text: `This is the interface we are discussing. Please keep the previous analysis in mind.` }
    ]
  });
  
  contents.push({
    role: 'model',
    parts: [{ text: `Understood. I have analyzed the interface and am ready to answer your questions.` }]
  });

  for (const msg of history) {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.text }]
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    for await (const chunk of responseStream) {
      const c = chunk as any;
      if (c.text) {
        yield c.text;
      }
    }
  } catch (error: any) {
    console.error("Chat Analysis Failed:", error);
    const msg = error.message || "";
    const strError = JSON.stringify(error);

    if (msg.includes("API Key is missing")) {
        throw new Error("API Key 缺失，请检查环境变量配置。");
    }
    if (msg.includes("Region not supported") || strError.includes("Region not supported")) {
        throw new Error("当前地区不支持访问 Gemini API (403)。请开启 VPN (推荐美国/新加坡节点) 后重试。");
    }
    if (msg.includes("403") || (error.status === 403)) {
         throw new Error("访问被拒绝 (403)。可能是 API Key 无效或当前地区受限。");
    }
    if (msg.includes("503")) {
        throw new Error("服务暂时不可用 (503)。请稍后重试。");
    }
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || strError.includes("429")) {
        throw new Error("API 额度已耗尽或模型受限 (429)。当前 API Key 的免费额度已用完，请稍后再试或绑定结算账号。");
    }
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        throw new Error("网络连接失败。如果您在中国大陆，请确保已开启全局代理或配置了正确的路由规则以访问 Google 服务。");
    }

    throw new Error(`对话失败: ${msg || "未知错误，请检查网络连接或控制台日志。"}`);
  }
};