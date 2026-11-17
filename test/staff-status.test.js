// WD-24 (T14): staff marks a report as In Progress.
// /staff is staff-only since WD-21 (T11), so these tests log in as the demo staff
// account first. The staff-only check itself is tested in staff-overview.test.js.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.DB_PATH = ':memory:';
const app = require('../src/app');
const { db } = require('../src/db');
const { createReport, getReportById } = require('../src/reports');

let server;
let base;
let cookie;

before(async () => {
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = 'http://127.0.0.1:' + server.address().port;
  const login = await fetch(base + '/login', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'staff01', password: 'staff-demo' }),
  });
  cookie = login.headers.getSetCookie()[0].split(';')[0];
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  db.close();
});

const newReport = () => createReport({
  title: '投影機無法開機', location: '商學大樓', category: '教學設備', description: '301 教室',
});

// Staff page request with the staff session cookie.
const staffGet = path => fetch(base + path, { headers: { Cookie: cookie } });

const setStatus = (id, status) => fetch(base + '/staff/reports/' + id + '/status', {
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
  body: new URLSearchParams(status === undefined ? {} : { status }),
});

test('handling page shows the report and the In Progress action for a Submitted report', async () => {
  const report = newReport();
  const response = await staffGet('/staff/reports/' + report.id);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes(report.reportNo));
  assert.ok(html.includes('Submitted'));
  assert.ok(html.includes('改為 In Progress'));
});

test('AC1: staff can change Submitted to In Progress, and it is saved', async () => {
  const report = newReport();
  const response = await setStatus(report.id, 'In Progress');
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/staff/reports/' + report.id + '?updated=1');
  assert.equal(getReportById(report.id).status, 'In Progress');

  const page = await (await staffGet(response.headers.get('location'))).text();
  assert.ok(page.includes('狀態已更新為 In Progress'));
  assert.ok(!page.includes('改為 In Progress'));
});

test('AC3: students see the new status on the list and the detail page', async () => {
  const report = newReport();
  await setStatus(report.id, 'In Progress');
  const detail = await (await fetch(base + '/reports/' + report.id)).text();
  assert.ok(detail.includes('In Progress'));
  const list = await (await fetch(base + '/reports')).text();
  const row = list.slice(list.indexOf(report.reportNo));
  assert.ok(row.slice(0, 600).includes('In Progress'));
});

test('changes that are not allowed are rejected with 400 and nothing is saved', async () => {
  const report = newReport();
  for (const status of ['Resolved', 'Submitted', 'Done', '', undefined]) {
    const response = await setStatus(report.id, status);
    assert.equal(response.status, 400, String(status));
    assert.equal(getReportById(report.id).status, 'Submitted', String(status));
  }
  await setStatus(report.id, 'In Progress');
  const again = await setStatus(report.id, 'In Progress');
  assert.equal(again.status, 400);
  assert.equal(getReportById(report.id).status, 'In Progress');
});

test('unknown or invalid report ids return 404', async () => {
  for (const id of ['999999', 'abc', '0', '-1']) {
    assert.equal((await staffGet('/staff/reports/' + id)).status, 404, id);
    assert.equal((await setStatus(id, 'In Progress')).status, 404, id);
  }
});
