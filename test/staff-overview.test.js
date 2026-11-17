// WD-23 (T13): tests for S4 — demo login (WD-20), staff-only check (WD-21)
// and the staff report overview (WD-22).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.DB_PATH = ':memory:';
const app = require('../src/app');
const { db } = require('../src/db');
const { createReport, getReportById } = require('../src/reports');

let server;
let base;

before(async () => {
  server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = 'http://127.0.0.1:' + server.address().port;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  db.close();
});

const STAFF = { username: 'staff01', password: 'staff-demo' };
const STUDENT = { username: 'student01', password: 'student-demo' };

const form = fields => ({
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(fields),
});

// The "name=value" part of the session cookie set by a response, or undefined.
const sessionCookie = response => {
  const cookie = response.headers.getSetCookie().find(value => value.startsWith('sid='));
  return cookie && cookie.split(';')[0];
};

// Post the login form. Returns the response and the session cookie (if one was set).
const login = async (account, next) => {
  const response = await fetch(base + '/login', form(next === undefined ? account : { ...account, next }));
  return { response, cookie: sessionCookie(response) };
};

const get = (path, cookie) => fetch(base + path, {
  redirect: 'manual',
  headers: cookie ? { Cookie: cookie } : {},
});

const newReport = (overrides = {}) => createReport({
  title: '投影機無法開機', location: '商學大樓', category: '教學設備', description: '301 教室', ...overrides,
});

test('overview shows the empty message when there are no reports', async () => {
  const { cookie } = await login(STAFF);
  const response = await get('/staff/reports', cookie);
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes('目前沒有報修紀錄。'));
});

test('without login, every /staff page redirects to the login page', async () => {
  const report = newReport();
  const overview = await get('/staff/reports');
  assert.equal(overview.status, 302);
  assert.equal(overview.headers.get('location'), '/login?next=%2Fstaff%2Freports');

  const handling = await get('/staff/reports/' + report.id);
  assert.equal(handling.status, 302);
  assert.equal(handling.headers.get('location'), '/login?next=' + encodeURIComponent('/staff/reports/' + report.id));

  const change = await fetch(base + '/staff/reports/' + report.id + '/status', form({ status: 'In Progress' }));
  assert.equal(change.status, 302);
  assert.ok(change.headers.get('location').startsWith('/login'));
  assert.equal(getReportById(report.id).status, 'Submitted');
});

test('wrong or empty credentials stay on the login page and create no session', async () => {
  const attempts = [
    [{ username: 'staff01', password: 'wrong' }, 401, '帳號或密碼錯誤'],
    [{ username: 'nobody', password: 'staff-demo' }, 401, '帳號或密碼錯誤'],
    [{ username: 'staff01', password: 'student-demo' }, 401, '帳號或密碼錯誤'],
    [{ username: '', password: '' }, 400, '請輸入帳號和密碼'],
    [{ username: 'staff01', password: '' }, 400, '請輸入帳號和密碼'],
    [{ username: '   ', password: 'staff-demo' }, 400, '請輸入帳號和密碼'],
  ];
  for (const [account, status, message] of attempts) {
    const { response, cookie } = await login(account);
    const label = JSON.stringify(account);
    assert.equal(response.status, status, label);
    assert.equal(cookie, undefined, label);
    const html = await response.text();
    assert.ok(html.includes(message), label);
    assert.ok(html.includes('action="/login"'), label);
  }
});

test('staff login opens the overview with all reports, newest first', async () => {
  db.prepare('DELETE FROM reports').run();
  const first = newReport({ title: '投影機無法開機', location: '商學大樓', category: '教學設備' });
  const second = newReport({ title: 'Wi-Fi 斷線', location: '圖書館', category: '網路 / Wi-Fi' });
  const third = newReport({ title: '飲水機漏水', location: '體育館', category: '建築設施' });
  db.prepare("UPDATE reports SET status = 'In Progress' WHERE id = ?").run(second.id);

  const { response, cookie } = await login(STAFF);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/staff/reports');
  assert.ok(cookie);
  assert.ok(response.headers.getSetCookie().some(value => /^sid=.*HttpOnly/i.test(value)));

  const page = await get('/staff/reports', cookie);
  assert.equal(page.status, 200);
  const html = await page.text();
  for (const report of [first, second, third]) {
    for (const value of [report.reportNo, report.title, report.location, report.created_at]) {
      assert.ok(html.includes(value), value);
    }
    assert.ok(html.includes('href="/staff/reports/' + report.id + '"'), report.reportNo);
  }
  assert.ok(html.includes('網路 / Wi-Fi'));
  assert.ok(html.indexOf(third.reportNo) < html.indexOf(second.reportNo));
  assert.ok(html.indexOf(second.reportNo) < html.indexOf(first.reportNo));

  // Counts per status above the table.
  assert.match(html, /全部 <strong>3<\/strong> 筆/);
  assert.match(html, />Submitted<\/span> <strong>2<\/strong> 筆/);
  assert.match(html, />In Progress<\/span> <strong>1<\/strong> 筆/);
  assert.match(html, />Resolved<\/span> <strong>0<\/strong> 筆/);

  // Navigation for staff, and the link target (WD-24 handling page) opens.
  assert.ok(html.includes('管理總覽'));
  assert.ok(html.includes('登出'));
  assert.ok(html.includes('管理人員 staff01'));
  assert.equal((await get('/staff/reports/' + first.id, cookie)).status, 200);
});

test('after login staff return to the staff page they first asked for', async () => {
  const report = newReport();
  const target = '/staff/reports/' + report.id;
  const redirect = await get(target);
  const loginPage = await get(redirect.headers.get('location'));
  assert.ok((await loginPage.text()).includes('name="next" value="' + target + '"'));
  const { response } = await login(STAFF, target);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), target);
});

test('a student account gets 403 on staff pages and cannot change a status', async () => {
  const report = newReport();
  const { response, cookie } = await login(STUDENT, '/staff/reports');
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/');
  assert.ok(cookie);

  for (const path of ['/staff/reports', '/staff/reports/' + report.id]) {
    const page = await get(path, cookie);
    assert.equal(page.status, 403, path);
    const html = await page.text();
    assert.ok(html.includes('沒有權限'), path);
    assert.ok(!html.includes(report.reportNo), path);
  }
  const change = await fetch(base + '/staff/reports/' + report.id + '/status', {
    ...form({ status: 'In Progress' }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
  });
  assert.equal(change.status, 403);
  assert.equal(getReportById(report.id).status, 'Submitted');

  // Students see their name and the logout button, but not the staff link.
  const home = await (await get('/', cookie)).text();
  assert.ok(home.includes('學生 student01'));
  assert.ok(home.includes('登出'));
  assert.ok(!home.includes('管理總覽'));
});

test('after logout the old session cookie no longer works', async () => {
  const { cookie } = await login(STAFF);
  assert.equal((await get('/staff/reports', cookie)).status, 200);

  const logout = await fetch(base + '/logout', { ...form({}), headers: { Cookie: cookie } });
  assert.equal(logout.status, 303);
  assert.equal(logout.headers.get('location'), '/');

  const reused = await get('/staff/reports', cookie);
  assert.equal(reused.status, 302);
  assert.ok(reused.headers.get('location').startsWith('/login'));
  const home = await (await get('/', cookie)).text();
  assert.ok(home.includes('href="/login"'));
  assert.ok(!home.includes('管理總覽'));
});

test('the redirect after login never leaves the site', async () => {
  const unsafe = [
    'https://evil.example/',
    '//evil.example/staff/',
    '/\\evil.example',
    '/staff\\evil.example',
    '/staff/\\evil.example',
    '/staffx/reports',
    '/reports',
    'staff/reports',
    'javascript:alert(1)',
  ];
  for (const next of unsafe) {
    const { response } = await login(STAFF, next);
    assert.equal(response.status, 303, next);
    assert.equal(response.headers.get('location'), '/staff/reports', next);

    // The login page does not carry the unsafe target into its hidden field either.
    const html = await (await get('/login?next=' + encodeURIComponent(next))).text();
    assert.ok(html.includes('name="next" value=""'), next);
  }
});

test('report text is escaped in the overview', async () => {
  newReport({ title: '<script>alert(1)</script>', location: '<b>地點</b>', category: '<img src=x onerror=alert(1)>' });
  const { cookie } = await login(STAFF);
  const html = await (await get('/staff/reports', cookie)).text();
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;b&gt;地點&lt;/b&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('<img src=x'));
});

test('student pages still work without logging in', async () => {
  const report = newReport();
  for (const path of ['/', '/reports', '/reports/new', '/reports/' + report.id, '/login']) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes('href="/login"'), path);
    assert.ok(!html.includes('管理總覽'), path);
  }
  const submit = await fetch(base + '/reports', form({
    title: '冷氣不冷', location: '人文大樓', category: '建築設施', description: '2F 205 教室',
  }));
  assert.equal(submit.status, 303);
  assert.match(submit.headers.get('location'), /^\/reports\/\d+\/submitted$/);
  assert.equal((await get(submit.headers.get('location'))).status, 200);
});
