import { requireUser } from '../../utils/session'
import { createOrRotatePersonalToken } from '../../utils/token'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const tokenInfo = await createOrRotatePersonalToken(user.id)
  return {
    success: true,
    token: tokenInfo.token,
    createdAt: tokenInfo.createdAt,
  }
})
