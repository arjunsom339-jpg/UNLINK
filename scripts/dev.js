const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '   UniLink — Starting Full-Stack Development Servers...     ');
console.log('\x1b[36m%s\x1b[0m', '   Backend:  http://localhost:5000                         ');
console.log('\x1b[36m%s\x1b[0m', '   Frontend: http://localhost:5173                         ');
console.log('\x1b[36m%s\x1b[0m', '════════════════════════════════════════════════════════════');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

// Spawn Backend
const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: backendDir,
  shell: true,
  stdio: 'inherit',
  env: { ...process.env },
});

// Spawn Frontend
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: frontendDir,
  shell: true,
  stdio: 'inherit',
  env: { ...process.env },
});

let isShuttingDown = false;
function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n\x1b[33mShutting down UniLink dev servers...\x1b[0m');
  
  if (isWin) {
    if (backend && backend.pid) {
      try { spawn('taskkill', ['/pid', String(backend.pid), '/f', '/t']); } catch (_) {}
    }
    if (frontend && frontend.pid) {
      try { spawn('taskkill', ['/pid', String(frontend.pid), '/f', '/t']); } catch (_) {}
    }
  } else {
    if (backend) backend.kill();
    if (frontend) frontend.kill();
  }
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
