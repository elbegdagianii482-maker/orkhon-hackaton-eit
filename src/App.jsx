import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen, Check, CircleCheck, CircleUserRound, GraduationCap, MapPin,
  Plus, Presentation, Sprout, X,
} from 'lucide-react'
import { apiErrorMessage, catalog, createSecret, enrollInClub, getEnrollments, putClub, putProfile } from './api.js'
import { loadState, saveState, storageKey } from './data.js'
import StudentDashboard from './StudentDashboard.jsx'
import TeacherDashboard from './TeacherDashboard.jsx'

const base = import.meta.env.BASE_URL
const roleInfo = {
  student: {
    title: 'Сурагч',
    heading: 'Би сурагч',
    description: 'Сонирхсон дугуйлангаа олж, бүртгүүлээрэй.',
    action: 'Сурагчаар үргэлжлүүлэх',
    icon: GraduationCap,
  },
  teacher: {
    title: 'Багш',
    heading: 'Би багш, дасгалжуулагч',
    description: 'Дугуйлангаа нийтэлж, сурагчдаа бүртгээрэй.',
    action: 'Багшаар үргэлжлүүлэх',
    icon: Presentation,
  },
}

const routes = ['student', 'teacher', 'student-register', 'teacher-register']
const getRoute = () => {
  const route = window.location.hash.slice(1)
  return routes.includes(route) ? route : 'home'
}

function listProfiles(state, role) {
  const profiles = state.savedProfiles?.[role] ?? []
  const activeProfile = state.profiles[role]
  if (!activeProfile || profiles.some(({ id }) => id === activeProfile.id)) return profiles
  return [...profiles, activeProfile]
}

function rememberProfile(state, role, profile, activate = false) {
  const otherProfiles = listProfiles(state, role).filter(({ id }) => id !== profile.id)
  const profiles = activate || state.profiles[role]?.id === profile.id
    ? { ...state.profiles, [role]: profile }
    : state.profiles
  return {
    ...state,
    profiles,
    savedProfiles: { ...state.savedProfiles, [role]: [...otherProfiles, profile] },
  }
}

function clearPending(state, field, key, id) {
  if (state[field]?.[key]?.id !== id) return state
  const records = { ...state[field] }
  delete records[key]
  return { ...state, [field]: records }
}

function Brand({ onClick }) {
  return (
    <button type="button" className="brand" onClick={onClick} aria-label="Erdenet Youth Hub, нүүр хуудас">
      <span className="brand-mark"><Sprout size={24} strokeWidth={2.2} aria-hidden="true" /></span>
      <span>Erdenet <span className="brand-accent">Youth Hub</span></span>
    </button>
  )
}

function TopBar({ role, profile, profiles, navigate, selectProfile }) {
  const profileMenu = useRef(null)

  return (
    <header className="site-header">
      <div className="app-container header-inner">
        <Brand onClick={() => navigate('home')} />
        <div className="header-actions">
          <nav className="role-switch" aria-label="Дүр сонгох">
            {Object.entries(roleInfo).map(([id, { title, icon: Icon }]) => (
              <button key={id} type="button" aria-current={role === id ? 'page' : undefined} onClick={() => navigate(id)}>
                <Icon size={17} aria-hidden="true" />{title}
              </button>
            ))}
          </nav>
          {profile && (
            <details className="profile-menu" ref={profileMenu}>
              <summary aria-label="Профайл солих">
                <CircleUserRound size={23} aria-hidden="true" />
                <span>{profile.name}</span>
              </summary>
              <div className="profile-options">
                {profiles.map(({ id, name }) => (
                  <button key={id} type="button" disabled={id === profile.id} onClick={() => {
                    profileMenu.current.open = false
                    selectProfile(role, id)
                  }}>
                    {id === profile.id ? <Check size={17} aria-hidden="true" /> : <CircleUserRound size={17} aria-hidden="true" />}
                    <span>{name}</span>
                  </button>
                ))}
                <button type="button" onClick={() => {
                  profileMenu.current.open = false
                  navigate(`${role}-register`)
                }}>
                  <Plus size={17} aria-hidden="true" /> Шинэ профайл
                </button>
              </div>
            </details>
          )}
        </div>
      </div>
    </header>
  )
}

function Landing({ navigate }) {
  const firstRole = useRef(null)

  return (
    <div className="app-container landing">
      <section className="hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <span className="hero-location inline-flex items-center gap-2.5"><MapPin size={16} aria-hidden="true" /> ЭРДЭНЭТ, ОРХОН</span>
          <h1 id="home-title">Сонирхлоо ол.<br /><span>Хамтдаа өс.</span></h1>
          <p>Эрдэнэт хотын дугуйлан, секц, сургалтууд нэг дор. Дуртай зүйлээ олж, шинэ чадвар эзэмшээрэй.</p>
          <button type="button" className="button hero-action" onClick={() => firstRole.current?.focus()}>
            Дүрээ сонгох
          </button>
        </div>
        <div className="hero-media">
          <img src={`${base}images/hero.jpg`} width="1536" height="1024" alt="Эрдэнэт хотын сагсны талбай дээр суусан дөрвөн найз" fetchPriority="high" />
        </div>
      </section>

      <section className="roles-section" aria-labelledby="roles-title">
        <h2 id="roles-title">Та хэн бэ?</h2>
        <p>Үргэлжлүүлэхийн тулд дүрээ сонгоорой.</p>
        <div className="role-cards grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {Object.entries(roleInfo).map(([id, { action, heading, description, icon: Icon }]) => (
            <button key={id} type="button" className={`role-card role-card-${id}`} ref={id === 'student' ? firstRole : undefined} onClick={() => navigate(id)}>
              <span className="role-card-icon"><Icon size={27} strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="role-card-heading">{heading}</span>
              <span className="role-card-description">{description}</span>
              <span className="role-card-action">{action}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function Registration({ role, existingProfile, onSubmit, navigate }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { title, icon: Icon } = roleInfo[role]
  const isStudent = role === 'student'
  const canReturn = Boolean(existingProfile)

  async function submit(event) {
    event.preventDefault()
    if (submitting) return
    const fields = new FormData(event.currentTarget)
    const name = fields.get('name').trim()
    const phone = fields.get('phone').trim().replace(/[\s()-]/g, '')
    if (!name) {
      setError('Нэрээ оруулна уу.')
      return
    }
    if (!/^(?:\+976)?\d{8}$/.test(phone)) {
      setError('8 оронтой утасны дугаар эсвэл +976 угтвартай дугаар оруулна уу.')
      return
    }
    const profile = { name, phone }
    if (isStudent) {
      profile.age = Number(fields.get('age'))
      profile.grade = fields.get('grade').trim()
      if (!Number.isInteger(profile.age) || profile.age < 1 || profile.age > 99 || !profile.grade) {
        setError('Нас болон ангиа зөв оруулна уу.')
        return
      }
    } else {
      profile.bio = fields.get('bio').trim()
      if (!profile.bio) {
        setError('Туршлагынхаа талаар товч бичээрэй.')
        return
      }
    }
    setSubmitting(true)
    setError('')
    try {
      const message = await onSubmit(role, profile)
      if (message) setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-container registration-page">
      <button type="button" className="back-link" onClick={() => navigate(canReturn ? role : 'home')}>
        {canReturn ? 'Профайл руу буцах' : 'Дүр сонгох руу буцах'}
      </button>
      <div className="registration-shell">
        <aside className="registration-side">
          <img src={`${base}images/${isStudent ? 'hero' : 'art'}.jpg`} alt="" />
          <div>
            <span className="role-card-icon"><Icon size={28} aria-hidden="true" /></span>
            <strong>{isStudent ? 'Өөрт тохирох дугуйлангаа олоорой.' : 'Мэддэг зүйлээ сурагчидтай хуваалцаарай.'}</strong>
          </div>
        </aside>
        <div className="registration-body">
          <div className="registration-label"><Icon size={18} aria-hidden="true" /> {title}</div>
          <h1>{isStudent ? 'Сурагчийн бүртгэл' : 'Багшийн бүртгэл'}</h1>
          <p>{isStudent ? 'Дугуйланд бүртгүүлэхийн тулд мэдээллээ оруулаарай.' : 'Дугуйлан нийтлэхийн тулд нэр, туршлагаа оруулаарай.'}</p>
          <form className="registration-form" onSubmit={submit} onChange={() => error && setError('')}>
            <label className="field">
              <span>{isStudent ? 'Овог, нэр' : 'Багшийн нэр'}</span>
              <input name="name" autoComplete="name" required maxLength={80} placeholder="Жишээ нь Бат Болд" />
            </label>
            {isStudent ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <label className="field">
                  <span>Нас</span>
                  <input name="age" type="number" min="1" max="99" step="1" required placeholder="15" />
                </label>
                <label className="field">
                  <span>Анги</span>
                  <input name="grade" required maxLength={25} placeholder="10А" />
                </label>
              </div>
            ) : (
              <label className="field">
                <span>Товч танилцуулга, туршлага</span>
                <textarea name="bio" rows="4" required maxLength={800} placeholder="Хичээл зааж байсан туршлагаасаа бичээрэй" />
              </label>
            )}
            <label className="field">
              <span>Утасны дугаар</span>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={24} placeholder="9911 2233" />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="button button-primary registration-submit" disabled={submitting}>
              {submitting ? 'Бүртгэж байна…' : 'Бүртгэл үүсгэх'}
            </button>
            <small>Туршилтын хувилбар. Жишээ мэдээлэл ашиглаарай.</small>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [route, setRoute] = useState(getRoute)
  const [clubs, setClubs] = useState([])
  const [remoteRole, setRemoteRole] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const [toast, setToast] = useState(null)
  const [storageFailed, setStorageFailed] = useState(false)
  const main = useRef(null)
  const localState = useRef(state)
  const localStorageFailed = useRef(false)
  const activeSync = useRef(null)
  const connected = useRef(new Set())
  const role = route === 'home' ? null : route.split('-')[0]
  const profile = role ? state.profiles[role] : null
  const isRegistering = Boolean(role && (!profile || route.endsWith('-register')))
  const sessionRole = !isRegistering && profile ? role : null
  const sessionId = sessionRole ? profile.id : null
  const sessionKey = sessionRole ? `${sessionRole}:${sessionId}` : null
  const dashboardReady = sessionKey !== null && remoteRole?.key === sessionKey
  const dashboardState = { clubs, enrollments: dashboardReady ? remoteRole.enrollments : [], profiles: state.profiles }

  const readBrowser = useCallback(() => localStorageFailed.current ? localState.current : loadState(), [])
  const updateBrowser = useCallback(change => {
    const current = readBrowser()
    const next = change(current)
    localState.current = next
    if (next !== current) localStorageFailed.current = !saveState(next)
    setStorageFailed(localStorageFailed.current)
    setState(next)
    return !localStorageFailed.current
  }, [readBrowser])

  useEffect(() => {
    const handleRoute = () => {
      setRoute(getRoute())
      setToast(null)
      window.scrollTo(0, 0)
      main.current?.focus({ preventScroll: true })
    }
    const syncStorage = (event) => {
      if (event.key !== storageKey && event.key !== null) return
      localState.current = loadState()
      localStorageFailed.current = false
      setStorageFailed(false)
      setState(localState.current)
    }
    window.addEventListener('hashchange', handleRoute)
    window.addEventListener('storage', syncStorage)
    return () => {
      window.removeEventListener('hashchange', handleRoute)
      window.removeEventListener('storage', syncStorage)
    }
  }, [])

  useEffect(() => {
    if (!sessionRole) return
    let inFlight = null
    let nextLegacyCheck = 0
    let disposed = false

    async function connect(signal) {
      let current = readBrowser().profiles[sessionRole]
      if (current?.id !== sessionId) return null
      if (!current.secret || localStorageFailed.current) {
        if (!current.secret) current = { ...current, secret: createSecret() }
        const saved = updateBrowser(store => rememberProfile(store, sessionRole, current))
        if (!saved) throw new Error('Local profile storage is unavailable')
      }
      const credential = `${current.id}.${current.secret}`
      if (!connected.current.has(credential)) {
        await putProfile(sessionRole, current, signal)
        connected.current.add(credential)
      }
      return current
    }

    async function importLegacy(current, signal) {
      const legacy = readBrowser()
      if (sessionRole === 'teacher') {
        for (const club of legacy.clubs.filter(club => club.teacherId === current.id)) {
          await putClub(current, club.id, club, signal)
          updateBrowser(store => ({ ...store, clubs: store.clubs.filter(({ id }) => id !== club.id) }))
        }
        return
      }
      for (const row of legacy.enrollments.filter(row => row.studentId === current.id)) {
        try {
          await enrollInClub(current, row.clubId, signal)
        } catch (error) {
          if (error.status === 404 || error.status === 409) continue
          throw error
        }
        updateBrowser(store => ({
          ...store,
          enrollments: store.enrollments.filter(saved => saved.clubId !== row.clubId || saved.studentId !== row.studentId),
        }))
      }
    }

    function refresh(force = false) {
      if (disposed) return
      if (inFlight && !force) return inFlight.promise
      inFlight?.controller.abort()
      const controller = new AbortController()
      const { signal } = controller
      const promise = (async () => {
        let current
        try {
          current = navigator.locks
            ? await navigator.locks.request(`erdenet-profile:${sessionId}`, { signal }, () => connect(signal))
            : await connect(signal)
          if (!current || signal.aborted) return
          if (Date.now() >= nextLegacyCheck) {
            await importLegacy(current, signal)
            nextLegacyCheck = Date.now() + 20000
          }
          const [catalogData, roleData] = await Promise.all([
            catalog(signal),
            getEnrollments(sessionRole, current, signal),
          ])
          if (signal.aborted) return
          if (!Array.isArray(catalogData?.clubs) || !Array.isArray(roleData?.enrollments)) {
            throw new Error('Unexpected dashboard response')
          }
          setClubs(catalogData.clubs)
          setRemoteRole({ key: sessionKey, enrollments: roleData.enrollments })
          setSyncError(null)
        } catch (error) {
          if (signal.aborted) return
          if (error.status === 401 && current) connected.current.delete(`${current.id}.${current.secret}`)
          setSyncError({ key: sessionKey, message: apiErrorMessage(error) })
        } finally {
          if (inFlight?.controller === controller) inFlight = null
        }
      })()
      inFlight = { controller, promise }
      return promise
    }

    activeSync.current = { key: sessionKey, refresh }
    function refreshVisible() {
      if (document.visibilityState !== 'hidden') refresh()
    }
    refresh()
    const timer = window.setInterval(refreshVisible, 4000)
    window.addEventListener('focus', refreshVisible)
    document.addEventListener('visibilitychange', refreshVisible)
    return () => {
      disposed = true
      inFlight?.controller.abort()
      activeSync.current = null
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshVisible)
      document.removeEventListener('visibilitychange', refreshVisible)
    }
  }, [sessionRole, sessionId, sessionKey, readBrowser, updateBrowser])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(timer)
  }, [toast])

  function navigate(destination) {
    if (destination === getRoute()) return
    window.location.hash = destination === 'home' ? '' : destination
  }

  async function register(selectedRole, details) {
    const startingRoute = getRoute()
    const pending = readBrowser().pendingProfiles?.[selectedRole]
    const sameDetails = pending && Object.entries(details).every(([field, value]) => pending[field] === value)
    const newProfile = sameDetails ? pending : { ...details, id: crypto.randomUUID(), secret: createSecret() }
    const saved = updateBrowser(current => ({
      ...current,
      pendingProfiles: { ...current.pendingProfiles, [selectedRole]: newProfile },
    }))
    if (!saved) return 'Хөтөч профайлыг хадгалж чадсангүй. Хадгалалтын тохиргоогоо шалгана уу.'
    try {
      await putProfile(selectedRole, newProfile)
    } catch (error) {
      return apiErrorMessage(error)
    }
    connected.current.add(`${newProfile.id}.${newProfile.secret}`)
    updateBrowser(current => clearPending(
      rememberProfile(current, selectedRole, newProfile, true),
      'pendingProfiles', selectedRole, newProfile.id,
    ))
    if (getRoute() === startingRoute) navigate(selectedRole)
    return null
  }

  function selectProfile(selectedRole, profileId) {
    const current = readBrowser()
    const selectedProfile = listProfiles(current, selectedRole).find(({ id }) => id === profileId)
    if (!selectedProfile) return
    updateBrowser(store => ({ ...store, profiles: { ...store.profiles, [selectedRole]: selectedProfile } }))
    navigate(selectedRole)
  }

  async function publish(details) {
    const current = readBrowser()
    const teacher = current.profiles.teacher
    if (teacher?.id !== profile.id || !teacher.secret) return 'Идэвхтэй багшийн профайлаа шалгана уу.'
    const signature = JSON.stringify(details)
    const previous = current.pendingClubs?.[teacher.id]
    const draft = previous?.signature === signature ? previous : { id: crypto.randomUUID(), signature }
    updateBrowser(store => ({
      ...store,
      pendingClubs: { ...store.pendingClubs, [teacher.id]: draft },
    }))
    try {
      await putClub(teacher, draft.id, details)
    } catch (error) {
      return apiErrorMessage(error)
    }
    updateBrowser(store => clearPending(store, 'pendingClubs', teacher.id, draft.id))
    if (activeSync.current?.key === sessionKey) await activeSync.current.refresh(true)
    return null
  }

  async function enroll(clubId) {
    const student = readBrowser().profiles.student
    if (student?.id !== profile.id || !student.secret) return 'Идэвхтэй сурагчийн профайлаа шалгана уу.'
    try {
      await enrollInClub(student, clubId)
    } catch (error) {
      return apiErrorMessage(error)
    }
    if (activeSync.current?.key === sessionKey) {
      setToast('Дугуйланд амжилттай бүртгүүллээ.')
      await activeSync.current.refresh(true)
    }
    return null
  }

  return (
    <div className="page-frame">
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault()
        main.current?.focus()
      }}>Үндсэн хэсэг рүү очих</a>
      <TopBar key={route} role={role} profile={profile} profiles={role ? listProfiles(state, role) : []} navigate={navigate} selectProfile={selectProfile} />
      {storageFailed && <div className="app-container storage-notice" role="alert">Хөтөч мэдээллийг хадгалж чадсангүй. Энэ удаагийн өөрчлөлт хуудсыг хаахад устах боломжтой.</div>}
      {sessionKey && syncError?.key === sessionKey && (
        <div className="app-container storage-notice" role="alert">
          {syncError.message}{' '}
          <button type="button" className="button button-secondary" onClick={() => activeSync.current?.refresh(true)}>Дахин ачаалах</button>
        </div>
      )}
      <main id="main-content" className="page-main" ref={main} tabIndex={-1}>
        <div className="page-view" key={`${route}:${profile?.id ?? ''}`}>
          {!role && <Landing navigate={navigate} />}
          {isRegistering && <Registration role={role} existingProfile={profile} onSubmit={register} navigate={navigate} />}
          {sessionKey && !dashboardReady && syncError?.key !== sessionKey && (
            <p className="app-container registration-page" role="status">Мэдээллийг ачаалж байна…</p>
          )}
          {role === 'student' && dashboardReady && <StudentDashboard student={profile} clubs={clubs} state={dashboardState} onEnroll={enroll} />}
          {role === 'teacher' && dashboardReady && (
            <TeacherDashboard teacher={profile} clubs={clubs.filter((club) => club.teacherId === profile.id)} state={dashboardState} onPublish={publish} goToCatalog={() => navigate('student')} />
          )}
        </div>
      </main>
      <footer className="site-footer">
        <div className="app-container footer-inner">
          <span className="inline-flex items-center gap-2"><BookOpen size={16} aria-hidden="true" /> Erdenet Youth Hub</span>
          <small>Хакатоны туршилтын хувилбар</small>
        </div>
      </footer>
      <div className="toast-region" aria-live="polite">
        {toast && (
          <div className="toast">
            <CircleCheck size={21} aria-hidden="true" />
            <span>{toast}</span>
            <button type="button" aria-label="Мэдэгдлийг хаах" onClick={() => setToast(null)}><X size={18} aria-hidden="true" /></button>
          </div>
        )}
      </div>
    </div>
  )
}
