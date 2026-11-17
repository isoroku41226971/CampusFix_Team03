// Demo accounts, login sessions and the staff-only check (WD-20 / WD-21).
// Sessions live in memory, so everyone has to log in again after a server restart.
const crypto = require('crypto');
const express = require('express');

// Fictional demonstration accounts only — no real users or passwords.
const DEMO_ACCOUNTS = [
  { username: 'staff01', password: 'staff-demo', role: 'staff', name: '管理人員 staff01' },
  { username: 'student01', password: 'student-demo', role: 'student', name: '學生 student01' },
];

const SESSION_COOKIE = 'sid';
const STAFF_HOME = '/staff/reports';

// Session id -> { username, name, role }.
const sessions = new Map();

function findAccount(username, password) {
  return DEMO_ACCOUNTS.find(account => account.username === username && account.password === password);
}

// Read one cookie from the request header (avoids adding the cookie-parser package).
function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index !== -1 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

function startSession(res, account) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, { username: account.username, name: account.name, role: account.role });
  res.cookie(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: 'lax', path: '/' });
}

// Forget the session on the server, so a copied cookie stops working after logout.
function endSession(req) {
  const sessionId = readCookie(req, SESSION_COOKIE);
  if (sessionId) sessions.delete(sessionId);
}

// Where to go after login. Only paths inside this site's /staff area are accepted;
// anything else (other pages, "//host", "https://...") is dropped, so the login
// form cannot be used to send someone to an external site.
function safeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/staff/')) return undefined;
  if (/[\\\u0000-\u001f]/.test(value)) return undefined;
  return value;
}

// Runs on every request: attaches the logged-in user (or null) to the request and
// to the templates, where the header uses it for the navigation links.
function loadUser(req, res, next) {
  const sessionId = readCookie(req, SESSION_COOKIE);
  req.user = (sessionId && sessions.get(sessionId)) || null;
  res.locals.currentUser = req.user;
  next();
}

// Staff-only check (WD-21). Not logged in: go to the login page and come back
// afterwards. Logged in without the staff role: 403.
function requireStaff(req, res, next) {
  if (!req.user) {
    // A form post cannot be repeated by a redirect, so those return to the overview.
    const target = req.method === 'GET' ? safeNext(req.originalUrl) : undefined;
    return res.redirect('/login?next=' + encodeURIComponent(target || STAFF_HOME));
  }
  if (req.user.role !== 'staff') {
    return res.status(403).render('forbidden', { title: '沒有權限' });
  }
  next();
}

const router = express.Router();

function renderLogin(res, { status = 200, error = null, username = '', next = '' } = {}) {
  res.status(status).render('login', { title: '登入', error, username, next });
}

router.get('/login', (req, res) => {
  renderLogin(res, { next: safeNext(req.query.next) || '' });
});

// Wrong or empty input stays on the login page with a message; no session is created.
router.post('/login', (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const next = safeNext(req.body.next) || '';
  if (!username || !password) {
    return renderLogin(res, { status: 400, error: '請輸入帳號和密碼', username, next });
  }
  const account = findAccount(username, password);
  if (!account) {
    return renderLogin(res, { status: 401, error: '帳號或密碼錯誤', username, next });
  }
  endSession(req);
  startSession(res, account);
  res.redirect(303, account.role === 'staff' ? next || STAFF_HOME : '/');
});

router.post('/logout', (req, res) => {
  endSession(req);
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', path: '/' });
  res.redirect(303, '/');
});

module.exports = { router, loadUser, requireStaff, safeNext, DEMO_ACCOUNTS, SESSION_COOKIE };
