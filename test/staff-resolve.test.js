// WD-27 (T17): tests for S6 — staff resolve a report with a resolution note (WD-26).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.DB_PATH = ':memory:';
const app = require('../src/app');
const { db } = require('../src/db');
const { createReport, getReportById, MAX_RESOLUTION_NOTE } = require('../src/reports');

let server;
let base;
let staffCookie;
let studentCookie;

const form = (fields, cookie) => ({
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(cookie ? { Cookie: cookie } : {}) },
  body: new URLSearchParams(fields),
});

const login = async (username, password) => {
  const response = await fetch(base + '/login', form({ username, password }));
  return response.headers.getSetCookie()[0].split(';')[0];
};

before(async () => {
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = 'http://127.0.0.1:' + server.address().port;
  staffCookie = await login('staff01', 'staff-demo');
  studentCookie = await login('student01', 'student-demo');
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  db.close();
});

const get = (path, cookie) => fetch(base + path, { redirect: 'manual', headers: cookie ? { Cookie: cookie } : {} });

const setStatus = (id, fields, cookie = staffCookie) =>
  fetch(base + '/staff/reports/' + id + '/status', form(fields, cookie));

// A new report already moved to In Progress, ready to be resolved.
const inProgressReport = async () => {
  const report = createReport({
    title: '冷氣不冷', location: '人文大樓', category: '建築設施', description: '2F 205 教室',
  });
  assert.equal((await setStatus(report.id, { status: 'In Progress' })).status, 303);
  return report;
};

const stored = id => {
  const { status, resolution_note } = getReportById(id);
  return { status, resolution_note };
};

test('handling page of an In Progress report shows the resolution note form', async () => {
  const report = await inProgressReport();
  const html = await (await get('/staff/reports/' + report.id, staffCookie)).text();
  assert.ok(html.includes('name="resolution_note"'));
  assert.ok(html.includes('結案（改為 Resolved）'));
  assert.ok(!html.includes('<dt>處理說明</dt>'));
});

test('staff can resolve an In Progress report with a note, and both are saved', async () => {
  const report = await inProgressReport();
  const response = await setStatus(report.id, { status: 'Resolved', resolution_note: '  已更換壓縮機\r\n下週回訪  ' });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/staff/reports/' + report.id + '?updated=1');
  assert.deepEqual(stored(report.id), { status: 'Resolved', resolution_note: '已更換壓縮機\n下週回訪' });

  // The handling page confirms the change, shows the note and offers no further change.
  const page = await (await get(response.headers.get('location'), staffCookie)).text();
  assert.ok(page.includes('狀態已更新為 Resolved'));
  assert.ok(page.includes('已更換壓縮機\n下週回訪'));
  assert.ok(page.includes('目前狀態沒有可以進行的變更。'));
  assert.ok(!page.includes('name="resolution_note"'));
});

test('students see Resolved and the resolution note on the detail page and the list', async () => {
  const report = await inProgressReport();
  await setStatus(report.id, { status: 'Resolved', resolution_note: '已更換壓縮機' });
  const detail = await (await get('/reports/' + report.id)).text();
  assert.ok(detail.includes('Resolved'));
  assert.ok(detail.includes('處理說明'));
  assert.ok(detail.includes('已更換壓縮機'));
  const list = await (await get('/reports')).text();
  assert.ok(list.slice(list.indexOf(report.reportNo)).slice(0, 600).includes('Resolved'));
  const overview = await (await get('/staff/reports', staffCookie)).text();
  assert.ok(overview.slice(overview.indexOf(report.reportNo)).slice(0, 800).includes('Resolved'));
});

test('resolving without a note is rejected and the report stays In Progress', async () => {
  const report = await inProgressReport();
  for (const fields of [
    { status: 'Resolved' },
    { status: 'Resolved', resolution_note: '' },
    { status: 'Resolved', resolution_note: '   \r\n\t ' },
  ]) {
    const response = await setStatus(report.id, fields);
    const label = JSON.stringify(fields);
    assert.equal(response.status, 400, label);
    const html = await response.text();
    assert.ok(html.includes('請填寫處理說明'), label);
    assert.ok(html.includes('name="resolution_note"'), label);
    assert.deepEqual(stored(report.id), { status: 'In Progress', resolution_note: null }, label);
  }
  // Students still see In Progress and no note.
  const detail = await (await get('/reports/' + report.id)).text();
  assert.ok(detail.includes('In Progress'));
  assert.ok(!detail.includes('處理說明'));
});

test('a note that is too long is rejected and the typed text is kept in the form', async () => {
  const report = await inProgressReport();
  const tooLong = '長'.repeat(MAX_RESOLUTION_NOTE + 1);
  const response = await setStatus(report.id, { status: 'Resolved', resolution_note: tooLong });
  assert.equal(response.status, 400);
  const html = await response.text();
  assert.ok(html.includes(`處理說明最多 ${MAX_RESOLUTION_NOTE} 個字`));
  assert.ok(html.includes(tooLong));
  assert.deepEqual(stored(report.id), { status: 'In Progress', resolution_note: null });

  const longest = '長'.repeat(MAX_RESOLUTION_NOTE);
  assert.equal((await setStatus(report.id, { status: 'Resolved', resolution_note: longest })).status, 303);
  assert.equal(stored(report.id).resolution_note, longest);
});

test('a Submitted report cannot be resolved directly', async () => {
  const report = createReport({ title: '門鎖故障', location: '學生宿舍', category: '建築設施', description: '3F' });
  const response = await setStatus(report.id, { status: 'Resolved', resolution_note: '已修好' });
  assert.equal(response.status, 400);
  assert.ok((await response.text()).includes('無法從 Submitted 改為 Resolved'));
  assert.deepEqual(stored(report.id), { status: 'Submitted', resolution_note: null });
});

test('a Resolved report cannot be changed again and keeps its note', async () => {
  const report = await inProgressReport();
  await setStatus(report.id, { status: 'Resolved', resolution_note: '已更換壓縮機' });
  for (const fields of [
    { status: 'Resolved', resolution_note: '改寫說明' },
    { status: 'In Progress' },
    { status: 'Submitted' },
  ]) {
    const response = await setStatus(report.id, fields);
    assert.equal(response.status, 400, JSON.stringify(fields));
    assert.deepEqual(stored(report.id), { status: 'Resolved', resolution_note: '已更換壓縮機' });
  }
});

test('a note sent with the In Progress change is not saved', async () => {
  const report = createReport({ title: '電燈閃爍', location: '法律大樓', category: '建築設施', description: '1F' });
  const response = await setStatus(report.id, { status: 'In Progress', resolution_note: '不應該被存下來' });
  assert.equal(response.status, 303);
  assert.deepEqual(stored(report.id), { status: 'In Progress', resolution_note: null });
});

test('only staff can resolve: students get 403 and visitors go to the login page', async () => {
  const report = await inProgressReport();
  const fields = { status: 'Resolved', resolution_note: '已修好' };
  const asStudent = await setStatus(report.id, fields, studentCookie);
  assert.equal(asStudent.status, 403);
  assert.ok((await asStudent.text()).includes('沒有權限'));
  const asVisitor = await setStatus(report.id, fields, null);
  assert.equal(asVisitor.status, 302);
  assert.ok(asVisitor.headers.get('location').startsWith('/login'));
  assert.deepEqual(stored(report.id), { status: 'In Progress', resolution_note: null });
});

test('the resolution note is escaped on the staff and student pages', async () => {
  const report = await inProgressReport();
  const unsafe = '<script>alert(1)</script></textarea><img src=x onerror=alert(1)>';
  await setStatus(report.id, { status: 'Resolved', resolution_note: unsafe });
  for (const [path, cookie] of [['/staff/reports/' + report.id, staffCookie], ['/reports/' + report.id, null]]) {
    const html = await (await get(path, cookie)).text();
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), path);
    assert.ok(!html.includes('<script>alert(1)</script>'), path);
    assert.ok(!html.includes('<img src=x'), path);
  }
  // The rejected form echoes the typed note; it must be escaped there too.
  const other = await inProgressReport();
  const rejected = await setStatus(other.id, {
    status: 'Resolved', resolution_note: '</textarea><script>alert(2)</script>' + 'x'.repeat(MAX_RESOLUTION_NOTE),
  });
  const html = await rejected.text();
  assert.ok(html.includes('&lt;/textarea&gt;&lt;script&gt;alert(2)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(2)</script>'));
});

test('unknown report ids return 404 when resolving', async () => {
  for (const id of ['999999', 'abc', '0']) {
    const response = await setStatus(id, { status: 'Resolved', resolution_note: '已修好' });
    assert.equal(response.status, 404, id);
  }
});
