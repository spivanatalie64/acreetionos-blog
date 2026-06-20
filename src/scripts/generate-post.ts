import { execFileSync } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { mkdirSync, writeFileSync, chmodSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir, homedir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const POSTS_DIR = join(__dirname, '..', 'content', 'posts')

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

/**
 * Run opencode CLI with a prompt and return the output.
 * Reads OPENCODE_AUTH_JSON from env to set up credentials securely.
 * The auth file is written to a temp directory with restricted permissions
 * and cleaned up immediately after use.
 */
function runOpencode(prompt: string): string {
  const opencodeBin = process.env.OPENCODE_BIN || 'opencode'
  const authJson = process.env.OPENCODE_AUTH_JSON
  let authDir: string | null = null

  try {
    // Write auth.json with restricted 0600 permissions before running opencode
    if (authJson) {
      const runnerTemp = process.env.RUNNER_TEMP
      authDir = runnerTemp
        ? join(runnerTemp, 'opencode-auth-' + Date.now())
        : join(tmpdir(), 'opencode-auth-' + Date.now())
      mkdirSync(authDir, { recursive: true, mode: 0o700 })
      const authFile = join(authDir, 'auth.json')
      writeFileSync(authFile, authJson, { mode: 0o600, encoding: 'utf-8' })
      chmodSync(authFile, 0o600)
    }

    const result = execFileSync(opencodeBin, ['run', prompt], {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      env: {
        ...process.env,
        HOME: homedir(),
        XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || join(homedir(), '.config'),
        OPENCODE_NO_TELEMETRY: '1',
      },
      timeout: 120_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    return result.trim()
  } finally {
    // Wipe credentials from disk immediately — never leave secrets lying around
    if (authDir) {
      try {
        rmSync(authDir, { recursive: true, force: true })
      } catch {
        // best-effort cleanup, dir is temp anyway
      }
    }
  }
}

async function main() {
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)]
  const subject = process.env.CONTENT_PROMPT || 'acreetionos (acreetionos.org)'

  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]

  const prompt = `You are a technical writer for the AcreetionOS open-source operating system project (based on Arch Linux with Cinnamon desktop). Write an in-depth, informational blog post in markdown. Include a title, 3-5 substantive paragraphs, code snippets or terminal commands where relevant, and a short description line for SEO. Reference relevant upstream Arch Linux CVEs, mention upstream packages or kernel versions, and include practical security or performance advice. The post should be technically accurate, genuinely informative, and sound like it was written by a real person in the open-source community.

Write a blog post about ${subject}, focusing on ${angle}. Return it in this format:

TITLE: <the title>
DESCRIPTION: <one-line SEO description>
TAGS: <comma-separated tags>
CONTENT:
<markdown content>`

  console.log(`Generating post about "${subject}" (angle: ${angle})...`)
  const output = runOpencode(prompt)
  if (!output) throw new Error('opencode returned empty response')

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
  console.error(`Fatal: ${err.message}`)
  process.exit(1)
})