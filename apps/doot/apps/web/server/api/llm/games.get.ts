import { listMyGames } from '../../utils/games-repo'
import { requireLlmUser } from '../../utils/llm-auth'

const BASE = process.env.PUBLIC_BASE_URL || 'http://localhost:3000'

export default defineEventHandler(async (event) => {
  const user = await requireLlmUser(event)
  const userGames = await listMyGames(user.id)

  return {
    games: userGames.map((g) => ({
      gameId: g.id,
      title: g.title,
      type: g.pluginId,
      visibility: g.visibility,
      remixable: g.forkable,
      description: g.description || null,
      tags: g.tags,
      hasCover: !!g.coverImage,
      gameUrl: `${BASE}/g/${g.id}`,
      hostUrl: `${BASE}/host/g/${g.id}`,
      editUrl: `${BASE}/editor/g/${g.id}`,
    })),
  }
})
