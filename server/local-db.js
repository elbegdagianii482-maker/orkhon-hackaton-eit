import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const migrations = new URL('../drizzle/', import.meta.url)
const defaultFile = fileURLToPath(new URL('../.local-data/youth-hub.sqlite', import.meta.url))

function transaction(database, callback) {
  database.exec('BEGIN IMMEDIATE')
  try {
    const result = callback()
    database.exec('COMMIT')
    return result
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

export function createLocalDatabase(file = defaultFile) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })
  const database = new DatabaseSync(file)
  database.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  database.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY NOT NULL)')
  const applied = database.prepare('SELECT name FROM local_migrations WHERE name = ?')
  const markApplied = database.prepare('INSERT INTO local_migrations (name) VALUES (?)')
  for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
    transaction(database, () => {
      if (applied.get(name)) return
      database.exec(readFileSync(new URL(name, migrations), 'utf8'))
      markApplied.run(name)
    })
  }

  return {
    prepare(sql) {
      const statement = database.prepare(sql)
      const bind = (...params) => ({
        bind,
        first: () => statement.get(...params) ?? null,
        all: () => ({ results: statement.all(...params) }),
        run: () => ({ meta: { changes: Number(statement.run(...params).changes) } }),
      })
      return bind()
    },
    batch(statements) {
      return transaction(database, () => statements.map(statement => statement.all()))
    },
    close() {
      database.close()
    },
  }
}
