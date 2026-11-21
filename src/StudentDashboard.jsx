import { useEffect, useId, useRef, useState } from 'react'
import {
  Bookmark, CalendarDays, CircleCheck, CodeXml, Dumbbell, Languages, LayoutGrid,
  MapPin, Music2, Palette, Phone, Search, UserRound, UsersRound, X,
} from 'lucide-react'
import { categories, formatPrice, getFilledCount, getTeacherContact } from './data.js'
import './StudentDashboard.css'

const categoryIcons = {
  sports: Dumbbell,
  art: Palette,
  language: Languages,
  technology: CodeXml,
  dance: Music2,
}

const categoryImages = {
  sports: 'images/basketball.jpg',
  art: 'images/art.jpg',
  language: 'images/english.jpg',
  technology: 'images/coding.jpg',
  dance: 'images/dance.jpg',
}

function ClubImage({ club }) {
  const category = categories.find(({ id }) => id === club.category)
  const CategoryIcon = categoryIcons[club.category] ?? LayoutGrid
  const imagePath = club.image || categoryImages[club.category]

  return (
    <div className="club-image" data-category={club.category}>
      {imagePath && (
        <img
          src={`${import.meta.env.BASE_URL}${imagePath}`}
          alt=""
          style={{ objectPosition: club.imagePosition }}
          loading="lazy"
        />
      )}
      <span className="club-category"><CategoryIcon size={14} aria-hidden="true" />{category?.label ?? 'Бусад'}</span>
    </div>
  )
}

function TeacherPhone({ contact }) {
  const label = contact?.phone.replace(/^(\+976)?(\d{4})(\d{4})$/, '$1 $2 $3').trim()

  return (
    <div className="club-teacher-phone">
      <dt><Phone size={16} aria-hidden="true" /><span className="sr-only">Багшийн утас</span></dt>
      <dd>
        <strong aria-hidden="true">Багшийн утас</strong>{' '}
        {contact?.isDemo ? (
          <span>{label} (жишээ)</span>
        ) : contact ? (
          <a href={`tel:${contact.phone}`}>{label}</a>
        ) : (
          <span>Дугаар бүртгэгдээгүй</span>
        )}
      </dd>
    </div>
  )
}

function ClubMetadata({ club, contact }) {
  return (
    <dl className="club-metadata">
      <div><dt><UserRound size={16} aria-hidden="true" /><span className="sr-only">Багш</span></dt><dd>{club.teacherName}</dd></div>
      <div><dt><CalendarDays size={16} aria-hidden="true" /><span className="sr-only">Цагийн хуваарь</span></dt><dd>{club.schedule}</dd></div>
      <div><dt><MapPin size={16} aria-hidden="true" /><span className="sr-only">Хаяг</span></dt><dd>{club.location}</dd></div>
      {contact !== undefined && <TeacherPhone contact={contact} />}
    </dl>
  )
}

function ClubCapacity({ club, filled }) {
  return (
    <div className="club-capacity">
      <div className="club-capacity-label">
        <span><UsersRound size={15} aria-hidden="true" />{filled}/{club.capacity} бүртгүүлсэн</span>
        <strong>{filled < club.capacity ? `${club.capacity - filled} сул` : 'Дүүрсэн'}</strong>
      </div>
      <progress aria-label="Дүүргэлт" value={filled} max={club.capacity} />
    </div>
  )
}

function ClubCard({ club, filled, enrolled, contact, onView }) {
  const action = enrolled ? 'Бүртгүүлсэн · Дэлгэрэнгүй' : filled >= club.capacity ? 'Дэлгэрэнгүй' : 'Дэлгэрэнгүй · Бүртгүүлэх'

  return (
    <article className="club-card">
      <ClubImage club={club} />
      <div className="club-card-body">
        <div className="club-card-title">
          <h3>{club.title}</h3>
          <span className="club-price">{formatPrice(club.fee)}</span>
        </div>
        <ClubMetadata club={club} contact={contact} />
        <ClubCapacity club={club} filled={filled} />
        <button className="club-card-button" type="button" onClick={onView}>
          {enrolled && <CircleCheck size={17} aria-hidden="true" />}
          {action}<span className="sr-only"> · {club.title}</span>
        </button>
      </div>
    </article>
  )
}

function ClubDialog({ club, filled, enrolled, contact, onClose, onEnroll }) {
  const dialogRef = useRef(null)
  const successRef = useRef(null)
  const wasEnrolled = useRef(enrolled)
  const titleId = useId()
  const [error, setError] = useState('')
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  useEffect(() => {
    if (enrolled && !wasEnrolled.current) successRef.current?.focus()
    wasEnrolled.current = enrolled
  }, [enrolled])

  const full = filled >= club.capacity

  async function register() {
    setError('')
    setEnrolling(true)
    try {
      setError(await onEnroll(club.id) || '')
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="club-dialog"
      aria-labelledby={titleId}
      onClose={() => { if (!dialogRef.current?.open) onClose() }}
      onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close() }}
    >
      <div className="club-dialog-shell">
        <div className="club-dialog-media">
          <ClubImage club={club} />
          <button className="club-dialog-close" type="button" aria-label="Хаах" onClick={() => dialogRef.current.close()} autoFocus>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="club-dialog-body">
          <div className="club-card-title">
            <h2 id={titleId}>{club.title}</h2>
            <span className="club-price">{formatPrice(club.fee)}</span>
          </div>
          <p>{club.description}</p>
          <ClubMetadata club={club} contact={contact} />
          <ClubCapacity club={club} filled={filled} />
          {error && <p className="club-dialog-error" role="alert">{error}</p>}
          {enrolled && <p ref={successRef} className="club-dialog-success" tabIndex={-1} role="status"><CircleCheck size={19} aria-hidden="true" /> Та энэ дугуйланд бүртгүүлсэн.</p>}
          {!enrolled && (
            <button type="button" className="button button-primary club-enroll-button" disabled={full || enrolling} onClick={register}>
              {enrolling ? 'Бүртгүүлж байна…' : full ? 'Суудал дүүрсэн' : 'Бүртгүүлэх'}
            </button>
          )}
        </div>
      </div>
    </dialog>
  )
}

export default function StudentDashboard({ student, clubs, state, onEnroll }) {
  const [view, setView] = useState('catalog')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const myClubIds = new Set(state.enrollments.filter(item => item.studentId === student.id).map(item => item.clubId))
  const contactFor = club => myClubIds.has(club.id) ? getTeacherContact(state, club) : undefined
  const selectedClub = clubs.find(club => club.id === selectedId)
  const searchWords = query.toLocaleLowerCase('mn-MN').trim().split(/\s+/).filter(Boolean)
  const visibleClubs = clubs.filter(club => {
    if (view === 'registered' && !myClubIds.has(club.id)) return false
    if (category !== 'all' && category !== club.category) return false

    const categoryLabel = categories.find(({ id }) => id === club.category)?.label
    const searchableText = [club.title, club.teacherName, club.description, club.schedule, club.location, categoryLabel]
      .join(' ')
      .toLocaleLowerCase('mn-MN')
    return searchWords.every(word => searchableText.includes(word))
  })

  function selectView(nextView) {
    setView(nextView)
    setQuery('')
    setCategory('all')
  }

  return (
    <div className="app-container catalog-page">
      <div className="catalog-hero">
        <div>
          <div className="catalog-city"><MapPin size={16} aria-hidden="true" /> Эрдэнэт хот</div>
          <h1>{view === 'catalog' ? 'Дуртай дугуйлангаа олоорой.' : 'Миний бүртгэл'}</h1>
          <p>{view === 'catalog' ? 'Спорт, урлаг, хэл, технологийн дугуйлангуудаас сонгоорой.' : 'Бүртгүүлсэн дугуйлангийнхаа хуваарь, байршлыг эндээс хараарай.'}</p>
        </div>
        <div className="catalog-views" role="group" aria-label="Сурагчийн цэс">
          <button type="button" aria-pressed={view === 'catalog'} onClick={() => selectView('catalog')}><LayoutGrid size={17} aria-hidden="true" /> Бүх дугуйлан</button>
          <button type="button" aria-pressed={view === 'registered'} onClick={() => selectView('registered')}><Bookmark size={17} aria-hidden="true" /> Миний бүртгэл{myClubIds.size > 0 && <span className="catalog-view-count">{myClubIds.size}</span>}</button>
        </div>
      </div>

      <section className="catalog-content" aria-labelledby="catalog-list-heading">
        <div className="catalog-controls">
          <div className="catalog-categories" role="group" aria-label="Ангиллаар харах">
            <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>Бүгд</button>
            {categories.map(({ id, label }) => {
              const Icon = categoryIcons[id] ?? LayoutGrid
              return <button type="button" key={id} aria-pressed={category === id} onClick={() => setCategory(id)}><Icon size={17} aria-hidden="true" />{label}</button>
            })}
          </div>
          <label className="catalog-search">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">Дугуйлан хайх</span>
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Дугуйлан хайх" />
          </label>
        </div>

        <div className="catalog-section-heading">
          <h2 id="catalog-list-heading">{view === 'registered' ? 'Бүртгүүлсэн дугуйлан' : 'Дугуйлангууд'}</h2>
          <span role="status">{visibleClubs.length} дугуйлан</span>
        </div>

        {visibleClubs.length > 0 ? (
          <div className="catalog-grid">
            {visibleClubs.map(club => (
              <ClubCard
                key={club.id}
                club={club}
                filled={getFilledCount(state, club)}
                enrolled={myClubIds.has(club.id)}
                contact={contactFor(club)}
                onView={() => setSelectedId(club.id)}
              />
            ))}
          </div>
        ) : (
          <div className="catalog-empty">
            <span className="catalog-empty-icon">{view === 'registered' && !myClubIds.size ? <Bookmark size={26} aria-hidden="true" /> : <Search size={26} aria-hidden="true" />}</span>
            <h3>{view === 'registered' && !myClubIds.size ? 'Одоогоор бүртгэл алга' : 'Дугуйлан олдсонгүй'}</h3>
            <p>{view === 'registered' && !myClubIds.size ? 'Сонирхсон дугуйландаа бүртгүүлмэгц энд харагдана.' : 'Хайлтын үг эсвэл сонгосон ангиллаа өөрчилж үзээрэй.'}</p>
            {view === 'registered' && !myClubIds.size ? (
              <button type="button" className="button button-primary" onClick={() => selectView('catalog')}>Бүх дугуйлан харах</button>
            ) : (
              <button type="button" className="button button-primary" onClick={() => selectView(view)}>Шүүлт арилгах</button>
            )}
          </div>
        )}
      </section>

      {selectedClub && (
        <ClubDialog
          key={selectedClub.id}
          club={selectedClub}
          filled={getFilledCount(state, selectedClub)}
          enrolled={myClubIds.has(selectedClub.id)}
          contact={contactFor(selectedClub)}
          onClose={() => setSelectedId(null)}
          onEnroll={onEnroll}
        />
      )}
    </div>
  )
}
