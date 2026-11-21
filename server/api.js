import { categories, getTeacherContact, seedClubs } from '../src/data.js'

const uuidPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const uuid = new RegExp(`^${uuidPattern}$`)
const credentials = new RegExp(`^Bearer (${uuidPattern})\\.([0-9a-f]{64})$`)
const seedById = new Map(seedClubs.map((club) => [club.id, club]))
const categoryIds = new Set(categories.map(({ id }) => id))
const ok = { ok: true }

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function problem(status, code, error) {
  return json({ code, error }, status)
}

function unauthorized() {
  return problem(401, 'unauthorized', 'Бүртгэлээ баталгаажуулаад дахин оролдоно уу.')
}

function invalid() {
  return problem(400, 'invalid', 'Мэдээллээ шалгаад дахин оролдоно уу.')
}

function notFound() {
  return problem(404, 'not_found', 'Дугуйлан олдсонгүй.')
}

function unavailable() {
  return problem(503, 'unavailable', 'Түр алдаа гарлаа. Дахин оролдоно уу.')
}

async function parseCredentials(request) {
  const match = credentials.exec(request.headers.get('Authorization') ?? '')
  if (!match) return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(match[2]))
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return { id: match[1], hash }
}

function findProfile(db, { id, hash }) {
  return db.prepare('SELECT id, role FROM profiles WHERE id = ? AND secret_hash = ?').bind(id, hash).first()
}

async function readBody(request) {
  const maxBytes = 16_384
  if (Number(request.headers.get('Content-Length')) > maxBytes) return null
  const reader = request.body?.getReader()
  if (!reader) return null
  const decoder = new TextDecoder()
  let contents = ''
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxBytes) {
        await reader.cancel()
        return null
      }
      contents += decoder.decode(value, { stream: true })
    }
    const parsed = JSON.parse(contents + decoder.decode())
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}

function textField(value, maxLength) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return trimmed.length <= maxLength ? trimmed : ''
}

function integerField(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max
}

async function saveProfile(request, db, { id, hash }) {
  const body = await readBody(request)
  if (!body) return invalid()
  const { role, age } = body
  const name = textField(body.name, 80)
  const phone = textField(body.phone, 24).replace(/[\s()-]/g, '')
  const grade = textField(body.grade, 25)
  const bio = textField(body.bio, 800)
  if (!name || !/^(?:\+976)?\d{8}$/.test(phone)) return invalid()
  if (role !== 'student' && role !== 'teacher') return invalid()
  if (role === 'student' && (!integerField(age, 1, 99) || !grade)) return invalid()
  if (role === 'teacher' && !bio) return invalid()

  await db.prepare(`
    INSERT INTO profiles (id, secret_hash, role, name, phone, age, grade, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).bind(
    id, hash, role, name, phone,
    role === 'student' ? age : null,
    role === 'student' ? grade : null,
    role === 'teacher' ? bio : null,
  ).run()
  const profile = await findProfile(db, { id, hash })
  if (!profile || profile.role !== role) return unauthorized()
  return json(ok)
}

async function listCatalog(db) {
  const [published, sampleCounts] = await db.batch([
    db.prepare(`
      SELECT c.id, c.title, c.category, c.description, c.capacity, c.schedule, c.fee, c.location,
             c.teacher_id AS teacherId, teacher.name AS teacherName,
             (SELECT COUNT(*) FROM enrollments WHERE club_id = c.id) AS filled
      FROM clubs c JOIN profiles teacher ON teacher.id = c.teacher_id
      ORDER BY c.created_at DESC, c.rowid DESC
    `),
    db.prepare(`
      SELECT club_id AS clubId, COUNT(*) AS filled
      FROM enrollments WHERE club_id GLOB 'demo-*'
      GROUP BY club_id
    `),
  ])
  const countsById = new Map(sampleCounts.results.map(({ clubId, filled }) => [clubId, filled]))
  const samples = seedClubs.map((club) => ({
    ...club,
    filled: club.initialFilled + (countsById.get(club.id) ?? 0),
  }))
  return json({ clubs: [...published.results, ...samples] })
}

async function publishClub(request, db, clubId, teacherId) {
  if (!uuid.test(clubId)) return invalid()
  const body = await readBody(request)
  if (!body) return invalid()
  const { category, capacity, fee } = body
  const title = textField(body.title, 120)
  const description = textField(body.description, 1200)
  const schedule = textField(body.schedule, 180)
  const location = textField(body.location, 220)
  if (!title || !description || !schedule || !location || !categoryIds.has(category)) return invalid()
  if (!integerField(capacity, 1, 10_000) || !integerField(fee, 0, Number.MAX_SAFE_INTEGER)) return invalid()

  const details = { title, category, description, capacity, schedule, fee, location }
  await db.prepare(`
    INSERT INTO clubs (id, teacher_id, title, category, description, capacity, schedule, fee, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).bind(clubId, teacherId, title, category, description, capacity, schedule, fee, location).run()
  const stored = await db.prepare(`
    SELECT title, category, description, capacity, schedule, fee, location
    FROM clubs WHERE id = ? AND teacher_id = ?
  `).bind(clubId, teacherId).first()
  if (!stored || !Object.entries(details).every(([field, value]) => stored[field] === value)) {
    return problem(409, 'club_conflict', 'Энэ дугуйлан өмнө нь нийтлэгдсэн байна.')
  }
  return json(ok)
}

async function enrollInClub(db, clubId, studentId) {
  const demo = seedById.get(clubId)
  if (!demo && !uuid.test(clubId)) return notFound()

  // SQLite serializes writes, so the count and insert run atomically for the last seat.
  const statement = demo
    ? db.prepare(`
        INSERT INTO enrollments (club_id, student_id)
        SELECT ?1, ?2
        WHERE (SELECT COUNT(*) FROM enrollments WHERE club_id = ?1) < ?3
        ON CONFLICT(club_id, student_id) DO NOTHING
      `).bind(clubId, studentId, demo.capacity - demo.initialFilled)
    : db.prepare(`
        INSERT INTO enrollments (club_id, student_id)
        SELECT c.id, ?1 FROM clubs c
        WHERE c.id = ?2 AND (SELECT COUNT(*) FROM enrollments WHERE club_id = c.id) < c.capacity
        ON CONFLICT(club_id, student_id) DO NOTHING
      `).bind(studentId, clubId)

  const result = await statement.run()
  if (result.meta.changes > 0) return json(ok)
  const existing = await db.prepare('SELECT 1 FROM enrollments WHERE club_id = ? AND student_id = ?')
    .bind(clubId, studentId).first()
  if (existing) return json(ok)
  if (!demo && !await db.prepare('SELECT 1 FROM clubs WHERE id = ?').bind(clubId).first()) return notFound()
  return problem(409, 'full', 'Энэ дугуйлангийн суудал дүүрсэн байна.')
}

async function readStudentEnrollments(db, studentId) {
  const { results } = await db.prepare(`
    SELECT e.club_id AS clubId, e.student_id AS studentId, teacher.phone AS teacherPhone
    FROM enrollments e
    LEFT JOIN clubs c ON c.id = e.club_id
    LEFT JOIN profiles teacher ON teacher.id = c.teacher_id
    WHERE e.student_id = ?
    ORDER BY e.created_at DESC, e.club_id
  `).bind(studentId).all()
  return json({
    enrollments: results.map(({ clubId, studentId: id, teacherPhone }) => {
      const demo = seedById.get(clubId)
      const contact = demo
        ? getTeacherContact({ profiles: {}, enrollments: [] }, demo)
        : teacherPhone ? { phone: teacherPhone, isDemo: false } : null
      return { clubId, studentId: id, contact }
    }),
  })
}

async function readTeacherRoster(db, teacherId) {
  const { results } = await db.prepare(`
    SELECT e.club_id AS clubId, student.id, student.name, student.age, student.grade, student.phone
    FROM clubs c
    JOIN enrollments e ON e.club_id = c.id
    JOIN profiles student ON student.id = e.student_id
    WHERE c.teacher_id = ?
    ORDER BY e.created_at, student.name, student.id
  `).bind(teacherId).all()
  return json({
    enrollments: results.map(({ clubId, ...student }) => ({ clubId, studentId: student.id, student })),
  })
}

export async function handleApi(request, { DB: db }) {
  const { pathname } = new URL(request.url)
  const { method } = request
  try {
    if (!db) return unavailable()
    if (method === 'GET' && pathname === '/api/catalog') return await listCatalog(db)

    const credential = await parseCredentials(request)
    if (!credential) return unauthorized()
    if (method === 'PUT' && pathname === '/api/profile') return await saveProfile(request, db, credential)

    const profile = await findProfile(db, credential)
    if (!profile) return unauthorized()

    const clubRoute = /^\/api\/clubs\/([^/]+)(\/enroll)?$/.exec(pathname)
    if (method === 'PUT' && clubRoute && !clubRoute[2] && profile.role === 'teacher') {
      return await publishClub(request, db, clubRoute[1], profile.id)
    }
    if (method === 'POST' && clubRoute?.[2] && profile.role === 'student') {
      return await enrollInClub(db, clubRoute[1], profile.id)
    }
    if (method === 'GET' && pathname === '/api/student/enrollments' && profile.role === 'student') {
      return await readStudentEnrollments(db, profile.id)
    }
    if (method === 'GET' && pathname === '/api/teacher/roster' && profile.role === 'teacher') {
      return await readTeacherRoster(db, profile.id)
    }
    return problem(404, 'not_found', 'Хуудас олдсонгүй.')
  } catch {
    return unavailable()
  }
}
