import { execSync } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { mkdirSync, writeFileSync, chmodSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

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
 *
 * opencode looks for auth in $HOME/.local/share/opencode/auth.json by default.
 * We write the file directly to that path with 0600 perms, then wipe it after.
 */
function runOpencode(prompt: string): string {
  // Allow explicit override, then try common npm global locations
  const opencodeBin =
    process.env.OPENCODE_BIN ||
    // Use npx when available (GitHub Actions) since npm global bins aren't on PATH
    'npx --yes opencode'
  const authJson = process.env.OPENCODE_AUTH_JSON
  const home = homedir()
  const opencodeDataDir = join(home, '.local', 'share', 'opencode')
  const authFile = join(opencodeDataDir, 'auth.json')
  let wroteAuth = false

  try {
    if (authJson) {
      // Write auth.json to the exact path opencode expects
      mkdirSync(opencodeDataDir, { recursive: true, mode: 0o700 })
      writeFileSync(authFile, authJson, { encoding: 'utf-8' })
      chmodSync(authFile, 0o600)
      wroteAuth = true
    }

    const result = execSync(`"${opencodeBin}" run ${JSON.stringify(prompt)}`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      env: {
        ...process.env,
        HOME: home,
        OPENCODE_NO_TELEMETRY: '1',
      },
      timeout: 120_000,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    })

    return result.trim()
  } finally {
    // Wipe credentials from disk the moment we're done
    // Only remove the auth file itself — never touch the rest of the dir
    if (wroteAuth) {
      try { rmSync(authFile, { force: true }) } catch { /* best-effort */ }
    }
  }
}

async function main() {
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)]
  const subject = process.env.CONTENT_PROMPT || 'acreetionos (acreetionos.org)'

  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]

  const prompt = `[SYSTEM]
You are a markdown blog post generator for AcreetionOS. Your ENTIRE response must be ONLY the structured format below — no greetings, no explanations, no conversation, no backticks, no extra text whatsoever. Just the raw output.

[FORMAT]
TITLE: <the title>
DESCRIPTION: <one-line SEO description>
TAGS: <comma-separated tags>
CONTENT:
<full markdown content starting with ## heading>

[TOPIC]
Write about ${subject}, focusing on ${angle}.

Include: 3-5 substantive paragraphs, code snippets where relevant, reference to real CVEs. Technically accurate, informative, genuine open-source community voice.`

  console.log(`Generating post about "${subject}" (angle: ${angle})...`)
  const output = runOpencode(prompt)
  if (!output) throw new Error('opencode returned empty response')

  // Try structured format first
  let title = 'Untitled Post'
  let description = 'A post about acreetionos.'
  let tags = ['update']
  let markdown = output

  const titleMatch = output.match(/^TITLE:\s*(.+)/im)
  const descMatch = output.match(/^DESCRIPTION:\s*(.+)/im)
  const tagsMatch = output.match(/^TAGS:\s*(.+)/im)

  // Find CONTENT: and take everything after it
  const contentSplit = output.split(/^CONTENT:\s*\n/im)
  const hasContent = contentSplit.length > 1

  if (titleMatch) title = titleMatch[1].trim()
  if (descMatch) description = descMatch[1].trim()
  if (tagsMatch) tags = tagsMatch[1].split(',').map((t) => t.trim())
  if (hasContent) markdown = contentSplit[1].trim()

  // Fallback: if no structured format was found, try to extract a title
  // from the first # Heading or first line
  if (!titleMatch && !hasContent) {
    const headingMatch = output.match(/^#\s+(.+)/m)
    if (headingMatch) title = headingMatch[1].trim()
    // Remove any conversational intro before the first heading
    const firstHeading = output.search(/^#/m)
    if (firstHeading > 0) markdown = output.slice(firstHeading).trim()
    else markdown = output
  }

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