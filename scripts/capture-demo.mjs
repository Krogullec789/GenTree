import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['./scripts/run-e2e.mjs', 'portfolio.spec.ts'], {
  stdio: 'inherit', windowsHide: true,
  env: { ...process.env, CAPTURE_PORTFOLIO: 'true', PLAYWRIGHT_HTML_OPEN: 'never' },
});
child.on('exit', code => process.exit(code ?? 1));
child.on('error', error => { console.error(error); process.exit(1); });
