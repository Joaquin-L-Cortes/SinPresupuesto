import { promises as fs } from 'fs';
import path from 'path';

const sectionsFile = path.join(process.cwd(), 'content', 'classroom_sections.json');

export async function readSections() {
  const data = await fs.readFile(sectionsFile, 'utf8');
  return JSON.parse(data) as Section[];
}

export async function writeSections(sections: Section[]) {
  await fs.writeFile(sectionsFile, JSON.stringify(sections, null, 2), 'utf8');
}

// Types (mirroring the JSON structure)
export interface Material {
  id: string;
  nombre: string;
  url: string;
}

export interface Category {
  id: string;
  nombre: string;
  orden: number;
  materiales: Material[];
}

export interface Section {
  id: string;
  nombre: string;
  orden: number;
  categorias: Category[];
}
