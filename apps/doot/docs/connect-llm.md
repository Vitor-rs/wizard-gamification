# Connect Any LLM (Doot Universal MCP & OpenAPI Integration)

Doot provides client-agnostic AI integration using two standard protocols:
1. **Model Context Protocol (MCP)** via Streamable HTTP JSON-RPC 2.0 at `/mcp`
2. **OpenAPI 3.1 REST API** at `/api/llm/openapi.json`

This architecture allows **any AI model**—including Claude, ChatGPT (OpenAI), Cursor, Windsurf, Google Gemini, Ollama, LM Studio, LibreChat, and custom agents—to create, validate, and save interactive party games directly into user accounts, with **zero inference cost** to Doot.

---

## Protocols & Endpoints

| Protocol | Endpoint | Supported Models / Clients | Authentication |
|---|---|---|---|
| **MCP (HTTP)** | `/mcp` | Claude.ai, Claude Desktop, Cursor, Windsurf, LibreChat, Ollama, Cline, Roo Code | Bearer Token / OAuth 2.1 |
| **OpenAPI 3.1** | `/api/llm/openapi.json` | ChatGPT Custom Actions (GPTs), Google Gemini, LangChain, Custom REST bots | Bearer Token / API Key |

---

## 1. Authentication

Doot supports two authentication paths:

1. **Personal Access Token (API Key)**:
   - Available to logged-in users under `/connect` or generated via `POST /api/user/token`.
   - Sent in standard header: `Authorization: Bearer <TOKEN>` or `X-API-Key: <TOKEN>`.
   - Used by: Cursor, Windsurf, ChatGPT Actions, Gemini, Ollama, LibreChat, scripts.
2. **OAuth 2.1 with PKCE**:
   - Implemented via `better-auth` MCP plugin (RFC 9728 discovery at `/.well-known/oauth-protected-resource`).
   - Used by: Claude.ai Custom Connectors.

---

## 2. Setup Guides by Model & Client

### Claude (Anthropic)
- **Claude.ai / Claude Desktop (Custom Connector)**:
  - Open Settings &rarr; Connectors &rarr; Add custom connector.
  - URL: `https://doot.games/mcp` (or your local host `/mcp`).
- **Claude Code (CLI)**:
  ```bash
  claude mcp add --transport http doot https://doot.games/mcp
  ```
- **Claude Desktop (`claude_desktop_config.json`)**:
  ```json
  {
    "mcpServers": {
      "doot": {
        "url": "https://doot.games/mcp",
        "headers": {
          "Authorization": "Bearer <YOUR_PERSONAL_ACCESS_TOKEN>"
        }
      }
    }
  }
  ```

---

### ChatGPT (OpenAI)
1. In ChatGPT Plus/Team/Enterprise, go to **Explore GPTs** &rarr; **Create a GPT** &rarr; **Configure**.
2. Click **Create new action**.
3. In **Import from URL**, enter:
   `https://doot.games/api/llm/openapi.json`
4. Under **Authentication**, select **API Key**, type **Bearer**, and paste your Doot Personal Access Token.
5. In instructions, tell your GPT:
   > "You are the Doot Game Master. When asked to create party games, use the format guide action, generate games adhering to the schema, validate them, and save them to the user's account."

---

### Cursor & Windsurf
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "doot": {
      "url": "https://doot.games/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_PERSONAL_ACCESS_TOKEN>"
      }
    }
  }
}
```

---

### Google Gemini & Google AI Studio
Import the OpenAPI spec (`/api/llm/openapi.json`) into Gemini function calling, or connect via Gemini MCP extensions.

---

### Local Models (Ollama, LM Studio, LibreChat)
- **LibreChat / Open WebUI**:
  - Add Remote MCP server:
    - URL: `https://doot.games/mcp`
    - Header: `Authorization: Bearer <YOUR_PERSONAL_ACCESS_TOKEN>`

---

## 3. Available MCP Tools

| Tool | Type | Description |
|---|---|---|
| `list_game_types` | Read | Lists catalog game types, flagships, and building blocks. |
| `doot_format_guide` | Read | Markdown spec guide with round types, timers, scoring rules, and themes. |
| `validate_doot_game` | Read | Validates game markdown spec, returns round breakdown and warnings. |
| `save_game` | Write | Saves game to user account and returns playable/hostable links. |
| `list_my_games` | Read | Lists user's saved games. |
| `update_game` | Write | Updates rounds or configuration of an existing game. |
| `set_game_meta` | Write | Updates title, theme, tags, or visibility without re-sending rounds. |
| `remix_game` | Write | Quickly remixes a flagship game with a custom prompt list. |
| `save_deck` | Write | Creates a reusable content deck. |
| `upload_image` | Write | Uploads base64 image or fetches image from URL for round or cover art. |

---

## 4. Supported Themes
- `doot` (classic gold/charcoal)
- `wizard` (official Wizard Red `#E70022`, Navy `#021167`, Gold `#FFBA00`, Cyan `#00A6ED`)
- `cutesie` (pastel candy)
- `cyber` (neon cyberpunk)
- `professional` (clean corporate)
- `playful` (bright party)
