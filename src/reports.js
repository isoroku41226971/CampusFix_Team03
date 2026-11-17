// Data access for reports. Routes call these functions instead of writing SQL.
const { db } = require('./db');

// Report number shown to users, e.g. id 7 -> "CF-0007".
// It is derived from the auto-increment id, so every report gets a unique number.
function formatReportNo(id) {
  return 'CF-' + String(id).padStart(4, '0');
}

// Save a new report with status Submitted and return it.
function createReport({ title, location, category, description }) {
  const info = db
    .prepare(
      `INSERT INTO reports (title, location, category, description, status)
       VALUES (?, ?, ?, ?, 'Submitted')`
    )
    .run(title, location, category, description);
  return getReportById(info.lastInsertRowid);
}

// Return one report (with its display number), or undefined if it does not exist.
function getReportById(id) {
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!row) return undefined;
  return { ...row, reportNo: formatReportNo(row.id) };
}

// List report summaries with their IDs for detail links, newest first.
function listReports(keyword = '') {
  // instr treats %, _ and quotes as literal text. Empty text matches all rows.
  return db.prepare(`
    SELECT id, title, location, status FROM reports
    WHERE instr(lower(title), lower(?)) > 0
       OR instr(lower(description), lower(?)) > 0
    ORDER BY id DESC
  `)
    .all(keyword, keyword)
    .map(report => ({ ...report, reportNo: formatReportNo(report.id) }));
}

module.exports = { formatReportNo, createReport, getReportById, listReports };
