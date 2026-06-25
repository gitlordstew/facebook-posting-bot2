import { GoogleGenAI, Type } from "@google/genai";

const TEXT_MODEL = "gemini-3-flash-preview";
const IMAGE_MODEL = "gemini-2.5-flash-image";

export interface AIUpdate {
  title: string;
  summary: string;
  importance: "low" | "medium" | "high";
  tags: string[];
  date: string;
  url: string;
}

export interface GeneratedPost {
  title: string;
  content: string;
  suggestedImagePrompt: string;
  imageUrl?: string;
}

export const FALLBACK_AI_NEWS: AIUpdate[] = [
  {
    title: "Google Launches Gemini 1.5 Pro with 2-Million-Token Context Window",
    summary: "Google upgraded Gemini 1.5 Pro, delivering revolutionary multi-hour video and massive codebase understanding, making it the most capable reasoning and context model available.",
    importance: "high",
    tags: ["google-gemini", "multimodal", "long-context"],
    date: "June 1, 2026",
    url: "https://blog.google/technology/ai/google-gemini-next-generation/"
  },
  {
    title: "Anthropic Releases Claude 3.5 Sonnet Setting New Industry Benchmarks",
    summary: "Anthropic's latest Claude 3.5 Sonnet demonstrates remarkable gains in coding, logic, and visual reasoning, establishing a new high-water mark for developer productivity and systems intelligence.",
    importance: "high",
    tags: ["claude-3-5", "anthropic", "coding-intelligence"],
    date: "May 28, 2026",
    url: "https://www.anthropic.com/news/claude-3-5-sonnet"
  },
  {
    title: "OpenAI Rolls Out GPT-4o Real-Time Voice and Vision Assistance",
    summary: "OpenAI's GPT-4o brings multimodal low-latency conversational speech, emotional cadence detection, and live video analysis to desktop and mobile environments.",
    importance: "medium",
    tags: ["openai", "gpt-4o", "realtime-multimodal"],
    date: "May 25, 2026",
    url: "https://openai.com/index/gpt-4o-and-more-updates/"
  },
  {
    title: "DeepSeek Launches Open-Source R1 Reasoning Model Worldwide",
    summary: "DeepSeek R1 leverages advanced reinforcement learning to deliver state-of-the-art math, competitive coding, and clear step-by-step reasoning outputs in an open-weights release.",
    importance: "high",
    tags: ["deepseek", "r1-model", "open-source"],
    date: "May 19, 2026",
    url: "https://github.com/deepseek-ai/DeepSeek-R1"
  },
  {
    title: "Meta Introduces Llama 3.3 Optimized 70B Open-Weights Model",
    summary: "Meta's new Llama 3.3 model introduces advanced architecture training improvements to offer highly state-of-the-art reasoning, deep code-gen, and multilingual instructions.",
    importance: "medium",
    tags: ["meta-llama", "llama-3", "openweights"],
    date: "May 12, 2026",
    url: "https://ai.meta.com/blog/llama-3-architecture-advancements/"
  }
];

let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it in Vercel and redeploy.");
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }

  return aiClient;
}

function parseJsonResponse<T>(text: string | undefined, fallback: T): T {
  if (!text) {
    return fallback;
  }

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error("Gemini returned non-JSON text:", cleaned, error);
    return fallback;
  }
}

function generatePostLocalFallback(topic: string, tone: string, url?: string, context?: string): GeneratedPost {
  const coreMessage = context ? context.trim() : `The latest advancements and integration of "${topic}" are shaping the future of technology.`;
  const cleanTopic = topic.replace(/[#*]/g, "").trim();
  const briefSubject = cleanTopic.split(/\s+/).slice(0, 4).join(" ");

  let title = `Update: ${briefSubject}`;
  let content = `${cleanTopic} represents a notable leap forward in technology.\n\n${coreMessage}`;
  let suggestedImagePrompt = `Professional technological digital art showcasing ${cleanTopic}, neural network diagrams, modern clean workspace, high-fidelity details, 16:9 aspect ratio`;

  if (tone === "professional") {
    title = `The Strategic Impact of ${briefSubject}`;
    content = `${coreMessage}\n\nThis development matters for teams building practical AI workflows, especially where automation, context, and trust need to work together.`;
  } else if (tone === "minimalist") {
    title = `${briefSubject}.`;
    content = `${cleanTopic} is officially here.\n\n${coreMessage.slice(0, 220)}`;
  } else if (tone === "analytical") {
    title = `Analysis: ${briefSubject}`;
    content = `The key signal: ${coreMessage}\n\nThe practical question now is how teams turn this capability into reliable workflows without adding unnecessary operational complexity.`;
  }

  if (cleanTopic.toLowerCase().includes("google") || cleanTopic.toLowerCase().includes("gemini")) {
    suggestedImagePrompt = `Futuristic abstract Google Gemini neural core with floating Google color light flows, clean minimal design, professional digital art, 16:9`;
  }

  if (url) {
    content += `\n\nSee more: ${url}`;
  }

  return { title, content, suggestedImagePrompt };
}

export async function fetchLatestAINews(_force: boolean = false): Promise<AIUpdate[]> {
  try {
    const today = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const response = await getAIClient().models.generateContent({
      model: TEXT_MODEL,
      contents: `Find and summarize the 5 most important recent artificial intelligence product launches, model releases, or industry developments. Today's date is ${today}. Use real source URLs.

Return only a valid JSON array. Do not include markdown, code fences, or commentary.
Each array item must use this shape:
{
  "title": "string",
  "summary": "string",
  "importance": "low | medium | high",
  "tags": ["string"],
  "date": "string",
  "url": "string"
}`,
      config: {
        systemInstruction: "You are a factual AI news researcher. Use search grounding, then return only parseable JSON.",
        tools: [{ googleSearch: {} }]
      }
    });

    const news = parseJsonResponse<AIUpdate[]>(response.text, FALLBACK_AI_NEWS);
    return Array.isArray(news) && news.length > 0 ? news : FALLBACK_AI_NEWS;
  } catch (error) {
    console.error("Gemini news generation failed, falling back:", error);
    return FALLBACK_AI_NEWS;
  }
}

export async function generateAIImage(prompt: string): Promise<string> {
  const response = await getAIClient().models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [
        {
          text: `Create a professional, high-quality, 16:9 social media image about artificial intelligence: ${prompt}`
        }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini did not return image data.");
  }

  return `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`;
}

export async function generateFacebookPost(
  topic: string,
  tone: "professional" | "enthusiastic" | "informative" | "minimalist" | "visionary" | "analytical",
  sourceUrl?: string,
  context?: string
): Promise<GeneratedPost> {
  const toneGuide = {
    professional: "Authoritative, industry-focused, polished language, and insightful.",
    enthusiastic: "High energy, excited, clear, and social-media friendly.",
    informative: "Clear, structured, educational, and factual.",
    minimalist: "Short, punchy, one or two sentences, high impact.",
    visionary: "Futuristic and thoughtful, focusing on long-term impact.",
    analytical: "Critical, data-driven, examining limitations and practical use cases."
  };

  const fallback = generatePostLocalFallback(topic, tone, sourceUrl, context);

  try {
    const response = await getAIClient().models.generateContent({
      model: TEXT_MODEL,
      contents: `Topic: ${topic}
${context ? `Context/Ground Truth: ${context}` : ""}
Tone: ${toneGuide[tone]}

Generate a compelling Facebook post summarizing this AI development.
Use only the provided facts and context.
${sourceUrl ? `The post content must end with this exact final line: See more: ${sourceUrl}` : "Do not include hashtags at the end."}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            suggestedImagePrompt: { type: Type.STRING }
          },
          required: ["title", "content", "suggestedImagePrompt"]
        }
      }
    });

    return parseJsonResponse<GeneratedPost>(response.text, fallback);
  } catch (error) {
    console.error("Gemini post generation failed, falling back:", error);
    return fallback;
  }
}
