const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = ':memory:';
const app = require('../src/app');
const { db } = require('../src/db');
const { createReport } = require('../src/reports');

let server;
let base;
let titleMatch;
let descriptionMatch;

before(async () => {
  const values = { location: '圖書館', category: '網路 / Wi-Fi', description: '二樓斷線' };
  titleMatch = createReport({ ...values, title: 'WiFi 無法連線' });
  descriptionMatch = createReport({ ...values, title: '網路問題', description: '教室 WIFI 經常斷線' });
  createReport({ ...values, title: '投影機故障', description: '電源沒有反應' });
  createReport({ ...values, title: '100% 音量', description: 'A_B 接口與 C:\\temp 接線異常' });
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = 'http://127.0.0.1:' + server.address().port;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  db.close();
});

async function search(keyword) {
  const response = await fetch(base + '/reports?q=' + encodeURIComponent(keyword));
  assert.equal(response.status, 200);
  return response.text();
}

function reportNumbers(html) {
  return [...html.matchAll(/>CF-(\d+)<\/a>/g)].map(match => Number(match[1]));
}

test('S7 AC1: searches title OR description and preserves newest-first detail links', async () => {
  const html = await search('wifi');
  assert.deepEqual(reportNumbers(html), [descriptionMatch.id, titleMatch.id]);
  assert.ok(html.includes('href="/reports/' + descriptionMatch.id + '"'));
  assert.deepEqual(reportNumbers(await search('電源')), [3]);
  assert.deepEqual(reportNumbers(await search('投影')), [3]);
});

test('S7 AC2: wifi, WiFi and WIFI return identical report IDs', async () => {
  for (const keyword of ['wifi', 'WiFi', 'WIFI']) {
    assert.deepEqual(reportNumbers(await search(keyword)), [2, 1]);
  }
});

test('S7 AC3: unmatched keyword shows the required message and no report rows', async () => {
  const html = await search('不存在的故障');
  assert.ok(html.includes('查無符合的報修'));
  assert.deepEqual(reportNumbers(html), []);
  assert.ok(html.includes('value="不存在的故障"'));
});

test('S7 AC4: new-report form links directly to the search field', async () => {
  const response = await fetch(base + '/reports/new');
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes('href="/reports#keyword">先搜尋看看</a>'));
});

test('S7 AC5: search explains the fields and case-insensitive matching accessibly', async () => {
  const html = await search('wifi');
  assert.ok(html.includes('aria-describedby="search-help"'));
  assert.ok(html.includes('搜尋報修的標題與描述，不分大小寫。'));
  assert.ok(html.includes('role="search"'));
});

test('empty, whitespace and repeated query parameters keep the report list usable', async () => {
  for (const keyword of ['', '   ']) {
    assert.deepEqual(reportNumbers(await search(keyword)), [4, 3, 2, 1]);
  }
  assert.deepEqual(reportNumbers(await search('  wifi  ')), [2, 1]);
  for (const route of ['/reports', '/reports?q=wifi&q=other', '/reports?q[x]=wifi']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.deepEqual(reportNumbers(await response.text()), [4, 3, 2, 1]);
  }
});

test('search treats SQL wildcard characters and SQL syntax literally', async () => {
  for (const keyword of ['%', '_', 'C:\\temp']) {
    assert.deepEqual(reportNumbers(await search(keyword)), [4]);
  }
  assert.deepEqual(reportNumbers(await search("' OR 1=1 --")), []);
});

test('search escapes reflected input and report titles while matching new submissions', async () => {
  const title = '<script>alert(1)</script>';
  const response = await fetch(base + '/reports', {
    method: 'POST', redirect: 'manual',
    body: new URLSearchParams({ title, location: '圖書館', category: '網路 / Wi-Fi', description: '搜尋測試' }),
  });
  assert.equal(response.status, 303);
  const html = await search(title);
  assert.deepEqual(reportNumbers(html), [5]);
  assert.ok(!html.includes(title));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM reports').get().count, 5);
});
