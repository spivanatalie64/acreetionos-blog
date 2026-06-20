import OpenAI from 'openai'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const POSTS_DIR = join(__dirname, '..', 'content', 'posts')

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

const FALLBACK_MODELS = [
  'openai/gpt-4o-mini',
  'meta-llama/llama-3.2-3b-instruct:free',
  'deepseek/deepseek-v4-flash:free',
  'qwen/qwen3-coder:free',
  'google/gemma-4-26b-a4b-it:free',
]

const ANGLES = [
  'new features or updates with upstream references',
  'development progress or roadmap with CVE mentions',
  'community highlights or contributions',
  'comparison to other operating systems',
  'tutorials or how-to tips with relevant CVEs',
  'philosophy and design decisions',
  'performance benchmarks or optimizations',
  'security or privacy aspects with current upstream CVEs',
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const openai = new OpenAI({
    baseURL: OPENROUTER_BASE,
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://acreetionos.org',
      'X-Title': 'AcreetionOS Blog',
    },
  })
  const model = process.env.OPENROUTER_MODEL
    ? process.env.OPENROUTER_MODEL
    : FALLBACK_MODELS[Math.floor(Math.random() * FALLBACK_MODELS.length)]
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)]

  const subject = process.env.CONTENT_PROMPT || 'acreetionos (acreetionos.org)'

  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]

  const res = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are a technical writer for the AcreetionOS open-source operating system project (based on Arch Linux with Cinnamon desktop). Write an in-depth, informational blog post in markdown. Include a title (as # Heading), 3-5 substantive paragraphs, code snippets or terminal commands where relevant, and a short description line for SEO. Reference relevant upstream Arch Linux CVEs (search your knowledge for current real CVE IDs like CVE-2025-* or CVE-2026-*), mention upstream packages or kernel versions, and include practical security or performance advice. The post should be technically accurate, genuinely informative, and sound like it was written by a real person in the open-source community.',
      },
      {
        role: 'user',
        content: `Write a blog post about ${subject}, focusing on ${angle}. Return it in this format:

TITLE: <the title>
DESCRIPTION: <one-line SEO description>
TAGS: <comma-separated tags>
CONTENT:
<markdown content>`,
      },
    ],
    max_tokens: 600,
    temperature: 0.8,
  })

  const output = res.choices[0]?.message?.content?.trim()
  if (!output) throw new Error('AI returned empty response')

  const titleMatch = output.match(/TITLE:\s*(.+)/)
  const descMatch = output.match(/DESCRIPTION:\s*(.+)/)
  const tagsMatch = output.match(/TAGS:\s*(.+)/)
  const contentMatch = output.split('CONTENT:\n')?.[1]

  const title = titleMatch?.[1]?.trim() || 'Untitled Post'
  const description = descMatch?.[1]?.trim() || 'A post about acreetionos.'
  const tags = tagsMatch?.[1]?.split(',').map((t) => t.trim()) || ['update']
  const markdown = contentMatch?.trim() || output

  const slug = slugify(title)
  const filename = `${dateStr}-${slug}.md`

  const frontmatter = `---
title: "${title}"
description: "${description}"
pubDate: ${now.toISOString()}
tags:
${tags.map((t) => `  - ${t}`).join('\n')}
---

${markdown}
`

  await mkdir(POSTS_DIR, { recursive: true })
  const filepath = join(POSTS_DIR, filename)
  await writeFile(filepath, frontmatter, 'utf-8')

  console.log(`\n  ✓ Generated: ${filename}`)
  console.log(`  Title: ${title}`)
  console.log(`  Angle: ${angle}\n`)
}

main().catch((err) => {
  const status = err.status ? ` (HTTP ${err.status})` : ''
  console.error(`Fatal: ${err.message}${status}`)
  if (err.status === 401) {
    console.error('Hint: Your OpenRouter API key may be invalid or expired.')
    console.error('      Generate a new key at https://openrouter.ai/keys')
    console.error('      Also ensure OPENROUTER_MODEL secret is set in repo settings.')
  }
  process.exit(1)
})
