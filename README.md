# AcreetionOS Blog

SEO-optimized static blog for [AcreetionOS](https://acreetionos.org) — a cutting-edge operating system project.

Built with [Astro](https://astro.build). Maintained by Natalie.

## Features

- AI-powered blog post generation via OpenRouter
- RSS feed, sitemap, Schema.org structured data
- Dark theme with gradient accents, responsive, zero JavaScript
- Auto-deploys to GitHub Pages on push

## Quick Start

```bash
npm install
npm run dev        # dev server at localhost:4321
npm run build      # static build to dist/
```

## AI Post Generation

Generate a new blog post:

```bash
npm run generate-post
```

Requires `OPENROUTER_API_KEY` and `CONTENT_PROMPT` set in `.env` or as GitHub secrets.

## Deployment

Pushes to `main` auto-deploy to GitHub Pages. Posts auto-generate Mon/Wed/Fri at noon UTC.

## Stack

| What | How |
|---|---|
| Framework | Astro |
| AI | OpenRouter (free models) |
| Hosting | GitHub Pages |
| Fonts | Inter + JetBrains Mono |
---

## 🤖 Pullfrog AI Review

This repository uses **Pullfrog AI** to automatically review pull requests.

Pullfrog is an AI-powered code review agent that analyzes every PR for code quality,
security issues, performance problems, and best practice violations. Reviews appear
as inline PR comments and checks. Trigger manually by commenting `@pullfrog` on any PR.

Powered by OpenRouter.