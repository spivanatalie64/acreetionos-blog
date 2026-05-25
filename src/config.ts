import 'dotenv/config'

export interface MastodonConfig {
  instance: string
  token: string
}

export interface FacebookBrowserConfig {
  email: string
  password: string
  groupId: string
}

export interface ThreadsConfig {
  userId: string
  accessToken: string
}

export interface TwitterConfig {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

export interface Config {
  mastodon?: MastodonConfig
  facebook?: FacebookBrowserConfig
  facebookDarren?: FacebookBrowserConfig
  threads?: ThreadsConfig
  twitter?: TwitterConfig
}

export function loadConfig(): Config {
  return {
    mastodon:
      process.env.MASTODON_INSTANCE && process.env.MASTODON_ACCESS_TOKEN
        ? {
            instance: process.env.MASTODON_INSTANCE,
            token: process.env.MASTODON_ACCESS_TOKEN,
          }
        : undefined,
    facebook:
      process.env.FACEBOOK_EMAIL && process.env.FACEBOOK_PASSWORD && process.env.FACEBOOK_GROUP_ID
        ? {
            email: process.env.FACEBOOK_EMAIL,
            password: process.env.FACEBOOK_PASSWORD,
            groupId: process.env.FACEBOOK_GROUP_ID,
          }
        : undefined,
    facebookDarren:
      process.env.FACEBOOK_DARREN_EMAIL && process.env.FACEBOOK_DARREN_PASSWORD
        ? {
            email: process.env.FACEBOOK_DARREN_EMAIL,
            password: process.env.FACEBOOK_DARREN_PASSWORD,
            groupId: process.env.FACEBOOK_GROUP_ID || '574717645277790',
          }
        : undefined,
    threads:
      process.env.THREADS_USER_ID && process.env.THREADS_ACCESS_TOKEN
        ? {
            userId: process.env.THREADS_USER_ID,
            accessToken: process.env.THREADS_ACCESS_TOKEN,
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
