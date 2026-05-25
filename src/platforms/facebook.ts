import axios from 'axios'
import FormData from 'form-data'
import { readFile } from 'node:fs/promises'
import type { FacebookConfig } from '../config.js'
import type { PostResult } from '../types.js'

export async function postToFacebook(
  config: FacebookConfig,
  text: string,
  imagePath?: string,
): Promise<PostResult> {
  try {
    const base = `https://graph.facebook.com/v21.0/${config.pageId}`

    if (imagePath) {
      const img = await readFile(imagePath)
      const form = new FormData()
      form.append('message', text)
      form.append('source', img, { filename: imagePath.split('/').pop() || 'image' })
      form.append('access_token', config.accessToken)

      await axios.post(`${base}/photos`, form, { headers: form.getHeaders() })
    } else {
      await axios.post(`${base}/feed`, {
        message: text,
        access_token: config.accessToken,
      })
    }

    return { platform: 'Facebook', success: true }
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err.message
    return { platform: 'Facebook', success: false, error: msg }
  }
}
