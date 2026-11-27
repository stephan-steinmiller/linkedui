#!/usr/bin/env node
/*
 * linkedui browser regression tests. No npm dependencies: drives a local
 * Chrome/Chromium over the DevTools protocol (Node 22+ has WebSocket built in).
 *
 *   node tools/browser-tests.cjs
 *
 * Needs a Chrome/Chromium binary. It is auto-detected on macOS and Linux;
 * set CHROME_PATH to override. The site checks need `npm run build` in site/
 * first and are skipped (with a notice) if site/build is missing.
 * Exit code 0 = all checks passed, 1 = at least one failed.
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');
const SITE_BUILD = path.join(ROOT, 'site', 'build');
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome for Testing',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const WCAG_AA_TEXT = 4.5;
const WCAG_NONTEXT = 3; // WCAG 1.4.11: control boundaries, fills, tracks and focus rings

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}
function skip(name, why) {
  console.log(`SKIP  ${name}  (${why})`);
}

// ---------------------------------------------------------------------------
// In-page helpers (stringified and run inside the tested page)
// ---------------------------------------------------------------------------

/** Measures text contrast of every `.c-*` element against its effective background. */
function contrastProbe() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const toRGBA = (s) => {
    ctx.fillStyle = '#010203';
    ctx.fillStyle = s;
    if (ctx.fillStyle === '#010203' && s.trim().toLowerCase() !== '#010203') return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat([1]);
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const effBg = (el) => {
    const stack = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const c = toRGBA(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0) {
        stack.push(c);
        if (c[3] >= 1) break;
      }
      n = n.parentElement;
    }
    let acc = [255, 255, 255, 1];
    for (let i = stack.length - 1; i >= 0; i--) acc = over(stack[i], acc);
    return acc;
  };
  return [...document.querySelectorAll('[class*="c-"]')].map((el) => {
    const name = [...el.classList].find((c) => c.startsWith('c-'));
    const fg = toRGBA(getComputedStyle(el).color);
    if (!fg) return { name, error: 'unparsed color' };
    const bg = effBg(el);
    return { name, ratio: Math.round(ratio(over(fg, bg), bg) * 100) / 100 };
  });
}

/** WCAG 1.4.11 for one control: its boundary, fill, switch track or focus ring vs the colors next to it. */
function nonTextProbe(id) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat([1]);
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const effBg = (el) => {
    const stack = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c[3] > 0) {
        stack.push(c);
        if (c[3] >= 1) break;
      }
      n = n.parentElement;
    }
    let acc = [255, 255, 255, 1];
    for (let i = stack.length - 1; i >= 0; i--) acc = over(stack[i], acc);
    return acc;
  };
  const el = document.getElementById(id);
  const cs = getComputedStyle(el);
  const outside = effBg(el.parentElement);
  const inside = effBg(el);
  const out = {};
  const edge = rgba(cs.borderTopColor);
  if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && edge[3] > 0) {
    out.boundary = Math.min(ratio(over(edge, outside), outside), ratio(over(edge, inside), inside));
  }
  if (id === 'b-primary') out.fill = ratio(over(rgba(cs.backgroundColor), outside), outside);
  if (id === 'w1') {
    const t = rgba(getComputedStyle(el, '::before').backgroundColor);
    if (t[3] > 0) out.track = ratio(over(t, outside), outside);
  }
  if (document.activeElement === el) {
    out.focused = true;
    if (parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none') {
      out.focus = ratio(over(rgba(cs.outlineColor), outside), outside);
    }
  }
  return out;
}

/** Horizontal overflow of the page at a given viewport width (clipped ancestors excluded). */
function overflowProbe(width) {
  const offenders = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= width + 1) return;
    let a = el.parentElement, clipped = false;
    while (a && a !== document.body) {
      if (getComputedStyle(a).overflowX !== 'visible') {
        clipped = true;
        break;
      }
      a = a.parentElement;
    }
    if (!clipped) offenders.push(el.tagName.toLowerCase());
  });
  return { scrollW: document.documentElement.scrollWidth, offenders: offenders.slice(0, 5) };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DIST_CSS = pathToFileURL(path.join(DIST, 'linkedui.min.css')).href;
const DIST_JS = pathToFileURL(path.join(DIST, 'enhance.min.js')).href;

function page(body, { theme = 'default', mode = 'light', scripts = true } = {}) {
  return `<!doctype html><html lang="en" data-theme="${theme}" data-mode="${mode}"><head><meta charset="utf-8">
<link rel="stylesheet" href="${DIST_CSS}"></head><body>${body}
${scripts ? `<script src="${DIST_JS}" defer></script>` : ''}</body></html>`;
}

const FIXTURES = {
  dialog: page(`<button id="open" data-lui-open="d">open</button>
    <dialog id="d" style="padding:40px"><p>Hello</p><button data-lui-close>x</button></dialog>`),
  otp: page(`<div class="otp" role="group" aria-label="code">${Array.from({ length: 6 }, (_, i) =>
    `<input id="o${i}" inputmode="numeric" aria-label="Digit ${i + 1}">`).join('')}</div>`),
  popover: page(`<details class="popover" id="pop"><summary>Menu</summary>
    <div role="menu"><a role="menuitem" href="#a" id="m1">One</a><a role="menuitem" href="#b" id="m2">Two</a></div></details>`),
  motion: page(`<p class="ai-caret" id="caret">Streaming</p>`),
  contrast: (theme, mode) => page(`<main class="lui-container">
    <p class="c-text">Body text</p>
    <small class="hint c-hint">Hint text</small>
    <button class="btn c-primary">Primary</button>
    <button class="btn c-secondary" data-variant="secondary">Secondary</button>
    <button class="btn c-accent" data-variant="accent">Accent</button>
    <button class="btn c-danger" data-variant="danger">Danger</button>
    <button class="btn c-ghost" data-variant="ghost">Ghost</button>
    <button class="btn c-outline" data-variant="outline">Outline</button>
    <span class="badge c-badge-success" data-tone="success">OK</span>
    <span class="badge c-badge-warning" data-tone="warning">Beta</span>
    <span class="badge c-badge-danger" data-tone="danger">3</span>
    <div class="alert c-alert-warning" data-tone="warning"><span>Warn</span></div>
    <div class="alert c-alert-danger" data-tone="danger"><span>Err</span></div>
    <a class="c-link" href="#x">Link</a></main>`, { theme, mode }),
  toast: page(''),
  nontext: (theme, mode) => page(`<main class="lui-container" style="display:grid;gap:1rem">
    <label class="field"><span>Text</span><input id="t1" type="text" value="x"></label>
    <label class="field"><span>Select</span><select id="s1"><option>one</option></select></label>
    <label class="field"><span>Area</span><textarea id="a1"></textarea></label>
    <label><input id="c1" type="checkbox"> <span>Checkbox</span></label>
    <label><input id="r1" type="radio" name="nt"> <span>Radio</span></label>
    <label class="switch"><input id="w1" type="checkbox" role="switch"> <span>Switch</span></label>
    <div class="check-chips"><input id="chip1" type="checkbox"><label id="chip-l" for="chip1">Chip</label></div>
    <div class="stepper" id="st"><button class="btn" type="button" aria-label="less">−</button><input value="1" aria-label="quantity"><button class="btn" type="button" aria-label="more">+</button></div>
    <div class="input-group" id="ig"><input value="x" aria-label="value"><button class="btn" type="button">Go</button></div>
    <div><button class="btn" id="b-outline" data-variant="outline">Outline</button> <button class="btn" id="b-primary">Primary</button></div>
  </main>`, { theme, mode }),
};

// ---------------------------------------------------------------------------
// Static checks (no browser)
// ---------------------------------------------------------------------------

function staticChecks() {
  // Components must take every color from tokens (themes stay overridable).
  const literal = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\blight-dark\(/;
  const offenders = [];
  for (const f of fs.readdirSync(path.join(SRC, 'components'))) {
    if (!f.endsWith('.css')) continue;
    const css = fs.readFileSync(path.join(SRC, 'components', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    css.split('\n').forEach((ln, i) => {
      if (literal.test(ln) && !/url\(/.test(ln)) offenders.push(`${f}:${i + 1}`);
    });
  }
  check('components use tokens only (no literal colors)', offenders.length === 0, offenders.slice(0, 5).join(' '));
}

/** Dark mode is written twice (explicit and auto); the two copies must stay identical. */
function themeChecks() {
  const css = fs.readFileSync(path.join(SRC, 'themes.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const blockAfter = (selector) => {
    const i = css.indexOf(selector);
    if (i < 0) return null;
    const open = css.indexOf('{', i);
    let depth = 0;
    for (let j = open; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}' && --depth === 0) return css.slice(open + 1, j);
    }
    return null;
  };
  const explicit = blockAfter('[data-mode="dark"] {');
  const auto = blockAfter(':root:not([data-mode]), [data-mode="auto"] {');
  const decls = (s) => s.split(';').map((d) => d.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const identical = !!explicit && !!auto && JSON.stringify(decls(explicit)) === JSON.stringify(decls(auto));
  check('themes: explicit and auto dark mappings are identical', identical, identical ? '' : 'copies differ or were not found');
  const used = [...new Set([...(explicit || '').matchAll(/var\((--lui-dark-[a-z0-9-]+)\)/g)].map((m) => m[1]))];
  const missing = used.filter((name) => !new RegExp(`${name}\\s*:`).test(css));
  check(`themes: every --lui-dark-* used by the dark mapping is defined (${used.length} names)`, missing.length === 0, missing.join(' '));
}

function langChecks() {
  if (!fs.existsSync(SITE_BUILD)) return skip('prerendered <html lang> matches the route', 'no site/build');
  const htmlFiles = [
    ...fs.readdirSync(SITE_BUILD).filter((f) => f.endsWith('.html')).map((f) => f),
    ...fs.readdirSync(path.join(SITE_BUILD, 'wiki')).filter((f) => f.endsWith('.html')).map((f) => path.join('wiki', f)),
  ];
  const bad = [];
  for (const rel of htmlFiles) {
    const german = /(^|\/)(de|wiki-de)\.html$/.test(rel) || /-de\.html$/.test(rel);
    const m = /<html lang="([a-z-]+)"/.exec(fs.readFileSync(path.join(SITE_BUILD, rel), 'utf8'));
    if (!m || m[1] !== (german ? 'de' : 'en')) bad.push(`${rel}=${m ? m[1] : 'none'}`);
  }
  check(`prerendered <html lang> matches route (${htmlFiles.length} pages)`, bad.length === 0, bad.slice(0, 5).join(' '));
}

// ---------------------------------------------------------------------------
// Static file server for the built site (mobile overflow checks)
// ---------------------------------------------------------------------------

function serve(dir) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      let file = path.normalize(path.join(dir, p));
      // Extensionless app URLs (/wiki/fields) map to the prerendered files (wiki/fields.html).
      if ((!fs.existsSync(file) || fs.statSync(file).isDirectory()) && fs.existsSync(file + '.html')) file += '.html';
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

async function launch(chromePath, port, profile) {
  const proc = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank',
    // CI containers usually cannot start the Chrome sandbox; the fixtures are local files.
    ...(process.env.CI ? ['--no-sandbox'] : []),
  ], { stdio: 'ignore' });
  const exited = new Promise((r) => proc.once('exit', r));
  let targets = null;
  for (let i = 0; i < 100 && !targets; i++) {
    try {
      targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((t) => t.type === 'page');
    } catch {
      await sleep(150);
    }
  }
  if (!targets) throw new Error('Chrome did not start for DevTools');
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
    } else {
      listeners.forEach((fn) => fn(m));
    }
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result.value;
  };
  const navigate = async (url) => {
    let done;
    const loaded = new Promise((r) => { done = r; });
    const fn = (m) => { if (m.method === 'Page.loadEventFired') done(); };
    listeners.push(fn);
    await send('Page.navigate', { url });
    await Promise.race([loaded, sleep(8000)]);
    listeners.splice(listeners.indexOf(fn), 1);
    await sleep(150);
  };
  const viewport = (width, height, mobile = false) =>
    send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  const click = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await sleep(150);
  };
  const key = async (k, code, vk, text) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text, unmodifiedText: text });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
    await sleep(120);
  };
  const center = (sel) => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, left: r.left, top: r.top, right: r.right, bottom: r.bottom }; })()`);
  return {
    send, evaluate, navigate, viewport, click, key, center,
    setReducedMotion: (on) => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: on ? 'reduce' : 'no-preference' }] }),
    close: () => { ws.close(); proc.kill(); return exited; },
  };
}

async function browserChecks(chromePath, fixtureDir, siteBase) {
  const port = 9400 + Math.floor(Math.random() * 500);
  const profile = path.join(fixtureDir, 'profile');
  const b = await launch(chromePath, port, profile);
  const fixture = (name, html) => {
    const p = path.join(fixtureDir, name);
    fs.writeFileSync(p, html);
    return pathToFileURL(p).href;
  };
  try {
    await b.send('Page.enable');
    await b.send('Runtime.enable');
    await b.viewport(900, 700);

    // --- Dialog: padding click keeps it open, backdrop click closes it ---
    await b.navigate(fixture('dialog.html', FIXTURES.dialog));
    let c = await b.center('#open');
    await b.click(c.x, c.y);
    const opened = await b.evaluate(`document.getElementById('d').open`);
    const d = await b.evaluate(`(() => { const r = document.getElementById('d').getBoundingClientRect(); return { x: r.x, y: r.y }; })()`);
    await b.click(d.x + 8, d.y + 8);
    check('dialog: click on its own padding keeps it open', opened && (await b.evaluate(`document.getElementById('d').open`)));
    await b.click(2, 2);
    check('dialog: backdrop click closes it', !(await b.evaluate(`document.getElementById('d').open`)));

    // --- OTP: paste fills every box; typing advances focus ---
    await b.navigate(fixture('otp.html', FIXTURES.otp));
    await b.evaluate(`(() => {
      const el = document.getElementById('o0'); el.focus();
      const dt = new DataTransfer(); dt.setData('text', '123456');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    })()`);
    const pasted = await b.evaluate(`[...document.querySelectorAll('.otp input')].map((i) => i.value).join('')`);
    check('otp: pasting a full code fills all boxes', pasted === '123456', `got "${pasted}"`);
    await b.evaluate(`(() => { document.querySelectorAll('.otp input').forEach((i) => (i.value = '')); document.getElementById('o0').focus(); })()`);
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: '7', text: '7', unmodifiedText: '7' });
    await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: '7' });
    await sleep(120);
    const next = await b.evaluate(`document.activeElement.id`);
    check('otp: typing a digit advances focus', next === 'o1', `focus on "${next}"`);

    // --- Popover: arrow keys open the menu from the trigger; Escape returns focus ---
    await b.navigate(fixture('popover.html', FIXTURES.popover));
    await b.evaluate(`document.querySelector('#pop > summary').focus()`);
    await b.key('ArrowDown', 'ArrowDown', 40);
    const popOpen = await b.evaluate(`document.getElementById('pop').open`);
    const onItem = await b.evaluate(`document.activeElement.id`);
    check('popover: ArrowDown on trigger opens and focuses first item', popOpen && onItem === 'm1', `open=${popOpen} focus=${onItem}`);
    // Escape must work from inside an open menu (focus on the second item), not only from the trigger.
    await b.evaluate(`document.getElementById('m2').focus()`);
    const wasOpen = await b.evaluate(`document.getElementById('pop').open`);
    await b.key('Escape', 'Escape', 27);
    const popClosed = !(await b.evaluate(`document.getElementById('pop').open`));
    const back = await b.evaluate(`document.activeElement.tagName`);
    check('popover: Escape closes an open menu and returns focus to trigger', wasOpen && popClosed && back === 'SUMMARY', `open-before=${wasOpen} focus=${back}`);

    // --- Toasts: danger is an alert; hovering holds the auto-dismiss ---
    await b.navigate(fixture('toast.html', FIXTURES.toast));
    const roles = await b.evaluate(`(() => {
      const danger = window.luiToast({ tone: 'danger', message: 'x', ms: 0 });
      const info = window.luiToast({ tone: 'info', message: 'y', ms: 0 });
      return [danger.getAttribute('role'), info.getAttribute('role')];
    })()`);
    check('toast: danger uses role=alert, others role=status', roles[0] === 'alert' && roles[1] === 'status', roles.join('/'));
    const held = await b.evaluate(`window.luiToast({ tone: 'info', message: 'hold', ms: 400 }) && 'ok'`);
    const hc = await b.evaluate(`(() => { const el = [...document.querySelectorAll('.toast')].pop(); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hc.x, y: hc.y });
    await sleep(900);
    const stillThere = await b.evaluate(`document.querySelectorAll('.toast').length`);
    await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
    await sleep(900);
    const afterLeave = await b.evaluate(`document.querySelectorAll('.toast').length`);
    check('toast: hover holds auto-dismiss, leaving lets it expire', held === 'ok' && stillThere >= 1 && afterLeave < stillThere, `while hovered=${stillThere} after leave=${afterLeave}`);

    // --- Reduced motion: the AI caret stops blinking ---
    await b.navigate(fixture('motion.html', FIXTURES.motion));
    const anim = () => b.evaluate(`getComputedStyle(document.getElementById('caret'), '::after').animationName`);
    const normal = await anim();
    await b.setReducedMotion(true);
    await sleep(100);
    const reduced = await anim();
    await b.setReducedMotion(false);
    check('motion: caret blinks by default and stops under reduced motion', normal === 'lui-blink' && reduced === 'none', `default=${normal} reduced=${reduced}`);

    // --- Contrast: every theme x mode, WCAG AA for text ---
    const failures = [];
    let measured = 0;
    let lowest = { ratio: Infinity, where: '' };
    for (const theme of ['default', 'ocean', 'squishy']) {
      for (const mode of ['light', 'dark']) {
        await b.viewport(900, 900);
        await b.navigate(fixture(`contrast-${theme}-${mode}.html`, FIXTURES.contrast(theme, mode)));
        const rows = await b.evaluate(`(${contrastProbe.toString()})()`);
        measured += rows.length;
        rows.forEach((r) => {
          const where = `${theme}/${mode} ${r.name}`;
          if (r.error) failures.push(`${where} ${r.error}`);
          else if (r.ratio < WCAG_AA_TEXT) failures.push(`${where} ${r.ratio}:1`);
          if (typeof r.ratio === 'number' && r.ratio < lowest.ratio) lowest = { ratio: r.ratio, where };
        });
      }
    }
    check(
      `contrast: all sampled text meets ${WCAG_AA_TEXT}:1 in 3 themes x 2 modes (${measured} pairs)`,
      failures.length === 0,
      failures.length ? failures.slice(0, 6).join(', ') : `lowest ${lowest.ratio}:1 at ${lowest.where}`,
    );

    // --- Non-text (WCAG 1.4.11): control boundaries, fills, tracks and focus rings ---
    const NONTEXT_IDS = ['t1', 's1', 'a1', 'c1', 'r1', 'w1', 'chip-l', 'st', 'ig', 'b-outline', 'b-primary'];
    const FOCUSABLE_IDS = new Set(['t1', 's1', 'a1', 'c1', 'r1', 'w1', 'b-outline', 'b-primary']);
    const nonTextFails = [];
    let nonTextPairs = 0;
    for (const theme of ['default', 'ocean', 'squishy']) {
      for (const mode of ['light', 'dark']) {
        await b.viewport(900, 900);
        await b.navigate(fixture(`nontext-${theme}-${mode}.html`, FIXTURES.nontext(theme, mode)));
        for (const id of NONTEXT_IDS) {
          if (FOCUSABLE_IDS.has(id)) {
            // Real Tab presses: :focus-visible must apply, as it does for keyboard users.
            await b.evaluate('document.activeElement && document.activeElement.blur && document.activeElement.blur()');
            for (let i = 0; i < 25 && (await b.evaluate('document.activeElement && document.activeElement.id')) !== id; i++) {
              await b.key('Tab', 'Tab', 9, '');
            }
          }
          const row = await b.evaluate(`(${nonTextProbe.toString()})(${JSON.stringify(id)})`);
          const where = `${theme}/${mode} ${id}`;
          if (FOCUSABLE_IDS.has(id) && !row.focused) nonTextFails.push(`${where} not reachable by Tab`);
          for (const kind of ['boundary', 'fill', 'track', 'focus']) {
            if (typeof row[kind] !== 'number') continue;
            nonTextPairs++;
            if (row[kind] < WCAG_NONTEXT) nonTextFails.push(`${where} ${kind} ${row[kind].toFixed(2)}:1`);
          }
        }
      }
    }
    check(
      `non-text: control boundaries, fills and focus rings reach ${WCAG_NONTEXT}:1 in 3 themes x 2 modes (${nonTextPairs} pairs)`,
      nonTextFails.length === 0,
      nonTextFails.slice(0, 6).join(', '),
    );

    // --- Themes: a valid custom name in the URL is applied, an invalid one is ignored ---
    const themeUrl = fixture('theme-query.html', FIXTURES.dialog);
    await b.navigate(`${themeUrl}?theme=brand-x`);
    const customTheme = await b.evaluate('document.documentElement.dataset.theme');
    await b.navigate(`${themeUrl}?theme=${encodeURIComponent('Not Valid!')}`);
    const invalidTheme = await b.evaluate('document.documentElement.dataset.theme');
    check(
      'themes: a custom name in the URL is applied, an invalid one is ignored',
      customTheme === 'brand-x' && invalidTheme === 'default',
      `custom=${customTheme} invalid=${invalidTheme}`,
    );

    // --- Site: no horizontal overflow at phone width, on every built page ---
    if (!siteBase) {
      skip('site: no horizontal overflow at 375px', 'no site/build (run `npm run build` in site/)');
    } else {
      const pages = [];
      for (const f of fs.readdirSync(SITE_BUILD)) if (f.endsWith('.html')) pages.push(f);
      for (const f of fs.readdirSync(path.join(SITE_BUILD, 'wiki'))) if (f.endsWith('.html')) pages.push(`wiki/${f}`);
      await b.viewport(375, 800, true);
      const bad = [];
      for (const rel of pages) {
        // The app's URLs have no extension (/wiki/fields); serve() maps them to the .html files.
        await b.navigate(`${siteBase}/${rel === 'index.html' ? '' : rel.replace(/\.html$/, '')}`);
        // A 404 view would pass the overflow test without testing the page: fail it instead.
        const h1 = await b.evaluate("((document.querySelector('h1') || {}).textContent || '').trim()");
        if (/^404$|can.t be found/.test(h1)) bad.push(`${rel} shows an error view`);
        const r = await b.evaluate(`(${overflowProbe.toString()})(375)`);
        if (r.scrollW > 375) bad.push(`${rel} scrollW=${r.scrollW} ${r.offenders.join(',')}`);
      }
      check(`site: no horizontal overflow at 375px (${pages.length} pages)`, bad.length === 0, bad.slice(0, 4).join(' | '));
    }
  } finally {
    await b.close();
  }
}

// ---------------------------------------------------------------------------

// Chrome's child processes can keep writing to the profile for a moment after the
// main process exits (seen on Linux CI). Retry, then warn: cleanup never fails the run.
async function removeDir(dir) {
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch {
      await sleep(200);
    }
  }
  console.warn(`note: could not delete temp dir ${dir}; the OS will clean it up`);
}

async function main() {
  staticChecks();
  themeChecks();
  langChecks();

  const chromePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!chromePath) {
    console.error('No Chrome/Chromium found. Set CHROME_PATH to a browser binary.');
    process.exitCode = 1;
    return;
  }
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linkedui-tests-'));
  let site = null;
  try {
    if (fs.existsSync(SITE_BUILD)) site = await serve(SITE_BUILD);
    await browserChecks(chromePath, fixtureDir, site && site.base);
  } catch (e) {
    check('browser run completed', false, String((e && e.message) || e).slice(0, 200));
  } finally {
    if (site) site.server.close();
    await removeDir(fixtureDir);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}

main();
