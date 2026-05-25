import 'dotenv/config'

export interface BlueskyConfig {
  handle: string
  password: string
}

export interface MastodonConfig {
  instance: string
  token: string
}

export interface FacebookConfig {
  pageId: string
  accessToken: string
}

export interface TwitterConfig {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

export interface Config {
  bluesky?: BlueskyConfig
  mastodon?: MastodonConfig
  facebook?: FacebookConfig
  twitter?: TwitterConfig
}

export function loadConfig(): Config {
  return {
    bluesky:
      process.env.BLUESKY_HANDLE && process.env.BLUESKY_APP_PASSWORD
        ? {
            handle: process.env.BLUESKY_HANDLE,
            password: process.env.BLUESKY_APP_PASSWORD,
          }
        : undefined,
    mastodon:
      process.env.MASTODON_INSTANCE && process.env.MASTODON_ACCESS_TOKEN
        ? {
            instance: process.env.MASTODON_INSTANCE,
            token: process.env.MASTODON_ACCESS_TOKEN,
          }
        : undefined,
    facebook:
      process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN
        ? {
            pageId: process.env.FACEBOOK_PAGE_ID,
            accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
          }
        : undefined,
    twitter:
      process.env.TWITTER_API_KEY &&
      process.env.TWITTER_API_SECRET &&
      process.env.TWITTER_ACCESS_TOKEN &&
      process.env.TWITTER_ACCESS_TOKEN_SECRET
        ? {
            apiKey: process.env.TWITTER_API_KEY,
            apiSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
          }
        : undefined,
  }
}
