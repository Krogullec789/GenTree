import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('portfolio verification workflow', () => {
  it('exposes one-command verification scripts for local and full checks', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['verify:quick']).toBe('npm run lint && npm run typecheck && npm test');
    expect(packageJson.scripts['verify:app']).toBe('node --import tsx ./scripts/verify-local-app.mjs');
    expect(packageJson.scripts['verify:full']).toBe(
      'npm run verify:quick && npm run build && npm run test:e2e && npm run verify:app',
    );
    expect(fs.existsSync(path.join(root, 'scripts', 'verify-local-app.mjs'))).toBe(true);
  });

  it('keeps local browser verification independent from remote font providers', () => {
    const css = fs.readFileSync(path.join(root, 'src', 'index.css'), 'utf8');

    expect(css).not.toContain('fonts.googleapis.com');
    expect(css).not.toContain('@import url(');
  });

  it('documents the portfolio-grade verification workflow in the readme', () => {
    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

    expect(readme).toContain('npm run verify:quick');
    expect(readme).toContain('npm run verify:app');
    expect(readme).toContain('npm run verify:full');
  });
});
