import axios from 'axios'
import OAuth from 'oauth-1.0a'
import { createHmac } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { TwitterConfig } from '../config.js'
import type { PostResult } from '../types.js'

function buildOAuth(config: TwitterConfig): OAuth {
  return new OAuth({
    consumer: { key: config.apiKey, secret: config.apiSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString: string, key: string) {
      return createHmac('sha1', key).update(baseString).digest('base64')
    },
  })
}

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

export async function postToTwitter(
  config: TwitterConfig,
  text: string,
  imagePath?: string,
): Promise<PostResult> {
  try {
    const oauth = buildOAuth(config)
    const token = { key: config.accessToken, secret: config.accessTokenSecret }
    let mediaIds: string[] = []

    if (imagePath) {
      const img = await readFile(imagePath)
      const base64 = img.toString('base64')
      const mediaData = { media_data: base64, media_type: mimeFromPath(imagePath) }

      const authHeader = oauth.toHeader(
        oauth.authorize(
          { url: 'https://upload.twitter.com/1.1/media/upload.json', method: 'POST', data: mediaData },
          token,
        ),
      )

      const mediaRes = await axios.post(
        'https://upload.twitter.com/1.1/media/upload.json',
        new URLSearchParams(mediaData).toString(),
        { headers: { ...authHeader, 'Content-Type': 'application/x-www-form-urlencoded' } },
      )
      mediaIds = [mediaRes.data.media_id_string]
    }

    const tweetUrl = 'https://api.twitter.com/2/tweets'
    const body: Record<string, unknown> = { text }
    if (mediaIds.length > 0) {
      body.media = { media_ids: mediaIds }
    }

    const authHeader = oauth.toHeader(
      oauth.authorize({ url: tweetUrl, method: 'POST' }, token),
    )

    const res = await axios.post(tweetUrl, body, {
      headers: { ...authHeader, 'Content-Type': 'application/json' },
    })

    return {
      platform: 'Twitter/X',
      success: true,
      url: `https://x.com/i/status/${res.data.data.id}`,
    }
  } catch (err: any) {
    const msg =
      err?.response?.data?.detail ||
      err?.response?.data?.title ||
      err.message
    return { platform: 'Twitter/X', success: false, error: msg }
  }
}
