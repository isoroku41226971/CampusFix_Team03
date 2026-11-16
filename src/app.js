// Express application setup. Feature routes (report form, list, detail,
// staff actions) are added by their own Jira tasks.
const path = require('path');
const express = require('express');
const { db } = require('./db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.render('index', { title: 'CampusFix' });
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
