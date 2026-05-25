import OpenAI from 'openai'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

export async function generatePost(topic?: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const openai = new OpenAI({ baseURL: OPENROUTER_BASE, apiKey })
  const prompt = topic || process.env.CONTENT_PROMPT || 'technology and programming'
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free'

  const res = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are a social media manager. Generate a short, engaging post (max 280 characters) that sounds natural and human-written. Do not use hashtags.',
      },
      {
        role: 'user',
        content: `Write a social media post about: ${prompt}`,
      },
    ],
    max_tokens: 150,
    temperature: 0.8,
  })

  const text = res.choices[0]?.message?.content?.trim()
  if (!text) throw new Error('AI returned empty response')
  return text
}
