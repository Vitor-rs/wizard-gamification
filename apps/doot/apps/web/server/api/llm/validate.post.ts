import { parseMarkdownGame } from '@doot-games/games/markdown'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) || {}
  const markdown = typeof body.markdown === 'string' ? body.markdown : ''

  if (!markdown.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Provide the game in markdown format.' })
  }

  const parsed = parseMarkdownGame(markdown)
  const rounds = parsed.rounds.map((r, i) => {
    const c = r.content as Record<string, unknown>
    return { n: i + 1, block: r.block, prompt: typeof c.prompt === 'string' ? c.prompt : '' }
  })
  const ok = parsed.warnings.length === 0

  return {
    ok,
    title: parsed.title,
    theme: parsed.themeId || 'doot',
    roundCount: parsed.rounds.length,
    rounds,
    warnings: parsed.warnings,
    next: ok ? 'Ready to save. Call POST /api/llm/save' : 'Please fix the warnings and validate again.',
  }
})
