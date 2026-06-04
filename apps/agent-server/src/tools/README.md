# Tools for OhMyAgent

Multi-provider web search and page fetching tools for AGENT.

## Structure

```
tools/
├── index.ts                    # Main export and tool registry
├── executor.ts                 # Simple tool executor (MVP)
├── websearch/
│   ├── index.ts               # WebSearch tool definition
│   ├── types.ts               # Common types
│   └── providers/
│       ├── base.ts            # Base provider class
│       ├── baidu.ts           # Baidu provider ✅ (implemented)
│       ├── google.ts          # Google provider (placeholder)
│       ├── reddit.ts          # Reddit provider (placeholder)
│       ├── arxiv.ts           # Arxiv provider (placeholder)
│       └── hackernews.ts      # HN provider (placeholder)
└── webfetch/
    ├── index.ts               # WebFetch tool definition
    └── types.ts               # Common types
```

## Available Tools

### websearch (Implemented - Baidu)

Multi-provider web search tool. Currently supports Baidu search with Qiniu API.

**Usage:**
```typescript
websearch(query="your search query")
websearch(query="...", provider="baidu", max_results=10)
```

**Parameters:**
- `query` (required): Search query
- `provider` (optional): Search provider (default: baidu)
- `max_results` (optional): Max results (default: 10, max: 50)
- `time_filter` (optional): week, month, year, semiyear
- `site_filter` (optional): Comma-separated list of sites

**Setup:**
1. Get API key from https://api.qnaigc.com/v1
2. Set `QINIU_API_KEY` environment variable
3. Restart the agent server

### webfetch (Not Implemented)

Fetch full page content from URLs. Placeholder for future implementation.

**Planned Features:**
- Markdown extraction using trafilatura
- Support for articles, papers, posts
- Content truncation for large pages

## Provider Status

| Provider | Status | Notes |
|----------|--------|-------|
| Baidu | ✅ Implemented | Qiniu API integration complete |
| Google | 🔲 Placeholder | Requires Google API setup |
| Reddit | 🔲 Placeholder | RSS fallback available |
| Arxiv | 🔲 Placeholder | No auth required |
| HackerNews | 🔲 Placeholder | No auth required |

## Adding New Providers

1. Create new provider file in `websearch/providers/`
2. Extend `BaseSearchProvider` class
3. Implement `search()` and `isAvailable()` methods
4. Add to provider registry in `websearch/index.ts`
5. Add to `SearchProvider` enum in `types.ts`

Example:
```typescript
import { BaseSearchProvider } from './base'
import type { SearchRequest, SearchResponse } from '../types'

export class CustomProvider extends BaseSearchProvider {
  name = 'custom'

  isAvailable(): boolean {
    return !!process.env.CUSTOM_API_KEY
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    // Implementation here
  }
}
```

## Integration with AGENT

Post-MVP, tools will be integrated with full AGENT framework:

```typescript
import { Agent } from '@earendil-works/pi-agent-core'
import { getEnabledTools } from './tools'

const agent = new Agent({
  initialState: {
    systemPrompt: "You are a helpful assistant...",
    tools: getEnabledTools()
  }
})
```

## Environment Variables

```bash
# Required for Baidu search
QINIU_API_KEY=your_qiniu_api_key

# Optional: Future providers
GOOGLE_API_KEY=
GOOGLE_SEARCH_CX=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
```

## Testing

Test the tools manually:

```bash
# Test websearch
curl -X POST http://localhost:4000/api/test/tools/websearch \
  -H "Content-Type: application/json" \
  -d '{"query": "test search", "provider": "baidu"}'
```

## References

- Baidu API: https://api.qnaigc.com/v1
- Google Search API: https://developers.google.com/custom-search/v1/overview
- Reddit API: https://www.reddit.com/dev/api/
- Arxiv API: https://arxiv.org/help/api
- HackerNews API: https://github.com/HackerNews/API
- vibe-coding-setup skills: `~/Documents/codes/opensource/vibe-coding-setup/skills/`
