import axios from 'axios'
import FormData from 'form-data'
import { readFile } from 'node:fs/promises'
import type { MastodonConfig } from '../config.js'
import type { PostResult } from '../types.js'

export async function postToMastodon(
  config: MastodonConfig,
  text: string,
  imagePath?: string,
): Promise<PostResult> {
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
    }

    let mediaIds: string[] = []

    if (imagePath) {
      const img = await readFile(imagePath)
      const form = new FormData()
      form.append('file', img, { filename: imagePath.split('/').pop() || 'image' })

      const mediaRes = await axios.post(
        `${config.instance}/api/v2/media`,
        form,
        { headers: { ...headers, ...form.getHeaders() } },
      )
      mediaIds = [mediaRes.data.id]
    }

    const res = await axios.post(
      `${config.instance}/api/v1/statuses`,
      { status: text, media_ids: mediaIds },
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    )

    const postId = res.data.id
    const acct = res.data.account.acct

    return {
      platform: 'Mastodon',
      success: true,
      url: `${config.instance}/@${acct}/${postId}`,
    }
  } catch (err: any) {
    const msg = err?.response?.data?.error || err.message
    return { platform: 'Mastodon', success: false, error: msg }
  }
}
