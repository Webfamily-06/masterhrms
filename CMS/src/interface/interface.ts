export interface MarkdownData {
  slug: string;
  content: string;
  [key: string]: unknown;
}

export interface MobileMenuSubItem {
  id: string;
  label: string;
  href: string;
}

export interface MobileMenuData {
  id: string;
  title: string;
  submenu: MobileMenuSubItem[];
}

export interface ServiceData extends MarkdownData {
  slug: string;
  title: string;
  description: string;
  iconClass: string;
}

export interface TeamMember extends MarkdownData {
  slug: string;
  name: string;
  title: string;
  image: string;
  heroImage: string;
  email: string;
  phone: string;
  bio: string;
  order: number;
}

export interface BlogPost extends MarkdownData {
  slug: string;
  title: string;
  image: string;
  heroImageLeft: string;
  heroImageRight: string;
  publishedAt: string;
  dateTime: string;
  readTime: string;
  authorName: string;
  authorImage: string;
  footerAuthorName: string;
  footerAuthorImage: string;
  footerPublishedAt: string;
  footerReadTime: string;
  imageHeight: string;
  order: number;
}
