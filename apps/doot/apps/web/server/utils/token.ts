/**
 * Personal Access Token (PAT) helpers for Multi-LLM / MCP access.
 *
 * Allows users to generate persistent API tokens for Cursor, Windsurf, ChatGPT,
 * Gemini, Ollama, and other tools that authenticate via Bearer token without
 * needing full OAuth 2.1 browser flows.
 */
import crypto from 'node:crypto'
import { createClient } from '@libsql/client'
import { databaseUrl } from './db'

export interface PersonalTokenInfo {
  token: string
  createdAt: string
  expiresAt: string
}

const CLIENT_ID = 'doot-personal-client'

function getClient() {
  return createClient({ url: databaseUrl() })
}

/** Fetch existing active personal token for a user, or null if none exists. */
export async function getUserPersonalToken(userId: string): Promise<PersonalTokenInfo | null> {
  const client = getClient()
  const result = await client.execute({
    sql: `SELECT accessToken, createdAt, accessTokenExpiresAt
          FROM oauthAccessToken
          WHERE userId = ? AND clientId = ?
          ORDER BY createdAt DESC
          LIMIT 1`,
    args: [userId, CLIENT_ID],
  })

  if (!result.rows.length || !result.rows[0]) return null
  const row = result.rows[0]
  return {
    token: String(row.accessToken),
    createdAt: String(row.createdAt),
    expiresAt: String(row.accessTokenExpiresAt),
  }
}

/** Generate a new personal access token or rotate an existing one for a user. */
export async function createOrRotatePersonalToken(userId: string): Promise<PersonalTokenInfo> {
  const client = getClient()
  const token = `doot_pat_${crypto.randomBytes(24).toString('hex')}`
  const refreshToken = `doot_ref_${crypto.randomBytes(24).toString('hex')}`
  const id = `pat_${crypto.randomUUID()}`
  const now = new Date().toISOString()
  const tenYearsLater = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString()

  // Ensure system app exists
  await client.execute({
    sql: `INSERT OR IGNORE INTO oauthApplication (id, name, clientId, clientSecret, redirectUrls, type, disabled, createdAt, updatedAt)
          VALUES ('app_personal_tokens', 'Personal Access Tokens & Multi-LLM Keys', ?, '', 'https://localhost', 'public', 0, ?, ?)`,
    args: [CLIENT_ID, now, now],
  })

  // Delete previous personal tokens for this user to keep it clean
  await client.execute({
    sql: `DELETE FROM oauthAccessToken WHERE userId = ? AND clientId = ?`,
    args: [userId, CLIENT_ID],
  })

  // Insert fresh token
  await client.execute({
    sql: `INSERT INTO oauthAccessToken
          (id, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, clientId, userId, scopes, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, token, refreshToken, tenYearsLater, tenYearsLater, CLIENT_ID, userId, 'mcp', now, now],
  })

  return {
    token,
    createdAt: now,
    expiresAt: tenYearsLater,
  }
}

/** Revoke user's personal token. */
export async function revokePersonalToken(userId: string): Promise<boolean> {
  const client = getClient()
  const result = await client.execute({
    sql: `DELETE FROM oauthAccessToken WHERE userId = ? AND clientId = ?`,
    args: [userId, CLIENT_ID],
  })
  return (result.rowsAffected ?? 0) > 0
}
