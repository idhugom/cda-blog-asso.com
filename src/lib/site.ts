export const SITE = {
  origin: (import.meta.env.SITE as string) || 'https://cda-blog-asso.com',
  name: 'CDA',
  fullName: 'CDA — Le magazine',
  tagline: 'Les idées claires sur tout ce qui compte',
  description:
    "CDA est le magazine associatif qui décrypte le quotidien : conseils pratiques, comparatifs et guides fiables pour décider mieux — auto, assurance, maison, mode, voyage, santé et plus encore.",
  locale: 'fr_FR',
  lang: 'fr',
  author: 'La rédaction CDA',
  publisher: 'CDA — Association',
  email: 'contact@cda-blog-asso.com',
  twitter: '',
  themeColor: '#faf9f6',
} as const;

export const NAV = [
  { label: 'Le magazine', href: '/' },
  { label: 'Rubriques', href: '/rubriques/' },
  { label: 'Tous les articles', href: '/articles/' },
  { label: 'À propos', href: '/a-propos/' },
] as const;

export type Category = {
  slug: string;
  name: string;
  blurb: string;
  icon: string;
};
