/**
 * Authentication resolver for LLM REST API endpoints (ChatGPT Actions, Gemini, scripts).
 * Supports Bearer tokens from oauthAccessToken, X-API-Key, or active session cookies.
 */
import type { H3Event } from 'h3'
import { createClient } from '@libsql/client'
import { databaseUrl } from './db'
import { optionalUser } from './session'

export interface LlmUser {
  id: string
}

export async function resolveLlmUser(event: H3Event): Promise<LlmUser | null> {
  const authHeader = getRequestHeader(event, 'authorization')
  const apiKey = getRequestHeader(event, 'x-api-key') || (getQuery(event).apiKey as string | undefined)

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : apiKey?.trim()

  if (token) {
    const client = createClient({ url: databaseUrl() })
    const result = await client.execute({
      sql: `SELECT userId FROM oauthAccessToken WHERE accessToken = ? LIMIT 1`,
      args: [token],
    })
    if (result.rows.length && result.rows[0]?.userId) {
      return { id: String(result.rows[0].userId) }
    }
  }

  // Fallback to active browser cookie session
  const cookieUser = await optionalUser(event)
  if (cookieUser) {
    return { id: cookieUser.id }
  }

  return null
}

export async function requireLlmUser(event: H3Event): Promise<LlmUser> {
  const user = await resolveLlmUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized. Provide a valid Bearer token or API key in the Authorization header.',
    })
  }
  return user
}
