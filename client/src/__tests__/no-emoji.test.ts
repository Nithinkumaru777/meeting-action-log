import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { afterAll, describe, expect, test } from 'vitest';

// DESIGN.md §0 rule 1: no emojis anywhere. Symbols are animated icons only.
const EMOJI = /\p{Extended_Pictographic}/u;
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.json', '.html']);
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'coverage']);

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const SOURCE_DIRS = ['shared/src', 'server/src', 'client/src'].map((d) => join(repoRoot, d));

function hasEmoji(s: string): boolean {
  return EMOJI.test(s);
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORED_DIRS.has(entry.name)) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return entry.isFile() && SCANNED_EXTENSIONS.has(extname(entry.name)) ? [full] : [];
  });
}

function findFilesWithEmoji(dirs: string[]): Array<{ file: string; match: string }> {
  return dirs.flatMap(listSourceFiles).flatMap((file) => {
    const match = EMOJI.exec(readFileSync(file, 'utf8'));
    return match ? [{ file, match: match[0] }] : [];
  });
}

// Clean alphabet: printable ASCII, Latin-1 letters and Latin Extended-A (U+00C0..U+017F, which
// skips the pictographic U+00A9 and U+00AE), plus typographic punctuation the UI copy uses.
const cleanChar = fc
  .oneof(
    fc.integer({ min: 0x20, max: 0x7e }),
    fc.integer({ min: 0xc0, max: 0x17f }),
    fc.constantFrom(0x00b7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x2192),
  )
  .map((cp) => String.fromCodePoint(cp));
const cleanText = fc.array(cleanChar, { maxLength: 200 }).map((chars) => chars.join(''));

const PICTOGRAPHS = [0x1f525, 0x2705, 0x1f4c5, 0x2728, 0x1f680].map((cp) =>
  String.fromCodePoint(cp),
);

describe('no-emoji guard', () => {
  test('property: clean text is never flagged (100 runs)', () => {
    fc.assert(
      fc.property(cleanText, (s) => hasEmoji(s) === false),
      { numRuns: 100 },
    );
  });

  test('property: text with an injected pictograph is always flagged (100 runs)', () => {
    fc.assert(
      fc.property(cleanText, cleanText, fc.constantFrom(...PICTOGRAPHS), (a, b, p) =>
        hasEmoji(a + p + b),
      ),
      { numRuns: 100 },
    );
  });

  describe('scanner on a fixture tree', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'mal-no-emoji-'));
    afterAll(() => rmSync(fixture, { recursive: true, force: true }));
    const fire = PICTOGRAPHS[0] ?? '';
    mkdirSync(join(fixture, 'nested'));
    mkdirSync(join(fixture, 'node_modules'));
    writeFileSync(join(fixture, 'clean.ts'), 'export const a = 1;');
    writeFileSync(join(fixture, 'nested', 'dirty.tsx'), `const t = '${fire}';`);
    writeFileSync(join(fixture, 'node_modules', 'ignored.ts'), fire);
    writeFileSync(join(fixture, 'notes.md'), fire);

    test('reports scanned extensions only and skips ignored directories', () => {
      expect(findFilesWithEmoji([fixture])).toEqual([
        { file: join(fixture, 'nested', 'dirty.tsx'), match: fire },
      ]);
    });
  });

  test('workspace source tree contains zero emojis', { repeats: 100 }, () => {
    expect(SOURCE_DIRS.flatMap(listSourceFiles).length).toBeGreaterThan(0);
    expect(findFilesWithEmoji(SOURCE_DIRS)).toEqual([]);
  });
});
