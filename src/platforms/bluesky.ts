import { BskyAgent } from '@atproto/api'
import { readFile } from 'node:fs/promises'
import type { BlueskyConfig } from '../config.js'
import type { PostResult } from '../types.js'

function mimeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'jpg': case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    default: return 'application/octet-stream'
  }
}

export async function postToBluesky(
  config: BlueskyConfig,
  text: string,
  imagePath?: string,
): Promise<PostResult> {
  try {
    const agent = new BskyAgent({ service: 'https://bsky.social' })
    await agent.login({ identifier: config.handle, password: config.password })

    if (imagePath) {
      const img = await readFile(imagePath)
      const mime = mimeFromPath(imagePath)
      const { data: upload } = await agent.uploadBlob(img, { encoding: mime })

      await agent.post({
        text,
        embed: {
          $type: 'app.bsky.embed.images',
          images: [{ alt: '', image: upload.blob }],
        },
      })
    } else {
      await agent.post({ text })
    }

    return { platform: 'Bluesky', success: true }
  } catch (err: any) {
    return { platform: 'Bluesky', success: false, error: err.message }
  }
}
