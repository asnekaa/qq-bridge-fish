// 自动找到 DSH 正在监听的端口，并写进 config.json。
// 用法: node dsh-port.mjs           只探测
//       node dsh-port.mjs --patch   探测并写回 config.json
import fs from 'node:fs';
import http from 'node:http';
import { execSync } from 'node:child_process';

const CONFIG = new URL('./config.json', import.meta.url).pathname.replace(/^\//, '');

function pids() {
  try {
    const out = execSync('tasklist /FO CSV /NH', { encoding: 'utf8', windowsHide: true });
    return out.split('\n').filter(l => /DeepSeek Harness/i.test(l)).map(l => l.split('","')[1]);
  } catch { return []; }
}

function listeningPorts() {
  const want = new Set(pids().map(p => (p || '').replace(/"/g, '').trim()));
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8', windowsHide: true });
    const ports = new Set();
    for (const line of out.split('\n')) {
      const m = line.match(/127\.0\.0\.1:(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
      if (m && want.has(m[2])) ports.add(Number(m[1]));
    }
    return [...ports];
  } catch { return []; }
}

function probe(port) {
  return new Promise(res => {
    const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 1200 }, r => { r.resume(); res(r.statusCode === 401 || r.statusCode === 200); });
    req.on('error', () => res(false));
    req.on('timeout', () => { req.destroy(); res(false); });
  });
}

const found = [];
for (const p of listeningPorts()) if (await probe(p)) found.push(p);
if (!found.length) { console.log('0'); process.exit(1); }
const port = found[0];
if (process.argv.includes('--patch')) {
  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  cfg.dsh.baseUrl = `http://127.0.0.1:${port}`;
  fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2), 'utf8');
}
console.log(port);
