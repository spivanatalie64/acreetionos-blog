import OpenAI from 'openai'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

const FREE_MODELS = [
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'qwen/qwen2.5-7b-instruct:free',
  'microsoft/phi-3.5-mini-4k-instruct:free',
  'deepseek/deepseek-chat:free',
]

function pickModel(): string {
  const configured = process.env.OPENROUTER_MODEL
  if (configured) return configured
  return FREE_MODELS[Math.floor(Math.random() * FREE_MODELS.length)]
}

const ANGLES = [
  'new features or updates',
  'development progress or roadmap',
  'community highlights or contributions',
  'comparison to other operating systems',
  'tutorials or how-to tips',
  'philosophy and design decisions',
  'performance benchmarks or optimizations',
  'security or privacy aspects',
]

function pickAngle(): string {
  return ANGLES[Math.floor(Math.random() * ANGLES.length)]
}

export async function generatePost(topic?: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const openai = new OpenAI({ baseURL: OPENROUTER_BASE, apiKey })
  const model = pickModel()
  const subject = topic || process.env.CONTENT_PROMPT || 'acreetionos (acreetionos.org)'
  const angle = pickAngle()

  const res = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are a social media manager for an open-source operating system project. Generate a short, engaging post (max 280 characters) that sounds natural and human-written. Do not use hashtags. Pick a fresh angle each time — vary between updates, insights, tips, and community news.',
      },
      {
        role: 'user',
        content: `Write a social media post about ${subject}, focusing on ${angle}. Make it sound like a real person wrote it.`,
      },
    ],
    max_tokens: 150,
    temperature: 0.9,
  })

  const text = res.choices[0]?.message?.content?.trim()
  if (!text) throw new Error('AI returned empty response')
  return text
}
