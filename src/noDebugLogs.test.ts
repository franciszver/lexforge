import { describe, it, expect } from 'vitest';

// Recursively glob every non-test TS/TSX source file under src/ and read its
// raw contents at test-run time via Vite's import.meta.glob.
const sourceModules = import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./**/*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('no ungated console.log in src', () => {
  it('contains no console.log calls outside an import.meta.env.DEV guard', () => {
    const offenders: string[] = [];

    for (const [file, content] of Object.entries(sourceModules)) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (!line.includes('console.log(')) return;

        // Allow console.log only when it appears on the same line as an
        // import.meta.env.DEV guard (e.g. `if (import.meta.env.DEV) console.log(...)`).
        if (line.includes('import.meta.env.DEV')) return;

        // Allow console.log when the immediately preceding non-blank line
        // opens an `if (import.meta.env.DEV) {` guard.
        let prevIndex = index - 1;
        while (prevIndex >= 0 && lines[prevIndex].trim() === '') prevIndex--;
        if (prevIndex >= 0 && lines[prevIndex].includes('import.meta.env.DEV')) return;

        offenders.push(`${file}:${index + 1}`);
      });
    }

    expect(offenders, `Ungated console.log found:\n${offenders.join('\n')}`).toEqual([]);
  });
});
