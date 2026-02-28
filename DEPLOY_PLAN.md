# Deployment Plan: Poetry Bot on the Internet

Written 2026-02-28. Ready-to-implement instructions for moving from local Ollama to a deployed web app with cloud LLM APIs.

## Overview

Current stack: SvelteKit + adapter-node + SQLite + Ollama (local)
Target stack: SvelteKit + adapter-node + SQLite (persistent volume) + OpenRouter API

The app stays almost identical. Two things change:
1. LLM calls go through OpenRouter instead of local Ollama
2. The server runs on a VPS/PaaS instead of localhost

---

## Part 1: Replace Ollama with OpenRouter

OpenRouter provides an OpenAI-compatible API that routes to dozens of models. One API key, swap models per-call.

### 1A. Add config

Replace the `ollama` section in `config.yaml`:

```yaml
# REMOVE this:
# ollama:
#   url: http://localhost:11434
#   model: gemma3:4b
#   temperature: 0.8

# ADD this:
llm:
  provider: openrouter                    # only provider for now
  api_key_env: OPENROUTER_API_KEY         # reads from env var
  default_model: google/gemini-flash-2.0  # cheap, good enough for most tasks
  creative_model: anthropic/claude-3.5-haiku-20241022  # for poem gen + voice reflection
  temperature: 0.8
  creative_temperature: 0.9
  base_url: https://openrouter.ai/api/v1
```

Update the `Config` interface in `src/lib/types.ts`:

```ts
// REMOVE ollama section, ADD:
llm: {
  provider: string;
  api_key_env: string;
  default_model: string;
  creative_model: string;
  temperature: number;
  creative_temperature: number;
  base_url: string;
};
```

Update defaults in `src/lib/server/config.ts` to match.

### 1B. New LLM client

Replace `src/lib/server/ollama.ts` with `src/lib/server/llm.ts`. The public interface stays identical so nothing else needs to change.

```ts
// src/lib/server/llm.ts
import { getConfig } from './config';

interface ChatResponse {
  choices: { message: { content: string } }[];
}

function getApiKey(): string {
  const config = getConfig();
  const key = process.env[config.llm.api_key_env];
  if (!key) throw new Error(`Missing env var: ${config.llm.api_key_env}`);
  return key;
}

export async function generate(
  prompt: string,
  options?: { temperature?: number; model?: string }
): Promise<string> {
  const config = getConfig();
  const url = `${config.llm.base_url}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
      'HTTP-Referer': 'https://poetry-bot.app',   // OpenRouter requires this
      'X-Title': 'Poetry Bot'
    },
    body: JSON.stringify({
      model: options?.model || config.llm.default_model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? config.llm.temperature
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as ChatResponse;
  return data.choices[0].message.content.trim();
}

export async function generateStream(
  prompt: string,
  options?: { temperature?: number; model?: string }
): Promise<ReadableStream<string>> {
  const config = getConfig();
  const url = `${config.llm.base_url}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
      'HTTP-Referer': 'https://poetry-bot.app',
      'X-Title': 'Poetry Bot'
    },
    body: JSON.stringify({
      model: options?.model || config.llm.default_model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? config.llm.temperature,
      stream: true
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API error ${res.status}: ${text}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      const chunk = decoder.decode(value, { stream: true });
      // OpenAI SSE format: data: {"choices":[{"delta":{"content":"..."}}]}
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        try {
          const obj = JSON.parse(line.slice(6));
          const content = obj.choices?.[0]?.delta?.content;
          if (content) controller.enqueue(content);
          if (obj.choices?.[0]?.finish_reason) {
            controller.close();
            return;
          }
        } catch {
          // partial line, skip
        }
      }
    }
  });
}
```

### 1C. Update all imports

Find-and-replace across the codebase:

```
FROM: import { generate } from './ollama';
  TO: import { generate } from './llm';

FROM: import { generate, generateStream } from './ollama';
  TO: import { generate, generateStream } from './llm';
```

Files that import from ollama.ts:
- src/lib/server/poems.ts
- src/lib/server/particles.ts
- src/lib/server/research.ts (if it exists)
- src/lib/server/critique.ts

### 1D. Route creative tasks to the creative model

In `src/lib/server/poems.ts`, pass the creative model for poem generation:

```ts
const config = getConfig();
const raw = await generate(prompt, {
  model: config.llm.creative_model,
  temperature: config.llm.creative_temperature
});
```

Same for `generatePoemStream()`.

In `src/lib/server/critique.ts`, use creative model for voice reflection:

```ts
// In doVoiceReflection():
const raw = await generate(prompt, {
  model: config.llm.creative_model,
  temperature: config.voice.critique_temperature
});
```

Keep the default model for everything else (particle extraction, research, interest generation, critique). These are analytical tasks where Gemini Flash is fine.

### 1E. Delete ollama.ts

Once everything is migrated, delete `src/lib/server/ollama.ts`.

---

## Part 2: Deploy the Server

### Option A: Railway (recommended for simplicity)

1. Push to GitHub
2. Create Railway project, connect repo
3. Railway auto-detects Node, builds with `npm run build`
4. Set env vars:
   - `OPENROUTER_API_KEY=sk-or-...`
   - `NODE_ENV=production`
5. Add a persistent volume mounted at `/data`
6. Update `config.yaml`:
   ```yaml
   database:
     path: /data/poetry-bot.db
   ```
7. Railway gives you a URL like `poetry-bot-production.up.railway.app`

Cost: ~$5/mo for always-on server with persistent storage.

### Option B: Fly.io

1. `fly launch` in project root
2. Add to `fly.toml`:
   ```toml
   [mounts]
     source = "poetry_data"
     destination = "/data"
   ```
3. `fly secrets set OPENROUTER_API_KEY=sk-or-...`
4. `fly deploy`

Cost: ~$3-5/mo. Slightly more setup than Railway.

### Option C: Cheap VPS (Hetzner/BuyVM)

Most cost-effective if you want full control. $3.50/mo for a Hetzner CX22.

1. Set up Node 20+, nginx reverse proxy, systemd service
2. Clone repo, `npm ci && npm run build`
3. Create systemd unit:
   ```ini
   [Service]
   ExecStart=/usr/bin/node build/index.js
   Environment=OPENROUTER_API_KEY=sk-or-...
   Environment=PORT=3000
   WorkingDirectory=/opt/poetry-bot
   ```
4. nginx config to proxy port 3000
5. Certbot for HTTPS

More manual but cheapest long-term option.

---

## Part 3: Security Considerations for Public Deployment

These are things that don't matter when running locally but do matter on the internet:

### 3A. Authentication

The app currently has no auth. Anyone who finds the URL can generate poems (costing you API money) and submit feedback. Options:

- **Simple password gate:** Add a middleware that checks a cookie against a `AUTH_PASSWORD` env var. One password, shared. Good enough for a personal tool.
- **SvelteKit hooks approach:** Create `src/hooks.server.ts` that checks for a session cookie on all routes. Redirect to a `/login` page if missing.

Simplest version (add to `src/hooks.server.ts`):

```ts
import type { Handle } from '@sveltejs/kit';

const PASSWORD = process.env.AUTH_PASSWORD;

export const handle: Handle = async ({ event, resolve }) => {
  // Skip auth if no password configured (local dev)
  if (!PASSWORD) return resolve(event);

  // Skip the login endpoint itself
  if (event.url.pathname === '/login') return resolve(event);

  const authed = event.cookies.get('poetry-auth');
  if (authed !== PASSWORD) {
    // API routes get 401, pages get redirected
    if (event.url.pathname.startsWith('/api/')) {
      return new Response('Unauthorized', { status: 401 });
    }
    return new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });
  }

  return resolve(event);
};
```

### 3B. Rate limiting

Prevent someone from hammering the poem generation endpoint. Simple in-memory rate limiter in the API routes -- allow 5 poem generations per hour.

### 3C. Environment variables

Move all secrets to env vars:
- `OPENROUTER_API_KEY`
- `AUTH_PASSWORD`
- `NTFY_TOPIC` (if you want per-deployment topics)

---

## Part 4: Cost Estimates

Assuming the agent runs 24/7, generating ~3-5 poems/day with critique + voice reflection:

| Task | Calls/day | Tokens/call | Model | Cost/day |
|------|-----------|-------------|-------|----------|
| Poem generation | 5 | ~1500 out | Claude Haiku | $0.03 |
| Self-critique | 5 | ~800 out | Gemini Flash | <$0.01 |
| Particle extraction | 10 | ~300 out | Gemini Flash | <$0.01 |
| Voice reflection | 1 | ~500 out | Claude Haiku | <$0.01 |
| Research/interests | 5 | ~400 out | Gemini Flash | <$0.01 |

**Total LLM cost: ~$1-2/month**
**Hosting: ~$3-7/month**
**Grand total: ~$5-9/month**

---

## Implementation Order

1. Create `src/lib/server/llm.ts` (new OpenRouter client)
2. Update config types, defaults, and `config.yaml`
3. Update all imports from `ollama` to `llm`
4. Add creative model routing to poem gen + voice reflection
5. Delete `ollama.ts`
6. Test locally with OpenRouter API key in env
7. Add auth middleware
8. Deploy to Railway/Fly.io/VPS
9. Set env vars, attach persistent volume
10. Verify agent loop runs, poems generate, DB persists across restarts

---

## Keeping Local Dev Working

To keep Ollama working for local development, you could:

- Keep `ollama.ts` around as an alternative provider
- Switch based on `config.llm.provider`:
  - `provider: ollama` -> use ollama.ts logic
  - `provider: openrouter` -> use the new OpenRouter logic

This way `config.yaml` on your local machine stays pointed at Ollama, and the deployed version uses OpenRouter via env-var overrides.
