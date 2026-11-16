const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.DB_PATH = ':memory:';
const app = require('../src/app');
const { db } = require('../src/db');
const { createReport } = require('../src/reports');
let server;
let base;
let report;

before(async () => {
  report = createReport({ title: '投影機無法開機', location: '商學大樓',
    category: '教學設備', description: '301 教室\n按電源沒有反應' });
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = 'http://127.0.0.1:' + server.address().port;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  db.close();
});

const detailPath = () => '/reports/' + report.id;

test('AC1: detail shows all report fields and current status', async () => {
  for (const status of ['Submitted', 'In Progress']) {
    db.prepare('UPDATE reports SET status = ?, resolution_note = ? WHERE id = ?')
      .run(status, 'hidden draft note', report.id);
    const response = await fetch(base + detailPath());
    assert.equal(response.status, 200);
    const html = await response.text();
    for (const value of [report.reportNo, report.title, report.location,
      report.category, report.description, status]) assert.ok(html.includes(value), value);
    assert.ok(!html.includes('處理說明'));
    assert.ok(!html.includes('hidden draft note'));
  }
});

test('AC2: Resolved shows escaped multiline resolution note', async () => {
  db.prepare('UPDATE reports SET status = ?, resolution_note = ? WHERE id = ?')
    .run('Resolved', '已更換電源\n<script>alert(1)</script>', report.id);
  const response = await fetch(base + detailPath());
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('Resolved'));
  assert.ok(html.includes('處理說明'));
  assert.ok(html.includes('已更換電源\n&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
});

test('Resolved without a note shows a clear fallback', async () => {
  db.prepare('UPDATE reports SET resolution_note = NULL WHERE id = ?').run(report.id);
  const response = await fetch(base + detailPath());
  assert.ok((await response.text()).includes('尚未提供處理說明'));
});

test('AC3: missing and invalid IDs return 404 with the required message', async () => {
  for (const id of ['999999', 'abc', '0', '-1', '1.5', '1e0', '9007199254740992']) {
    const response = await fetch(base + '/reports/' + id);
    assert.equal(response.status, 404, id);
    assert.ok((await response.text()).includes('查無此報修'), id);
  }
});

test('report list and submission links open detail and the new-report route works', async () => {
  for (const path of ['/reports', detailPath() + '/submitted']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes('href="' + detailPath() + '"'));
  }
  assert.equal((await fetch(base + '/reports/new')).status, 200);
});

test('report text is escaped in the detail page', async () => {
  const unsafe = createReport({ title: '<script>alert(1)</script>', location: '商學大樓',
    category: '教學設備', description: '<img src=x onerror=alert(1)>' });
  const html = await (await fetch(base + '/reports/' + unsafe.id)).text();
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x'));
});
