import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const getMarkDownContent = (folder: string, slug: string) => {
  let filePath = path.join(process.cwd(), folder, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    const fallbackPath = path.resolve(__dirname, '../../', folder, `${slug}.md`);
    if (fs.existsSync(fallbackPath)) {
      filePath = fallbackPath;
    }
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const matterResult = matter(content);
  return matterResult;
};

export default getMarkDownContent;
