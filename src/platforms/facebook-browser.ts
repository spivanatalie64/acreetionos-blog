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

    await page.goto(FACEBOOK_LOGIN, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await delay(3000)

    const dismissBtns = ['button:has-text("Allow")', 'button:has-text("Accept")', 'button:has-text("OK")', '[aria-label="Close"]']
    for (const sel of dismissBtns) {
      const el = await page.$(sel)
      if (el && (await el.isVisible())) { await el.click().catch(() => {}); await delay(1000) }
    }

    const emailInput = await page.waitForSelector('input[name="email"], input[type="text"]', { timeout: 10000 }).catch(() => null)
    if (emailInput) await emailInput.fill(config.email)
    else throw new Error('Could not find email field')

    const passInput = await page.waitForSelector('input[name="pass"], input[type="password"]', { timeout: 5000 }).catch(() => null)
    if (passInput) await passInput.fill(config.password)
    else throw new Error('Could not find password field')

    await delay(1000)

    const loginBtn = await page.$('button[name="login"], button[type="submit"], #loginbutton')
    if (loginBtn && (await loginBtn.isVisible())) {
      await loginBtn.click()
    } else {
      await page.keyboard.press('Enter')
    }

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
