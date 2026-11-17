// Express application setup. Feature routes (report form, list, detail,
// staff actions) are added by their own Jira tasks.
const path = require('path');
const express = require('express');
const { db } = require('./db');
const { LOCATIONS, CATEGORIES } = require('./constants');
const { createReport, getReportById, listReports } = require('./reports');
const { validateReport } = require('./validation');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.render('index', { title: 'CampusFix' });
});

app.get('/reports', (req, res) => {
  const keyword = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  res.render('reports/index', {
    title: '報修列表',
    reports: listReports(keyword),
    keyword,
  });
});

// Report form (WD-12). The form posts to /reports, which saves the report (WD-13).
// `values` and `errors` let the same page be re-rendered after validation (WD-14).
app.get('/reports/new', (req, res) => {
  res.render('reports/new', {
    title: '送出報修',
    locations: LOCATIONS,
    categories: CATEGORIES,
    values: {},
    errors: {},
  });
});

// Save a submitted report (WD-13), then redirect so that refreshing the
// confirmation page does not submit the form again.
// Invalid input (WD-14) re-renders the form with the entered values and a
// message under each problem field; nothing is saved.
app.post('/reports', (req, res) => {
  const values = {
    title: (req.body.title || '').trim(),
    location: (req.body.location || '').trim(),
    category: (req.body.category || '').trim(),
    description: (req.body.description || '').trim(),
  };
  const errors = validateReport(values);
  if (Object.keys(errors).length > 0) {
    return res.status(400).render('reports/new', {
      title: '送出報修',
      locations: LOCATIONS,
      categories: CATEGORIES,
      values,
      errors,
    });
  }
  const report = createReport(values);
  res.redirect(303, `/reports/${report.id}/submitted`);
});

// Confirmation page after a successful submission: shows the unique report
// number and the current status (Submitted).
app.get('/reports/:id/submitted', (req, res) => {
  const report = getReportById(Number(req.params.id));
  if (!report) {
    return res.status(404).render('not-found', { title: '找不到頁面' });
  }
  res.render('reports/submitted', { title: '報修已送出', report });
});

// Report detail (WD-7 / WD-18). Keep this after the /reports/new route.
app.get('/reports/:id', (req, res) => {
  const id = Number(req.params.id);
  const report = /^[1-9]\d*$/.test(req.params.id) && Number.isSafeInteger(id)
    ? getReportById(id)
    : undefined;
  if (!report) {
    return res.status(404).render('reports/not-found', { title: '查無此報修' });
  }
  res.render('reports/detail', { title: '報修詳情', report });
});

// Quick check that the server and database are up.
app.get('/health', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM reports').get();
  res.json({ status: 'ok', reports: count });
});

app.use((req, res) => {
  res.status(404).render('not-found', { title: '找不到頁面' });
});

module.exports = app;
