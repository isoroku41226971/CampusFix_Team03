const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = ':memory:';
const app = require('../src/app');
const { db } = require('../src/db');
const { createReport } = require('../src/reports');
const { LOCATIONS } = require('../src/constants');
let server;
let base;

before(async () => {
  const values = { category: '網路 / Wi-Fi', description: '連線測試' };
  createReport({ ...values, title: 'WiFi 斷線', location: '圖書館' });
  createReport({ ...values, title: '教室網路問題', location: '商學大樓', description: 'WIFI 斷線' });
  createReport({ ...values, title: '投影機故障', location: '圖書館' });
  createReport({ ...values, title: '燈具故障', location: '體育館' });
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = 'http://127.0.0.1:' + server.address().port;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  db.close();
});

async function page(params = {}) {
  const response = await fetch(base + '/reports?' + new URLSearchParams(params));
  assert.equal(response.status, 200);
  return response.text();
}

function ids(html) {
  return [...html.matchAll(/>CF-(\d+)<\/a>/g)].map(match => Number(match[1]));
}

function locationOptions(html) {
  const select = html.match(/<select[^>]*name="location"[^>]*>([\s\S]*?)<\/select>/)[1];
  return [...select.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]);
}

test('S8 AC1: filter and submission form share all eleven locations', async () => {
  const html = await page();
  const form = await (await fetch(base + '/reports/new')).text();
  assert.equal(LOCATIONS.length, 11);
  assert.deepEqual(locationOptions(html), locationOptions(form));
  assert.deepEqual(locationOptions(html), LOCATIONS);
});

test('TC-21: location alone returns exactly that location, newest first', async () => {
  const html = await page({ location: '圖書館' });
  assert.deepEqual(ids(html), [3, 1]);
  assert.match(html, /value="圖書館" selected/);
  assert.deepEqual(ids(await page({ location: '體育館' })), [4]);
});

test('TC-22: title OR description keyword match is intersected with location', async () => {
  for (const q of ['wifi', 'WiFi', 'WIFI']) {
    assert.deepEqual(ids(await page({ q })), [2, 1]);
    assert.deepEqual(ids(await page({ q, location: '圖書館' })), [1]);
    assert.deepEqual(ids(await page({ q, location: '商學大樓' })), [2]);
  }
  const html = await page({ q: 'wifi', location: '圖書館' });
  assert.match(html, /value="wifi"/);
  assert.match(html, /value="圖書館" selected/);
  assert.match(html, /可只用地點、只用關鍵字，或同時使用兩者/);
  assert.match(html, /只顯示兩個條件都符合/);
});

test('TC-23: clear link removes both conditions and displays all reports', async () => {
  const html = await page({ q: 'wifi', location: '圖書館' });
  const clear = html.match(/href="([^"]+)">清除條件<\/a>/)[1];
  assert.equal(clear, '/reports');
  const cleared = await (await fetch(base + clear)).text();
  assert.deepEqual(ids(cleared), [4, 3, 2, 1]);
  assert.match(cleared, /name="q" value=""/);
  assert.doesNotMatch(cleared, /<option[^>]+selected/);
});

test('empty location results show no-match message and can be cleared', async () => {
  for (const params of [{ location: '法律大樓' }, { location: '體育館', q: 'wifi' }]) {
    const html = await page(params);
    assert.deepEqual(ids(html), []);
    assert.match(html, /查無符合的報修/);
    assert.match(html, /清除條件/);
  }
});

test('location uses exact, bound matching and escapes unsupported URL input', async () => {
  for (const location of ['圖書', "' OR 1=1 --", '<script>alert(1)</script>']) {
    const html = await page({ location });
    assert.deepEqual(ids(html), []);
    assert.ok(!html.includes('<script>alert(1)</script>'));
  }
  assert.deepEqual(ids(await page({ q: ' wifi ', location: ' 圖書館 ' })), [1]);
  assert.deepEqual(ids(await page({ location: '' })), [4, 3, 2, 1]);
  const response = await fetch(base + '/reports?location=x&location=y&q=wifi');
  assert.equal(response.status, 200);
  assert.deepEqual(ids(await response.text()), [2, 1]);
});
