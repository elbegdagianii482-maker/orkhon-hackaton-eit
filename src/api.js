const connectionMessage = 'Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.'

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.status = status
  }
}

export function apiErrorMessage(error) {
  return error instanceof ApiError ? error.message : connectionMessage
}

export function createSecret() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function request(path, { method = 'GET', profile, body, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (profile) headers.Authorization = `Bearer ${profile.id}.${profile.secret}`
  if (body) headers['Content-Type'] = 'application/json'

  const timeout = AbortSignal.timeout(12000)
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout
  let response
  let data
  try {
    response = await fetch(`/api/${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store', signal: requestSignal,
    })
    data = await response.json()
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError(connectionMessage, response?.status)
  }

  if (!response.ok) {
    throw new ApiError(typeof data?.error === 'string' ? data.error : connectionMessage, response.status)
  }
  return data
}

export const catalog = signal => request('catalog', { signal })

export function putProfile(role, profile, signal) {
  const { name, phone, age, grade, bio } = profile
  const body = role === 'student' ? { role, name, phone, age, grade } : { role, name, phone, bio }
  return request('profile', { method: 'PUT', profile, body, signal })
}

export function putClub(profile, id, details, signal) {
  const { title, category, description, capacity, schedule, fee, location } = details
  return request(`clubs/${encodeURIComponent(id)}`, {
    method: 'PUT', profile, body: { title, category, description, capacity, schedule, fee, location }, signal,
  })
}

export const enrollInClub = (profile, id, signal) => request(`clubs/${encodeURIComponent(id)}/enroll`, {
  method: 'POST', profile, signal,
})

export const getEnrollments = (role, profile, signal) => request(
  role === 'teacher' ? 'teacher/roster' : 'student/enrollments', { profile, signal },
)
