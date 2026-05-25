import { chromium } from 'playwright'
import type { PostResult } from '../types.js'

interface FacebookBrowserConfig {
  email: string
  password: string
  groupId: string
}

const FACEBOOK_LOGIN = 'https://www.facebook.com/login'
const VIEWPORT = { width: 1280, height: 800 }

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function postToFacebookBrowser(
  config: FacebookBrowserConfig,
  text: string,
): Promise<PostResult> {
  const browser = await chromium.launch({ headless: true })
  let success = false
  let url: string | undefined
  let error: string | undefined

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      locale: 'en-US',
    })

    const page = await context.newPage()

    await page.goto(FACEBOOK_LOGIN, { waitUntil: 'networkidle' })
    await delay(2000)

    await page.fill('input[name="email"]', config.email)
    await page.fill('input[name="pass"]', config.password)
    await delay(500)
    await page.click('button[name="login"]')
    await page.waitForLoadState('networkidle')
    await delay(3000)

    const groupUrl = `https://www.facebook.com/groups/${config.groupId}`
    await page.goto(groupUrl, { waitUntil: 'networkidle' })
    await delay(2000)

    const composerSelectors = [
      'div[role="button"] span:has-text("Write something")',
      'div[aria-label*="Write"]',
      'div[role="button"]:has-text("Write something")',
      'div[data-testid="composer-fab"]',
    ]

    let composerClicked = false
    for (const sel of composerSelectors) {
      const el = await page.$(sel)
      if (el) {
        await el.click()
        await delay(1500)
        composerClicked = true
        break
      }
    }

    if (!composerClicked) {
      throw new Error('Could not find the post composer')
    }

    const textboxSelectors = [
      'div[role="textbox"][contenteditable="true"]',
      'div[aria-label*="Write something"]',
      'div[contenteditable="true"]',
      'div[data-testid="composer-input"]',
      'div.notranslate[contenteditable="true"]',
    ]

    let typed = false
    for (const sel of textboxSelectors) {
      const el = await page.$(sel)
      if (el) {
        await el.click()
        await delay(300)
        await el.fill(text)
        typed = true
        break
      }
    }

    if (!typed) {
      await page.keyboard.type(text, { delay: 30 })
    }

    await delay(500)

    const postButtonSelectors = [
      'div[role="button"] span:has-text("Post")',
      'div[aria-label="Post"]',
      'div[role="button"]:has-text("Post")',
      'button:has-text("Post")',
    ]

    let posted = false
    for (const sel of postButtonSelectors) {
      const el = await page.$(sel)
      if (el && (await el.isVisible())) {
        await el.click()
        await delay(2000)
        posted = true
        break
      }
    }

    if (!posted) {
      await page.keyboard.press('Enter')
      await delay(2000)
    }

    await delay(1000)

    url = groupUrl
    success = true
  } catch (err: any) {
    error = err.message
  } finally {
    await browser.close()
  }

  return {
    platform: `Facebook (${config.email})`,
    success,
    url,
    error,
  }
}
