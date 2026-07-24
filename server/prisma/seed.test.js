import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedFilePath = path.join(__dirname, 'seed.js');

describe('seed.js guard clause', () => {
  it('should use pathToFileURL for cross-platform direct execution guard', () => {
    const source = readFileSync(seedFilePath, 'utf-8');

    // Must contain the correct pattern (with null check for process.argv[1])
    expect(source).toContain('process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href');

    // Must NOT contain the broken Windows pattern (concatenation with backticks)
    expect(source).not.toContain('file://${process.argv[1]}');
    expect(source).not.toContain("`file://${process.argv[1]}`");
  });

  it('should exit with error when run directly with invalid DATABASE_URL', () => {
    const seedScriptPath = path.join(__dirname, 'seed.js');
    const env = { ...process.env, DATABASE_URL: 'postgresql://invalid:invalid@localhost:1/na' };

    let error;
    let exitCode;

    try {
      execFileSync('node', [seedScriptPath], { env, timeout: 5000, stdio: 'pipe' });
      exitCode = 0;
    } catch (e) {
      error = e;
      exitCode = e.status;
    }

    // With the broken guard, this exits 0 silently (seed never runs)
    // With the correct guard, seed runs and tries to connect, exiting non-zero with error
    expect(exitCode).not.toBe(0);
    expect(error).toBeDefined();
  });
});
