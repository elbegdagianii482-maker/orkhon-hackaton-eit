import { useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  MapPin,
  Plus,
  Users,
} from 'lucide-react';
import { categories, formatPrice, getFilledCount } from './data.js';
import './TeacherDashboard.css';

function getRoster(state, clubId) {
  const activeStudent = state.profiles.student;

  return state.enrollments
    .filter((enrollment) => enrollment.clubId === clubId)
    .map((enrollment) => enrollment.student ?? (
      enrollment.studentId === activeStudent?.id ? activeStudent : null
    ))
    .filter(Boolean);
}

function TeacherClub({ club, state, students }) {
  const filled = getFilledCount(state, club);
  const remaining = Math.max(0, club.capacity - filled);
  const category = categories.find((item) => item.id === club.category);

  return (
    <article className="teacher-class">
      <div className="teacher-class-top">
        <div>
          <p className="teacher-class-category">{category?.label}</p>
          <h3>{club.title}</h3>
        </div>
        <span className="teacher-class-price">{formatPrice(club.fee)}</span>
      </div>

      <div className="teacher-class-meta">
        <span><CalendarDays size={16} aria-hidden="true" />{club.schedule}</span>
        <span><MapPin size={16} aria-hidden="true" />{club.location}</span>
      </div>

      <div className="teacher-class-capacity">
        <span>{remaining ? `${remaining} сул суудал` : 'Суудал дүүрсэн'}</span>
        <strong>{filled} / {club.capacity}</strong>
        <progress aria-label="Бүртгүүлсэн сурагчийн тоо" value={filled} max={club.capacity} />
      </div>

      <details className="teacher-roster">
        <summary>
          <Users size={17} aria-hidden="true" />
          <span>Сурагчдын жагсаалт ({students.length})</span>
          <ChevronDown size={17} aria-hidden="true" className="teacher-roster-chevron" />
        </summary>
        {students.length ? (
          <div className="teacher-roster-scroll" tabIndex={0} role="region" aria-label="Бүртгүүлсэн сурагчид">
            <table className="teacher-roster-table">
              <thead>
                <tr>
                  <th scope="col">Нэр</th>
                  <th scope="col">Нас</th>
                  <th scope="col">Анги</th>
                  <th scope="col">Утас</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <th scope="row">{student.name}</th>
                    <td>{student.age}</td>
                    <td>{student.grade}</td>
                    <td>{student.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="teacher-roster-empty">Одоогоор сурагч бүртгүүлээгүй байна.</p>
        )}
      </details>
    </article>
  );
}

export default function TeacherDashboard({ teacher, clubs, state, onPublish, goToCatalog }) {
  const [status, setStatus] = useState({ error: false, message: '' });
  const [publishing, setPublishing] = useState(false);
  const ownClasses = clubs.map((club) => ({ club, students: getRoster(state, club.id) }));
  const enrolled = ownClasses.reduce((count, { students }) => count + students.length, 0);
  const available = ownClasses.reduce(
    (count, { club }) => count + Math.max(0, club.capacity - getFilledCount(state, club)),
    0,
  );

  async function handlePublish(event) {
    event.preventDefault();
    if (publishing) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const club = {
      title: values.get('title').trim(),
      category: values.get('category'),
      description: values.get('description').trim(),
      capacity: Number(values.get('capacity')),
      schedule: values.get('schedule').trim(),
      fee: Number(values.get('fee')),
      location: values.get('location').trim(),
    };

    if (![club.title, club.description, club.schedule, club.location].every(Boolean)) {
      setStatus({ error: true, message: 'Мэдээллийн талбаруудыг бөглөнө үү.' });
      return;
    }

    if (!Number.isSafeInteger(club.capacity) || club.capacity < 1 || club.capacity > 10000) {
      setStatus({ error: true, message: 'Сурагчийн тоог 1–10,000 хооронд оруулна уу.' });
      return;
    }

    if (!Number.isSafeInteger(club.fee) || club.fee < 0) {
      setStatus({ error: true, message: 'Төлбөрийг 0 эсвэл эерэг бүхэл тоогоор оруулна уу.' });
      return;
    }

    setPublishing(true);
    setStatus({ error: false, message: '' });
    let error;
    try {
      error = await onPublish(club);
    } finally {
      setPublishing(false);
    }
    if (error) {
      setStatus({ error: true, message: error });
      return;
    }

    form.reset();
    setStatus({ error: false, message: 'Дугуйлан нийтлэгдлээ. Сурагчид каталогоос бүртгүүлэх боломжтой.' });
  }

  return (
    <div className="app-container teacher-dashboard">
      <header className="teacher-dashboard-header">
        <div>
          <p className="teacher-dashboard-eyebrow"><ClipboardList size={17} aria-hidden="true" />Багшийн хэсэг</p>
          <h1>Дугуйлангаа удирдах</h1>
          <p className="teacher-dashboard-intro">Сайн байна уу, {teacher.name}! Дугуйлан нийтэлж, сурагчдын бүртгэлээ эндээс хараарай.</p>
        </div>
        <button className="button button-secondary teacher-catalog-button" type="button" onClick={goToCatalog}>
          <BookOpen size={19} aria-hidden="true" /> Каталог харах
        </button>
      </header>

      <ul className="teacher-stats" aria-label="Дугуйлангийн тойм">
        <li className="teacher-stat">
          <span className="teacher-stat-icon"><BookOpen size={21} aria-hidden="true" /></span>
          <div><span>Нийтэлсэн дугуйлан</span><strong>{clubs.length}</strong></div>
        </li>
        <li className="teacher-stat">
          <span className="teacher-stat-icon teacher-stat-lavender"><Users size={21} aria-hidden="true" /></span>
          <div><span>Сурагчийн бүртгэл</span><strong>{enrolled}</strong></div>
        </li>
        <li className="teacher-stat">
          <span className="teacher-stat-icon teacher-stat-gold"><CalendarDays size={21} aria-hidden="true" /></span>
          <div><span>Нээлттэй суудал</span><strong>{available}</strong></div>
        </li>
      </ul>

      <div className="teacher-dashboard-grid">
        <section className="teacher-panel" aria-labelledby="teacher-create-heading">
          <div className="teacher-panel-header">
            <span className="teacher-panel-icon"><Plus size={23} aria-hidden="true" /></span>
            <div>
              <h2 id="teacher-create-heading">Дугуйлан нийтлэх</h2>
              <p>Каталогт харагдах мэдээллийг оруулна уу.</p>
            </div>
          </div>

          <form className="teacher-form" onSubmit={handlePublish}>
            <label>
              Дугуйлангийн нэр
              <input name="title" maxLength={120} placeholder="Жишээ нь, Сагсан бөмбөгийн дугуйлан" required />
            </label>
            <label>
              Ангилал
              <span className="teacher-select">
                <select name="category" defaultValue="" required>
                  <option value="" disabled>Ангиллаа сонгоно уу</option>
                  {categories.filter((category) => category.id !== 'all').map(({ id, label }) => (
                    <option value={id} key={id}>{label}</option>
                  ))}
                </select>
                <ChevronDown size={17} aria-hidden="true" />
              </span>
            </label>
            <label>
              Тайлбар
              <textarea name="description" rows={3} maxLength={1200} placeholder="Сурагчид юу сурах, хэнд зориулсан талаар бичээрэй." required />
            </label>
            <div className="teacher-form-row">
              <label>
                Сурагчийн тоо
                <input name="capacity" type="number" min="1" max="10000" step="1" placeholder="20" required />
              </label>
              <label>
                Төлбөр (₮)
                <input name="fee" type="number" min="0" step="1" placeholder="50000" aria-describedby="teacher-fee-hint" required />
                <span id="teacher-fee-hint" className="teacher-field-hint">Үнэгүй бол 0 гэж оруулна уу.</span>
              </label>
            </div>
            <label>
              Цагийн хуваарь
              <input name="schedule" maxLength={180} placeholder="Даваа, Лхагва · 16:00–17:30" required />
            </label>
            <label>
              Хаяг
              <input name="location" maxLength={220} placeholder="Эрдэнэт хот, 1-р баг, Спортын ордон" required />
            </label>

            <div>
              <button className="button button-primary teacher-publish" type="submit" disabled={publishing}>
                <Plus size={19} aria-hidden="true" /> {publishing ? 'Нийтэлж байна…' : 'Дугуйлан нийтлэх'}
              </button>
              <div role="status" aria-live="polite">
                {status.message && (
                  <p className={status.error ? 'teacher-feedback teacher-feedback-error' : 'teacher-feedback'}>
                    {!status.error && <CheckCircle2 size={18} aria-hidden="true" />}
                    {status.message}
                  </p>
                )}
              </div>
            </div>
          </form>
        </section>

        <section className="teacher-panel" aria-labelledby="teacher-classes-heading">
          <div className="teacher-panel-header">
            <span className="teacher-panel-icon"><BookOpen size={22} aria-hidden="true" /></span>
            <div>
              <h2 id="teacher-classes-heading">Миний дугуйлангууд</h2>
              <p>Нийтэлсэн дугуйлан болон сурагчдын бүртгэл.</p>
            </div>
          </div>
          {ownClasses.length ? (
            <div className="teacher-class-list">
              {ownClasses.map(({ club, students }) => (
                <TeacherClub key={club.id} club={club} state={state} students={students} />
              ))}
            </div>
          ) : (
            <div className="teacher-empty">
              <span className="teacher-empty-icon"><ClipboardList size={29} aria-hidden="true" /></span>
              <h3>Таны дугуйлан энд харагдана</h3>
              <p>Эхний дугуйлангаа нийтэлж, сурагчдын бүртгэлийг нээгээрэй.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
