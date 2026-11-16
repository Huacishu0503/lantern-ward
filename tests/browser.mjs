// Browser verification using Chrome's debugging pipe and Node's standard library.
// Usage: node tests/browser.mjs /path/to/chrome
// Screenshots are written outside the entry, under /tmp/lantern-ward-shots/.
import { spawn } from 'node:child_process';
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const executable = process.argv[2];
if (!executable) throw new Error('Supply the path to an existing Chrome executable. Nothing is downloaded.');
const directory = await mkdtemp(join(tmpdir(), 'lantern-browser-'));
const output = join(tmpdir(), 'lantern-ward-shots');
await mkdir(output, { recursive: true });
const server = spawn(process.execPath, ['serve.ts', '--port', '8080'], { stdio: ['ignore', 'pipe', 'pipe'] });
let chrome;
try {
  await new Promise((resolve, reject) => {
    let error = '';
    const timeout = setTimeout(() => reject(new Error('Static server did not become ready.')), 5000);
    server.stderr.on('data', data => { error += data; });
    server.stdout.on('data', data => { if (String(data).includes('game/ is on')) { clearTimeout(timeout); resolve(); } });
    server.once('error', reject);
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Static server exited ${code}: ${error.trim()}`)); });
  });
  chrome = spawn(executable, [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-background-networking', '--disable-component-update', '--no-first-run',
    '--no-default-browser-check', '--remote-debugging-pipe', `--user-data-dir=${directory}`,
  ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  const pending = new Map(), listeners = new Map();
  let serial = 0, buffer = '', errors = [], requests = [];
  chrome.stdio[4].on('data', bytes => {
    buffer += bytes.toString();
    let split;
    while ((split = buffer.indexOf('\0')) !== -1) {
      const message = JSON.parse(buffer.slice(0, split)); buffer = buffer.slice(split + 1);
      if (message.id && pending.has(message.id)) {
        const { resolve, reject, timeout } = pending.get(message.id);
        clearTimeout(timeout); pending.delete(message.id);
        message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
      }
      for (const listener of listeners.get(message.method) || []) listener(message.params);
    }
  });
  let stderr = '';
  chrome.stderr.on('data', bytes => { stderr += bytes; });
  chrome.once('exit', code => {
    for (const { reject, timeout } of pending.values()) { clearTimeout(timeout); reject(new Error(`Chrome exited ${code}: ${stderr.trim()}`)); }
    pending.clear();
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome timed out: ${method}. ${stderr}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    chrome.stdio[3].write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
  });
  const on = (method, listener) => listeners.set(method, [...(listeners.get(method) || []), listener]);
  await send('Browser.getVersion');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  await page('Runtime.enable'); await page('Page.enable'); await page('Log.enable'); await page('Network.enable');
  await page('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  on('Runtime.exceptionThrown', event => errors.push(event.exceptionDetails));
  on('Runtime.consoleAPICalled', event => { if (event.type === 'error') errors.push(event); });
  on('Log.entryAdded', event => { if (event.entry.level === 'error') errors.push(event.entry); });
  on('Network.requestWillBeSent', event => requests.push(event.request.url));
  async function capture(shot) {
    errors = []; requests = [];
    const loaded = new Promise(resolve => {
      const listener = () => {
        listeners.set('Page.loadEventFired', (listeners.get('Page.loadEventFired') || []).filter(l => l !== listener)); resolve();
      };
      on('Page.loadEventFired', listener);
    });
    await page('Page.navigate', { url: `http://127.0.0.1:8080/index.html?shot=${shot}&seed=1` });
    let loadTimeout;
    try {
      await Promise.race([loaded, new Promise((_, reject) => { loadTimeout = setTimeout(() => reject(new Error('Page load timed out')), 10000); })]);
    } finally { clearTimeout(loadTimeout); }
    const { result } = await page('Runtime.evaluate', { expression: 'JSON.stringify({ready:window.__shotReady,screen:window.__lantern?.world.screen,score:window.__lantern?.world.score})', returnByValue: true });
    const state = JSON.parse(result.value);
    assert.equal(state.ready, true);
    assert.equal(state.screen, { start: 'title', play: 'play', win: 'victory', end: 'defeat' }[shot]);
    assert.deepEqual(errors, [], `${shot}: console/runtime errors`);
    assert.ok(requests.every(url => url.startsWith('http://127.0.0.1:8080/') || url.startsWith('data:')), 'only local assets requested');
    const { data } = await page('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(output, `${shot}.png`), Buffer.from(data, 'base64'));
    return data;
  }
  for (const shot of ['start', 'play', 'win', 'end']) {
    const first = await capture(shot), second = await capture(shot);
    assert.equal(first, second, `${shot}: identical pixels across repeated page loads`);
    console.log(`${shot}: ready, expected screen, no errors, only local assets, identical repeated pixels`);
  }
  console.log(`Chrome verification passed. Screenshots: ${output}`);
} finally {
  chrome?.kill(); server.kill();
  await rm(directory, { recursive: true, force: true }).catch(() => {});
}
