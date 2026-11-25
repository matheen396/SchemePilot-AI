import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from './pool.js';
import { embedText } from '../services/embeddings.js';

async function migrate() {
  const migrationDir = resolve(process.cwd(), '../../db/migrations');
  const files = (await readdir(migrationDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await readFile(resolve(migrationDir, file), 'utf8');
    await pool.query(sql);
    console.log(`Applied ${file}`);
  }
}

const demoPrograms = [
  { slug: 'demo-student-support', title: 'Demo Student Support Grant', summary: 'Illustrative example of education support for students from lower-income households.', benefits: 'Example tuition assistance and learning materials support.', state: 'ALL', category: 'Education', eligibility: { incomeMax: 300000, ageMax: 25, employment: 'student' }, source_url: 'https://example.org/demo/student-support' },
  { slug: 'demo-rural-enterprise', title: 'Demo Rural Enterprise Starter', summary: 'Illustrative example of a small-business support program for rural entrepreneurs.', benefits: 'Example business training and startup assistance.', state: 'ALL', category: 'Entrepreneurship', eligibility: { incomeMax: 500000, ageMin: 18 }, source_url: 'https://example.org/demo/rural-enterprise' },
  { slug: 'demo-womens-skills', title: 'Demo Women Skills Fellowship', summary: 'Illustrative example of vocational training for women returning to work.', benefits: 'Example course fee support and job placement guidance.', state: 'ALL', category: 'Employment', eligibility: { ageMin: 18, employment: 'seeking_work' }, source_url: 'https://example.org/demo/womens-skills' },
  { slug: 'demo-farm-water', title: 'Demo Farm Water Conservation Fund', summary: 'Illustrative example of support for small farms adopting water-saving equipment.', benefits: 'Example partial equipment subsidy and advisory visits.', state: 'ALL', category: 'Agriculture', eligibility: { incomeMax: 600000, employment: 'farmer' }, source_url: 'https://example.org/demo/farm-water' },
  { slug: 'demo-accessibility', title: 'Demo Accessibility at Work Grant', summary: 'Illustrative example of workplace accessibility support for eligible employees.', benefits: 'Example assistive equipment and workplace modification assistance.', state: 'ALL', category: 'Accessibility', eligibility: { ageMin: 18, employment: 'employed' }, source_url: 'https://example.org/demo/accessibility' },
  { slug: 'demo-health-cover', title: 'Demo Community Health Cover', summary: 'Illustrative example of community health coverage for qualifying families.', benefits: 'Example basic preventive care and hospital support.', state: 'ALL', category: 'Health', eligibility: { incomeMax: 400000 }, source_url: 'https://example.org/demo/health-cover' },
];

async function seed() {
  for (const program of demoPrograms) {
    const text = `${program.title}. ${program.summary} ${program.benefits} Category: ${program.category}.`;
    const vector = await embedText(text);
    await pool.query(
      `INSERT INTO programs (slug,title,summary,benefits,eligibility,state,category,source_url,embedding,demo_only)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector,true)
       ON CONFLICT (slug) DO NOTHING`,
      [program.slug, program.title, program.summary, program.benefits, program.eligibility, program.state, program.category, program.source_url, `[${vector.join(',')}]`],
    );
  }
  console.log(`Seed checked: ${demoPrograms.length} illustrative records (not official scheme data).`);
}

const command = process.argv[2];
try {
  if (command === 'migrate') await migrate();
  else if (command === 'seed') await seed();
  else throw new Error('Use: npm run db:migrate | npm run db:seed');
} finally {
  await pool.end();
}
