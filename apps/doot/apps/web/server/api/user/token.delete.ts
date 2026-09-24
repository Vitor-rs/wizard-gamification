import { requireUser } from '../../utils/session'
import { revokePersonalToken } from '../../utils/token'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  await revokePersonalToken(user.id)
  return { success: true }
})
