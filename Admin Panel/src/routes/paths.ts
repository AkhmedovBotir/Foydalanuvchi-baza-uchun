export const paths = {
  login: '/login',
  home: '/',
  admins: '/admins',
  companies: '/companies',
  cards: '/card-templates',
  settings: '/settings',
  profile: '/profile',
} as const

export type AppPath = (typeof paths)[keyof typeof paths]

export const routeTitles: Record<string, string> = {
  [paths.home]: 'Bosh sahifa',
  [paths.admins]: 'Adminlar',
  [paths.companies]: 'Kompaniyalar',
  [paths.cards]: 'Vizitka shablonlari',
  [paths.settings]: 'Sozlamalar',
  [paths.profile]: 'Profil',
}
