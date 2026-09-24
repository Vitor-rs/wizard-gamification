import { parseMarkdownGame } from '@doot-games/games/markdown'
import { createGame, gameInputSchema } from '../../utils/games-repo'
import { requireLlmUser } from '../../utils/llm-auth'

const KNOWN_THEMES = new Set(['doot', 'wizard', 'cutesie', 'cyber', 'professional', 'playful'])
const BASE = process.env.PUBLIC_BASE_URL || 'http://localhost:3000'

export default defineEventHandler(async (event) => {
  const user = await requireLlmUser(event)
  const body = (await readBody(event)) || {}
  const markdown = typeof body.markdown === 'string' ? body.markdown : ''

  if (!markdown.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Provide markdown in request body.' })
  }

  const parsed = parseMarkdownGame(markdown)
  if (!parsed.rounds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: `No valid rounds parsed from markdown. ${parsed.warnings.join(' ')}`,
    })
  }

  const title = (typeof body.title === 'string' && body.title.trim() ? body.title.trim() : parsed.title).slice(0, 120)
  const allRounds = parsed.rounds.map((r) => ({ block: r.block, content: r.content as Record<string, unknown> }))
  const rounds = allRounds.slice(0, 50)

  const reqTheme = typeof body.theme === 'string' ? body.theme.toLowerCase().trim() : undefined
  const chosenTheme = reqTheme && KNOWN_THEMES.has(reqTheme) ? reqTheme : (parsed.themeId && KNOWN_THEMES.has(parsed.themeId) ? parsed.themeId : 'doot')

  const visibility = body.visibility === 'public' || body.visibility === 'unlisted' ? body.visibility : (parsed.visibility ?? 'private')
  const forkable = typeof body.remixable === 'boolean' ? body.remixable : (parsed.forkable ?? false)
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 300) : parsed.description
  const tags = Array.isArray(body.tags) ? body.tags.slice(0, 8) : parsed.tags

  const input = gameInputSchema.safeParse({
    pluginId: 'custom',
    themeId: chosenTheme,
    visibility,
    ...(description ? { description } : {}),
    forkable,
    ...(tags?.length ? { tags } : {}),
    config: { title, rounds, ...(parsed.decks ? { decks: parsed.decks } : {}) },
  })

  if (!input.success) {
    throw createError({
      statusCode: 400,
      statusMessage: `Validation failed: ${input.error.issues.map((i) => i.message).join('; ')}`,
    })
  }

  const { id } = await createGame(input.data, user.id)

  return {
    saved: true,
    gameId: id,
    title,
    theme: chosenTheme,
    visibility,
    remixable: forkable,
    gameUrl: `${BASE}/g/${id}`,
    hostUrl: `${BASE}/host/g/${id}`,
    editUrl: `${BASE}/editor/g/${id}`,
    message: `Game "${title}" saved successfully to your account!`,
  }
})
