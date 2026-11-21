export const categories = [
  { id: 'sports', label: 'Спорт' },
  { id: 'art', label: 'Урлаг' },
  { id: 'language', label: 'Хэл' },
  { id: 'technology', label: 'Технологи' },
  { id: 'dance', label: 'Бүжиг' },
]

export const seedClubs = [
  {
    id: 'demo-basketball',
    title: 'Сагсан бөмбөг',
    category: 'sports',
    description: 'Шидэлт, дамжуулалт, бөмбөг эзэмших үндсэн техникийг багийн тоглолтоор сурна. Анхлан суралцагчдад нээлттэй.',
    teacherName: 'Б. Тэмүүлэн',
    teacherId: null,
    capacity: 20,
    initialFilled: 12,
    schedule: 'Даваа, Лхагва · 16:00–17:30',
    fee: 80000,
    location: 'Эрдэнэт, Баян-Өндөр сум, Хангарьд спорт цогцолбор',
    image: 'images/basketball.jpg',
  },
  {
    id: 'demo-art',
    title: 'Уран зураг, дүрслэх урлаг',
    category: 'art',
    description: 'Харандаа, усан будаг, акрилаар ажиллаж, дүрс зохиомж болон өнгөний үндсийг бүтээл хийх явцдаа сурна.',
    teacherName: 'Д. Анужин',
    teacherId: null,
    capacity: 12,
    initialFilled: 7,
    schedule: 'Мягмар, Пүрэв · 16:30–18:00',
    fee: 65000,
    location: 'Эрдэнэт, Баян-Өндөр сум, Хүүхэд залуучуудын ордон',
    image: 'images/art.jpg',
  },
  {
    id: 'demo-english',
    title: 'Англи хэлний ярианы клуб',
    category: 'language',
    description: 'Өдөр тутмын сэдвээр ярилцаж, сонсох болон өөрийгөө чөлөөтэй илэрхийлэх чадвараа сонирхолтой дасгалаар хөгжүүлнэ.',
    teacherName: 'О. Номин',
    teacherId: null,
    capacity: 16,
    initialFilled: 10,
    schedule: 'Лхагва, Баасан · 17:00–18:00',
    fee: 50000,
    location: 'Эрдэнэт, Баян-Өндөр сум, Орхон аймгийн Нийтийн номын сан',
    image: 'images/english.jpg',
  },
  {
    id: 'demo-coding',
    title: 'Анхны вэбсайтаа бүтээе',
    category: 'technology',
    description: 'HTML, CSS, JavaScript-ийн суурь ойлголтыг эзэмшиж, өөрийн сонирхлын сэдвээр жижиг вэбсайт бүтээнэ. Өмнөх туршлага шаардахгүй.',
    teacherName: 'Г. Энхбат',
    teacherId: null,
    capacity: 14,
    initialFilled: 8,
    schedule: 'Бямба · 11:00–13:00',
    fee: 0,
    location: 'Эрдэнэт, Баян-Өндөр сум, ШУТИС-ийн Эрдэнэт цогцолбор',
    image: 'images/coding.jpg',
  },
  {
    id: 'demo-volleyball',
    title: 'Гар бөмбөгийн секц',
    category: 'sports',
    description: 'Давуулалт, хүлээн авалт, довтолгооны суурь техникт суралцаж, багийн тоглолтоор дадлага хийнэ.',
    teacherName: 'С. Мөнхжин',
    teacherId: null,
    capacity: 18,
    initialFilled: 14,
    schedule: 'Мягмар, Пүрэв · 17:00–18:30',
    fee: 70000,
    location: 'Эрдэнэт, Баян-Өндөр сум, Хангарьд спорт цогцолбор',
    image: 'images/volleyball.jpg',
  },
  {
    id: 'demo-dance',
    title: 'Орчин үеийн бүжиг',
    category: 'dance',
    description: 'Хөгжмийн хэмнэл мэдрэх, хөдөлгөөнөө зохицуулах дасгал хийж, хамтдаа богино дэглэлт сурна.',
    teacherName: 'П. Саруул',
    teacherId: null,
    capacity: 15,
    initialFilled: 9,
    schedule: 'Баасан, Ням · 16:00–17:30',
    fee: 60000,
    location: 'Эрдэнэт, Баян-Өндөр сум, Уурхайчин соёлын ордон',
    image: 'images/dance.jpg',
  },
]

export const storageKey = 'erdenet-youth-hub:v1'

function createInitialState() {
  return {
    profiles: { student: null, teacher: null },
    clubs: seedClubs.map((club) => ({ ...club })),
    enrollments: [],
  }
}

export function loadState() {
  try {
    const raw = globalThis.localStorage.getItem(storageKey)
    if (raw === null) return createInitialState()

    const state = JSON.parse(raw)
    if (state?.profiles && Array.isArray(state.clubs) && Array.isArray(state.enrollments)) {
      return state
    }
  } catch {
    // The demo can still run in memory when browser storage is unavailable.
  }

  return createInitialState()
}

export function saveState(state) {
  try {
    globalThis.localStorage.setItem(storageKey, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function getFilledCount(state, club) {
  if (Number.isInteger(club.filled)) return club.filled
  const registrations = state.enrollments.filter(({ clubId }) => clubId === club.id).length
  return (club.initialFilled ?? 0) + registrations
}

const demoTeacherPhones = new Map([
  ['demo-basketball', '00000001'],
  ['demo-art', '00000002'],
  ['demo-english', '00000003'],
  ['demo-coding', '00000004'],
  ['demo-volleyball', '00000005'],
  ['demo-dance', '00000006'],
])

export function getTeacherContact(state, club) {
  const enrollment = state.enrollments?.find(({ clubId }) => clubId === club.id)
  if (enrollment && Object.hasOwn(enrollment, 'contact')) return enrollment.contact

  if (!club.teacherId) {
    const phone = demoTeacherPhones.get(club.id)
    return phone ? { phone, isDemo: true } : null
  }

  const savedTeacher = state.savedProfiles?.teacher?.find(({ id }) => id === club.teacherId)
  const activeTeacher = state.profiles?.teacher
  const matchingActivePhone = activeTeacher?.id === club.teacherId ? activeTeacher.phone : null
  const phone = savedTeacher?.phone || matchingActivePhone
  return phone ? { phone, isDemo: false } : null
}

const priceFormatter = new Intl.NumberFormat('mn-MN')

export function formatPrice(fee) {
  return fee === 0 ? 'Үнэгүй' : `${priceFormatter.format(fee)} ₮`
}
