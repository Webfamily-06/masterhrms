import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const STATIC_MARKDOWN_DIRS: Record<string, string> = {
  blog: path.join(process.cwd(), 'src', 'data', 'blog'),
  services: path.join(process.cwd(), 'src', 'data', 'services'),
  team: path.join(process.cwd(), 'src', 'data', 'team'),
};

function resolveMarkdownFile(folder: string, slug: string): string {
  const normalized = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const key = normalized.startsWith('src/data/')
    ? normalized.slice('src/data/'.length)
    : normalized;
  const dir = STATIC_MARKDOWN_DIRS[key] || STATIC_MARKDOWN_DIRS.services;
  const safeSlug = path.basename(slug);
  return path.join(dir, `${safeSlug}.md`);
}

const getMarkDownContent = (folder: string, slug: string) => {
  const filePath = resolveMarkdownFile(folder, slug);
  const content = fs.readFileSync(filePath, 'utf8');
  return matter(content);
};

export default getMarkDownContent;
