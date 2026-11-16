#!/usr/bin/env node
/**
 * Import hcmute-dsc/sql-challenge into tracks/sql-30-days (CONTENT-SPECIFICATION §9).
 *
 *   node tools/import-sql-challenge.mjs ../sql-challenge
 *
 * Safe to re-run: it rebuilds tracks/sql-30-days from scratch, and uids are derived
 * from names (UUID v5), so the same lesson always gets the same uid.
 *
 * What it does, per source lesson `lessons/NN-name.md`:
 *   - the lesson keeps its text; the H1 becomes `title`, and the footer nav is dropped
 *   - "Sau bài này bạn có thể" → `objectives`, "Cần biết trước" links → `prerequisites`
 *   - the exercise section(s) move into a separate `self_check` exercise
 *   - the final project in 99-summary becomes a `project` exercise with its rubric
 *   - relative links and images are rewritten to the new folder layout
 *
 * No dependencies: plain Node 22.
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ------------------------------------------------------------------ configuration

const TRACK = {
  slug: 'sql-30-days',
  title: '30 ngày học SQL',
  summary:
    'Lộ trình học SQL trong 30 ngày với PostgreSQL 16 và bộ dữ liệu DSC Shop: từ SELECT cơ bản tới index, transaction, window function, tối ưu truy vấn và bảo mật.',
  language: 'vi',
  level: 'beginner',
  estimatedHours: 60,
  tags: ['sql', 'postgresql', 'database'],
  outcomes: [
    'Viết truy vấn SELECT, JOIN, GROUP BY, subquery và window function đúng kết quả',
    'Thiết kế schema có ràng buộc, index và transaction phù hợp',
    'Đọc kế hoạch thực thi, tối ưu truy vấn và bảo vệ database khỏi SQL injection',
  ],
  maintainers: ['github:TienNHM'],
  license: 'MIT', // same licence as the source repo
  position: 10,
};

/** Modules = the four stages of the course. `days` are the source file numbers. */
const MODULES = [
  { dir: '01-foundations', slug: 'foundations', title: 'Chặng 1: Nền tảng và truy vấn đơn giản', days: [0, 1, 2, 3, 4, 5, 6, 7], difficulty: 'easy' },
  { dir: '02-aggregation-and-joins', slug: 'aggregation-and-joins', title: 'Chặng 2: Tổng hợp và kết hợp dữ liệu', days: [8, 9, 10, 11, 12, 13, 14], difficulty: 'medium' },
  { dir: '03-database-objects', slug: 'database-objects', title: 'Chặng 3: Index, transaction và các đối tượng database', days: [15, 16, 17, 18, 19, 20, 21], difficulty: 'medium' },
  { dir: '04-sql-in-practice', slug: 'sql-in-practice', title: 'Chặng 4: SQL trong thực tế', days: [22, 23, 24, 25, 26, 27, 28, 29, 30, 99], difficulty: 'hard' },
];

/**
 * Which `## ` sections of a lesson are exercises. Most lessons use "## Bài tập";
 * the review days and the summary are structured differently.
 */
const EXERCISE_SECTIONS = {
  default: [/^Bài tập$/],
  14: [/^Phần [A-E]:/, /^Tự đánh giá$/],
  21: [/^Câu hỏi kiểm tra khái niệm$/, /^Bài tập$/],
  99: [], // handled by FINAL_EXERCISES below
};

/** 99-summary has two exercises of its own. */
const FINAL_EXERCISES = [
  { slug: 'final-review-questions', title: 'Câu hỏi ôn tập cuối khóa', type: 'self_check', section: /^2\. Câu hỏi ôn tập cuối khóa$/ },
  { slug: 'final-project', title: 'Dự án cuối khóa', type: 'project', section: /^3\. Dự án cuối khóa$/ },
];

const SELF_CHECK_LIST = [
  'Tự viết và chạy truy vấn cho từng bài trước khi mở "Đáp án"',
  'Kết quả của mình khớp với kết quả trong đáp án',
  'Đọc lại phần lý thuyết của những bài làm sai',
];

/** Fixed namespace so uids are stable across runs. Never change it. */
const UID_NAMESPACE = 'c1d2a0e4-5b7f-4f3e-9a61-2d8c0b9e7a15';

// ------------------------------------------------------------------ main

const here = dirname(fileURLToPath(import.meta.url));
const contentRoot = resolve(here, '..');
const sourceRoot = resolve(process.argv[2] ?? '../sql-challenge');
const trackDir = join(contentRoot, 'tracks', TRACK.slug);

function main() {
  if (!existsSync(join(sourceRoot, 'lessons'))) {
    console.error(`Not a sql-challenge checkout: ${sourceRoot}`);
    process.exit(1);
  }
  const sourceCommit = execSync('git rev-parse HEAD', { cwd: sourceRoot }).toString().trim();

  rmSync(trackDir, { recursive: true, force: true });
  copySupportFiles();

  const lessonFiles = readdirSync(join(sourceRoot, 'lessons')).filter((f) => /^\d{2}-.+\.md$/.test(f));
  const plan = planLessons(lessonFiles);

  for (const module of MODULES) {
    const moduleLessons = plan.filter((l) => l.module === module);
    const exercises = moduleLessons.flatMap((lesson) => importLesson(lesson, plan));
    writeYaml(join(trackDir, 'modules', module.dir, 'module.yaml'), {
      uid: uid(`module/${module.slug}`),
      slug: module.slug,
      title: module.title,
      lessons: moduleLessons.map((l) => l.fileBase),
      exercises: exercises.map((e) => e.slug),
    });
  }

  writeYaml(join(trackDir, 'track.yaml'), {
    uid: uid('track'),
    ...TRACK,
    source: { repo: 'hcmute-dsc/sql-challenge', commit: sourceCommit },
    modules: MODULES.map((m) => m.dir),
  });
  writeTrackReadme(plan, sourceCommit);
  console.log(`Imported ${plan.length} lessons from sql-challenge@${sourceCommit.slice(0, 7)} into ${trackDir}`);
}

// ------------------------------------------------------------------ planning

/** Decide where each source lesson goes, before reading any of them (links need the full map). */
function planLessons(files) {
  return files.sort().map((file) => {
    const day = Number(file.slice(0, 2));
    const module = MODULES.find((m) => m.days.includes(day));
    if (!module) throw new Error(`No module configured for ${file}`);
    const fileBase = file.replace(/\.md$/, '');
    return {
      day,
      file,
      fileBase,
      slug: fileBase.replace(/^\d{2}-/, ''),
      module,
      newPath: `modules/${module.dir}/lessons/${file}`, // relative to the track folder
    };
  });
}

// ------------------------------------------------------------------ one lesson

/** Write the lesson file and its exercise(s). Returns the exercises created. */
function importLesson(lesson, plan) {
  const source = readFileSync(join(sourceRoot, 'lessons', lesson.file), 'utf8').replace(/\r\n/g, '\n');
  const { title, body } = takeTitle(dropFooterNav(source));
  const sections = splitSections(body);

  const exerciseSectionNames = EXERCISE_SECTIONS[lesson.day] ?? EXERCISE_SECTIONS.default;
  const isExercise = (s) => exerciseSectionNames.some((re) => re.test(s.heading));
  const exercises = [];

  if (lesson.day === 99) {
    for (const spec of FINAL_EXERCISES) {
      const section = sections.find((s) => spec.section.test(s.heading));
      if (!section) throw new Error(`99-summary: section ${spec.section} not found`);
      exercises.push(writeExercise(lesson, plan, { ...spec, sections: [section] }));
    }
  } else {
    const exerciseSections = sections.filter(isExercise);
    if (exerciseSections.length) {
      exercises.push(
        writeExercise(lesson, plan, {
          slug: `${lesson.slug}-exercises`,
          title: `Bài tập: ${shortTitle(title)}`,
          type: 'self_check',
          sections: exerciseSections,
        }),
      );
    }
  }

  // The lesson keeps every section except the ones moved into exercises.
  const moved = new Set(exercises.flatMap((e) => e.sections));
  const lessonBody = sections
    .map((s) => (moved.has(s) ? exercisePointer(exercises.find((e) => e.sections.includes(s))) : s.text))
    .filter((text, i, all) => text !== all[i - 1]) // one pointer even if several sections moved
    .join('');

  const frontMatter = {
    uid: uid(`lesson/${lesson.slug}`),
    slug: lesson.slug,
    title,
    objectives: readObjectives(body),
    prerequisites: readPrerequisites(body, plan),
    authors: ['github:TienNHM'],
    license: TRACK.license,
  };
  writeFile(
    join(trackDir, lesson.newPath),
    `---\n${toYaml(frontMatter)}---\n\n${rewriteLinks(lessonBody.trim(), `lessons/${lesson.file}`, lesson.newPath, plan)}\n`,
  );
  return exercises;
}

function writeExercise(lesson, plan, { slug, title, type, sections }) {
  const dir = `modules/${lesson.module.dir}/exercises/${slug}`;
  const statementSource =
    `${STATEMENT_INTRO}\n\n` + sections.map((s) => s.text).join('').trim();
  const statement = rewriteLinks(statementSource, `lessons/${lesson.file}`, `${dir}/statement.md`, plan);

  const spec =
    type === 'project'
      ? { deliverable: 'github_repo_or_pr', rubric: readRubric(statementSource) }
      : { checklist: SELF_CHECK_LIST };

  writeYaml(join(trackDir, dir, 'exercise.yaml'), {
    uid: uid(`exercise/${slug}`),
    slug,
    title,
    type,
    difficulty: lesson.module.difficulty,
    lesson: lesson.slug,
    tags: ['sql'],
    authors: ['github:TienNHM'],
    license: TRACK.license,
    spec,
  });
  writeFile(join(trackDir, dir, 'statement.md'), `${statement}\n`);
  return { slug, title, sections };
}

const STATEMENT_INTRO =
  '> Làm trên bộ dữ liệu DSC Shop. Tự viết và chạy truy vấn trước, sau đó mới mở **Đáp án** để so kết quả.';

const exercisePointer = (exercise) =>
  `## Bài tập\n\nPhần bài tập của bài này nằm ở bài tập **${exercise.title}** ngay sau bài học.\n\n`;

// ------------------------------------------------------------------ reading the source markdown

/** Remove the "⬅️ … | 📚 Mục lục | … ➡️" navigation at the bottom (and its `---`). */
function dropFooterNav(text) {
  return text.replace(/\n---\n+\[⬅️[^\n]*\n*$|\n---\n+\[📚[^\n]*\n*$/u, '\n');
}

/** First line `# Title` → title; the rest is the body. */
function takeTitle(text) {
  const match = /^# (.+)\n/.exec(text);
  if (!match) throw new Error('lesson has no H1 title');
  return { title: match[1].trim(), body: text.slice(match[0].length) };
}

/** "Ngày 3: SELECT và WHERE, …" → "SELECT và WHERE, …" */
const shortTitle = (title) => title.replace(/^Ngày \d+:\s*/, '');

/**
 * Split on `## ` headings that are not inside a code fence. The text before the
 * first heading is a section with an empty heading.
 */
function splitSections(body) {
  const sections = [{ heading: '', text: '' }];
  let inFence = false;
  for (const line of body.split('\n')) {
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && line.startsWith('## ')) sections.push({ heading: line.slice(3).trim(), text: '' });
    sections.at(-1).text += `${line}\n`;
  }
  return sections;
}

/** Bullet list right after "**Sau bài này bạn có thể:**" */
function readObjectives(body) {
  const block = /\*\*Sau bài này bạn có thể:\*\*\n\n((?:- .+\n)+)/.exec(body);
  return block ? block[1].trim().split('\n').map((line) => line.replace(/^- /, '').trim()) : [];
}

/** Lesson links on the "**Cần biết trước:**" line → `sql-30-days/<module>/<lesson>` refs */
function readPrerequisites(body, plan) {
  const line = /\*\*Cần biết trước:\*\*(.*)/.exec(body)?.[1] ?? '';
  const refs = [...line.matchAll(/\]\((\d{2}-[^)#]+\.md)\)/g)]
    .map((m) => plan.find((l) => l.file === m[1]))
    .filter(Boolean)
    .map((l) => `${TRACK.slug}/${l.module.slug}/${l.slug}`);
  return [...new Set(refs)];
}

/** Rows like `| 1 | ERD và chuẩn hóa | 15 | …` in the rubric table → {criterion, weight} */
function readRubric(markdown) {
  const rows = [...markdown.matchAll(/^\| \d+ \| ([^|]+?) \| (\d+) \|/gm)];
  if (!rows.length) throw new Error('final project rubric table not found');
  return rows.map(([, criterion, points]) => ({ criterion: criterion.trim(), weight: Number(points) }));
}

// ------------------------------------------------------------------ links

/**
 * Source links are relative to the old file. Resolve each to an old repo path,
 * map it to the new location, and make it relative to the new file again.
 */
function rewriteLinks(markdown, oldFile, newFile, plan) {
  return markdown.replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
    if (/^(https?:|mailto:|#)/.test(target)) return whole;
    const [path, hash = ''] = target.split(/(?=#)/);
    const oldTarget = posix.normalize(posix.join(posix.dirname(oldFile), path));
    const newTarget = newLocation(oldTarget, plan);
    if (!newTarget) {
      console.warn(`  ! left unchanged: ${target} (in ${oldFile})`);
      return whole;
    }
    return `](${posix.relative(posix.dirname(newFile), newTarget)}${hash})`;
  });
}

/** Old repo path → new path inside the track folder (null when unknown). */
function newLocation(oldPath, plan) {
  if (oldPath === 'README.md') return 'README.md';
  if (oldPath === 'docker-compose.yml') return 'docker-compose.yml';
  if (oldPath.startsWith('setup/')) return oldPath;
  if (oldPath.startsWith('lessons/img/')) return oldPath.replace('lessons/img/', 'assets/img/');
  if (oldPath.startsWith('diagrams/')) return `assets/${oldPath}`;
  const lesson = plan.find((l) => `lessons/${l.file}` === oldPath);
  return lesson ? lesson.newPath : null;
}

// ------------------------------------------------------------------ support files

function copySupportFiles() {
  cpSync(join(sourceRoot, 'setup'), join(trackDir, 'setup'), { recursive: true });
  cpSync(join(sourceRoot, 'docker-compose.yml'), join(trackDir, 'docker-compose.yml'));
  cpSync(join(sourceRoot, 'lessons', 'img'), join(trackDir, 'assets', 'img'), { recursive: true });
  // Interactive diagram pages linked from some lessons
  cpSync(join(sourceRoot, 'diagrams'), join(trackDir, 'assets', 'diagrams'), { recursive: true });
}

function writeTrackReadme(plan, sourceCommit) {
  const rows = MODULES.map((m) => {
    const lessons = plan
      .filter((l) => l.module === m)
      .map((l) => `- [${readFileSync(join(trackDir, l.newPath), 'utf8').match(/^title: "(.*)"$/m)[1]}](${l.newPath})`)
      .join('\n');
    return `### ${m.title}\n\n${lessons}`;
  }).join('\n\n');

  writeFile(
    join(trackDir, 'README.md'),
    `# ${TRACK.title}

${TRACK.summary}

Nguồn: [hcmute-dsc/sql-challenge](https://github.com/hcmute-dsc/sql-challenge) @ \`${sourceCommit.slice(0, 7)}\` (giấy phép MIT), nhập bằng \`tools/import-sql-challenge.mjs\`. Sửa nội dung tại đây; nếu nhập lại từ nguồn, các chỉnh sửa tại đây sẽ bị ghi đè.

## Chuẩn bị môi trường

Cần Docker. Trong thư mục này chạy \`docker compose up -d\`, xem [setup/README.md](setup/README.md).

## Mục lục

${rows}
`,
  );
}

// ------------------------------------------------------------------ small helpers

/** UUID v5 (RFC 9562): sha1(namespace + name), with version and variant bits set. */
function uid(name) {
  const ns = Buffer.from(UID_NAMESPACE.replace(/-/g, ''), 'hex');
  const bytes = createHash('sha1').update(ns).update(`${TRACK.slug}/${name}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function writeFile(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function writeYaml(path, value) {
  writeFile(path, toYaml(value));
}

/**
 * Tiny YAML writer for plain data (objects, arrays, strings, numbers, booleans).
 * Strings are always double-quoted JSON strings, which is valid YAML and never ambiguous.
 */
function toYaml(value, indent = '') {
  const scalar = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));
  const isPlain = (v) => v === null || typeof v !== 'object';
  let out = '';
  for (const [key, v] of Object.entries(value)) {
    if (v === undefined) continue;
    if (isPlain(v)) out += `${indent}${key}: ${scalar(v)}\n`;
    else if (Array.isArray(v)) {
      if (!v.length) out += `${indent}${key}: []\n`;
      else if (v.every(isPlain)) out += `${indent}${key}:\n${v.map((x) => `${indent}  - ${scalar(x)}\n`).join('')}`;
      else
        out += `${indent}${key}:\n${v
          .map((x) => toYaml(x, `${indent}    `).replace(new RegExp(`^${indent}    `), `${indent}  - `))
          .join('')}`;
    } else out += `${indent}${key}:\n${toYaml(v, `${indent}  `)}`;
  }
  return out;
}

// Run last, after every helper above is defined.
main();
