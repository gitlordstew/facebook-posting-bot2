export interface AIUpdate {
  title: string;
  summary: string;
  importance: 'low' | 'medium' | 'high';
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

export async function fetchLatestAINews(force: boolean = false): Promise<AIUpdate[]> {
  try {
    const url = force ? "/api/news?force=true" : "/api/news";
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch latest news: ${response.statusText}`);
    }
    const data = await response.json();
    return data as AIUpdate[];
  } catch (error) {
    console.error("Error calling /api/news API, falling back:", error);
    return FALLBACK_AI_NEWS;
  }
}

export async function generateAIImage(prompt: string): Promise<string> {
  const response = await fetch("/api/generate-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error(`Failed to generate image: ${response.statusText}`);
  }

  const data = await response.json();
  return data.imageUrl;
}

export async function generateFacebookPost(
  topic: string, 
  tone: 'professional' | 'enthusiastic' | 'informative' | 'minimalist' | 'visionary' | 'analytical',
  sourceUrl?: string,
  context?: string
): Promise<GeneratedPost> {
  const response = await fetch("/api/generate-post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ topic, tone, url: sourceUrl, context })
  });

  if (!response.ok) {
    throw new Error(`Failed to generate post: ${response.statusText}`);
  }

  const data = await response.json();
  return data as GeneratedPost;
}
