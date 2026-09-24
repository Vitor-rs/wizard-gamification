import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const webPackage = resolve(here, '../apps/web/package.json')
const require = createRequire(webPackage)

const { createClient } = require('@libsql/client')
const { hash, verify } = require('@node-rs/argon2')

const dbUrl = `file:${resolve(here, '../apps/web/.data/doot.sqlite')}`
const client = createClient({ url: dbUrl })

const TARGET_EMAIL = 'ped.navirai@wizard.com.br'
const TARGET_PASSWORD = '99772710@'
const TARGET_NAME = 'Wizard Navirai'

async function run() {
  console.log(`Connecting to database at ${dbUrl}...`)

  // 1. Ensure moderation/role columns exist on user table
  for (const ddl of [
    "ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'user'",
    'ALTER TABLE user ADD COLUMN banned INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE user ADD COLUMN banReason TEXT',
    'ALTER TABLE user ADD COLUMN bannedAt INTEGER',
  ]) {
    try {
      await client.execute(ddl)
    } catch {
      /* ignore if exists */
    }
  }

  // 2. Query all existing users
  const allUsers = await client.execute('SELECT id, name, email, role FROM user')
  console.log(`Current users in DB (${allUsers.rows.length}):`, allUsers.rows)

  // 3. Delete any user that is NOT the target email
  const toDelete = allUsers.rows.filter(
    (u) => (u.email || '').toLowerCase() !== TARGET_EMAIL.toLowerCase()
  )
  for (const u of toDelete) {
    console.log(`Removing non-target user: ${u.email} (${u.id})...`)
    await client.execute({ sql: 'DELETE FROM account WHERE userId = ?', args: [u.id] })
    await client.execute({ sql: 'DELETE FROM session WHERE userId = ?', args: [u.id] })
    await client.execute({ sql: 'DELETE FROM user WHERE id = ?', args: [u.id] })
  }

  // 4. Hash the target password with argon2id
  console.log('Hashing password with argon2id...')
  const hashedPassword = await hash(TARGET_PASSWORD)

  // Double check verification
  const isValid = await verify(hashedPassword, TARGET_PASSWORD)
  if (!isValid) {
    throw new Error('Hash verification failed immediately after hashing!')
  }
  console.log('Argon2id password verification self-test: PASSED')

  // 5. Check if target user exists
  const targetUserRes = await client.execute({
    sql: 'SELECT id, name, email FROM user WHERE lower(email) = ?',
    args: [TARGET_EMAIL.toLowerCase()],
  })

  let userId
  const now = Date.now()
  const nowIso = new Date().toISOString()

  if (targetUserRes.rows.length === 0) {
    console.log(`Creating target master user ${TARGET_EMAIL}...`)
    userId = `usr_${Math.random().toString(36).substring(2, 12)}`
    await client.execute({
      sql: `INSERT INTO user (id, name, email, emailVerified, role, banned, createdAt, updatedAt)
            VALUES (?, ?, ?, 1, 'admin', 0, ?, ?)`,
      args: [userId, TARGET_NAME, TARGET_EMAIL, nowIso, nowIso],
    })

    const accountId = `acc_${Math.random().toString(36).substring(2, 12)}`
    await client.execute({
      sql: `INSERT INTO account (id, userId, accountId, providerId, password, createdAt, updatedAt)
            VALUES (?, ?, ?, 'credential', ?, ?, ?)`,
      args: [accountId, userId, userId, hashedPassword, now, now],
    })
    console.log(`Created user ${userId} and credential account ${accountId}.`)
  } else {
    userId = targetUserRes.rows[0].id
    console.log(`Target user already exists (${userId}). Updating credentials and role...`)

    await client.execute({
      sql: `UPDATE user SET role = 'admin', banned = 0, name = ?, updatedAt = ? WHERE id = ?`,
      args: [TARGET_NAME, nowIso, userId],
    })

    // Update or insert into account
    const accRes = await client.execute({
      sql: `SELECT id FROM account WHERE userId = ? AND providerId = 'credential'`,
      args: [userId],
    })

    if (accRes.rows.length === 0) {
      const accountId = `acc_${Math.random().toString(36).substring(2, 12)}`
      await client.execute({
        sql: `INSERT INTO account (id, userId, accountId, providerId, password, createdAt, updatedAt)
              VALUES (?, ?, ?, 'credential', ?, ?, ?)`,
        args: [accountId, userId, userId, hashedPassword, now, now],
      })
      console.log(`Inserted missing credential account ${accountId}.`)
    } else {
      await client.execute({
        sql: `UPDATE account SET password = ?, updatedAt = ? WHERE userId = ? AND providerId = 'credential'`,
        args: [hashedPassword, now, userId],
      })
      console.log(`Updated password for account ${accRes.rows[0].id}.`)
    }
  }

  // 6. Invalidate all existing sessions so a fresh login is required
  await client.execute('DELETE FROM session')
  console.log('Cleared all active sessions.')

  // 7. Verify final user state
  const finalUsers = await client.execute('SELECT id, name, email, role, banned FROM user')
  console.log('Final users in DB:', finalUsers.rows)

  const finalAccounts = await client.execute(
    'SELECT id, userId, providerId, password FROM account'
  )
  console.log('Credential accounts:', finalAccounts.rows.length)
  for (const a of finalAccounts.rows) {
    const check = await verify(a.password, TARGET_PASSWORD)
    console.log(`Account ${a.id} password valid for "${TARGET_PASSWORD}": ${check}`)
  }

  console.log('\n=== MASTER USER CONFIGURED SUCCESSFULLY ===')
  console.log(`Email: ${TARGET_EMAIL}`)
  console.log(`Role: admin`)
  console.log(`Total users in system: ${finalUsers.rows.length}`)
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error configuring master user:', err)
    process.exit(1)
  })
