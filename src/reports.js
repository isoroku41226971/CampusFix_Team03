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
function listReports(keyword = '', location = '') {
  // instr treats %, _ and quotes as literal text. Empty text matches all rows.
  return db.prepare(`
    SELECT id, title, location, status FROM reports
    WHERE (instr(lower(title), lower(?)) > 0
       OR instr(lower(description), lower(?)) > 0)
      AND (? = '' OR location = ?)
    ORDER BY id DESC
  `)
    .all(keyword, keyword, location, location)
    .map(report => ({ ...report, reportNo: formatReportNo(report.id) }));
}

// List every report with the extra columns of the staff overview (WD-22), newest first.
function listReportsForStaff() {
  return db
    .prepare('SELECT id, title, location, category, status, created_at FROM reports ORDER BY id DESC')
    .all()
    .map(report => ({ ...report, reportNo: formatReportNo(report.id) }));
}

// Turn a URL id ("12") into a positive integer, or undefined if it is not one.
function parseReportId(value) {
  const id = Number(value);
  return /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(id) ? id : undefined;
}

// Status changes staff may make: Submitted -> In Progress (WD-24) and
// In Progress -> Resolved (WD-26). Resolved is final.
const ALLOWED_TRANSITIONS = {
  Submitted: ['In Progress'],
  'In Progress': ['Resolved'],
  Resolved: [],
};

const MAX_RESOLUTION_NOTE = 1000;

function canChangeStatus(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

// Change a report's status. Resolving a report (WD-26) also needs a resolution
// note, which is saved together with the new status.
// Returns { report } on success, or { error } with 'not-found', 'invalid-transition',
// 'note-required' or 'note-too-long'. Nothing is written when it fails.
function updateReportStatus(id, nextStatus, resolutionNote = '') {
  const current = getReportById(id);
  if (!current) return { error: 'not-found' };
  if (!canChangeStatus(current.status, nextStatus)) return { error: 'invalid-transition', report: current };
  if (nextStatus !== 'Resolved') {
    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(nextStatus, id);
    return { report: getReportById(id) };
  }
  // Browsers send line breaks as CRLF; store LF so a line break counts as one character.
  const note = String(resolutionNote).replace(/\r\n/g, '\n').trim();
  if (!note) return { error: 'note-required', report: current };
  if (note.length > MAX_RESOLUTION_NOTE) return { error: 'note-too-long', report: current };
  // The status check in WHERE keeps a second, late request from overwriting the note.
  db.prepare('UPDATE reports SET status = ?, resolution_note = ? WHERE id = ? AND status = ?')
    .run(nextStatus, note, id, current.status);
  return { report: getReportById(id) };
}

module.exports = {
  formatReportNo,
  createReport,
  getReportById,
  listReports,
  listReportsForStaff,
  parseReportId,
  ALLOWED_TRANSITIONS,
  MAX_RESOLUTION_NOTE,
  canChangeStatus,
  updateReportStatus,
};
