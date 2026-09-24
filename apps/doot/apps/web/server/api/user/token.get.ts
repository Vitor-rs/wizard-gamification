import { optionalUser, requireUser } from '../../utils/session'
import { getUserPersonalToken } from '../../utils/token'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const tokenInfo = await getUserPersonalToken(user.id)
  return {
    authenticated: true,
    token: tokenInfo?.token || null,
    createdAt: tokenInfo?.createdAt || null,
  }
})
