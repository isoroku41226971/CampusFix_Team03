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
function listReports() {
  return db.prepare('SELECT id, title, location, status FROM reports ORDER BY id DESC')
    .all()
    .map(report => ({ ...report, reportNo: formatReportNo(report.id) }));
}

// Turn a URL id ("12") into a positive integer, or undefined if it is not one.
function parseReportId(value) {
  const id = Number(value);
  return /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(id) ? id : undefined;
}

// Status changes staff may make (WD-24). S6 / WD-26 adds "In Progress" -> "Resolved"
// together with the required resolution note.
const ALLOWED_TRANSITIONS = {
  Submitted: ['In Progress'],
  'In Progress': [],
  Resolved: [],
};

function canChangeStatus(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

// Change a report's status. Returns { report } on success, or { error } with
// 'not-found' or 'invalid-transition'. Nothing is written when it fails.
function updateReportStatus(id, nextStatus) {
  const current = getReportById(id);
  if (!current) return { error: 'not-found' };
  if (!canChangeStatus(current.status, nextStatus)) return { error: 'invalid-transition', report: current };
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(nextStatus, id);
  return { report: getReportById(id) };
}

module.exports = {
  formatReportNo,
  createReport,
  getReportById,
  listReports,
  parseReportId,
  ALLOWED_TRANSITIONS,
  canChangeStatus,
  updateReportStatus,
};
