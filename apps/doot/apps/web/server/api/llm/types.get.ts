import { gameCatalog } from '@doot-games/games/catalog'

export default defineEventHandler(() => {
  return {
    gameTypes: gameCatalog.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      flagship: !!g.flagship,
    })),
  }
})
