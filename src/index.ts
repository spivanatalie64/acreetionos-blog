#!/usr/bin/env node

import { Command } from 'commander'
import { loadConfig } from './config.js'
import { generatePost } from './generate.js'
import { postToBluesky } from './platforms/bluesky.js'
import { postToMastodon } from './platforms/mastodon.js'
import { postToFacebook } from './platforms/facebook.js'
import { postToTwitter } from './platforms/twitter.js'
import type { PostResult } from './types.js'

const program = new Command()

program
  .name('crosspost')
  .description('Post to multiple social media platforms via their APIs')
  .option('-t, --text <text>', 'Text content of the post')
  .option('-g, --generate [topic]', 'Generate post text using AI (optional topic)')
  .option('-i, --image <path>', 'Path to an image to attach')
  .parse(process.argv)

const options = program.opts()

if (!options.text && !options.generate) {
  console.error('Provide either --text or --generate')
  process.exit(1)
}

if (options.text && options.generate) {
  console.error('Use either --text or --generate, not both')
  process.exit(1)
}

async function main(): Promise<void> {
  const text = options.text ?? (await generatePost(options.generate))

  console.log(`\n  Post: "${text}"\n`)

  const config = loadConfig()
  const posts: Promise<PostResult>[] = []

  if (config.bluesky) posts.push(postToBluesky(config.bluesky, text, options.image))
  if (config.mastodon) posts.push(postToMastodon(config.mastodon, text, options.image))
  if (config.facebook) posts.push(postToFacebook(config.facebook, text, options.image))
  if (config.twitter) posts.push(postToTwitter(config.twitter, text, options.image))

  if (posts.length === 0) {
    console.error('No platforms configured.')
    console.error('Copy .env.example → .env and fill in credentials for at least one platform.')
    process.exit(1)
  }

  const results = await Promise.all(posts)

  console.log()
  for (const r of results) {
    if (r.success) {
      console.log(`  \u2713 ${r.platform}${r.url ? ` \u2192 ${r.url}` : ''}`)
    } else {
      console.log(`  \u2717 ${r.platform} \u2014 ${r.error}`)
    }
  }
  console.log()

  const failures = results.filter((r) => !r.success)
  if (failures.length > 0) process.exit(2)
}

main().catch((err: Error) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
