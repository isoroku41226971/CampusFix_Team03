// Staff routes, mounted at /staff (WD-24).
// Every route that lets staff view or change reports belongs in this router, so the
// staff-only check from WD-21 (T11) can protect all of them with one line in app.js:
//   app.use('/staff', requireStaff, staffRouter);
const express = require('express');
const {
  getReportById,
  parseReportId,
  ALLOWED_TRANSITIONS,
  updateReportStatus,
} = require('./reports');

const router = express.Router();

function renderReport(res, report, extra = {}) {
  res.render('staff/report', {
    title: '處理報修 ' + report.reportNo,
    report,
    nextStatuses: ALLOWED_TRANSITIONS[report.status] || [],
    message: null,
    error: null,
    ...extra,
  });
}

function notFound(res) {
  res.status(404).render('reports/not-found', { title: '查無此報修' });
}

// Single report handling page: current details, status and the allowed status changes.
router.get('/reports/:id', (req, res) => {
  const id = parseReportId(req.params.id);
  const report = id && getReportById(id);
  if (!report) return notFound(res);
  const message = req.query.updated ? `狀態已更新為 ${report.status}` : null;
  renderReport(res, report, { message });
});

// Change the status. Redirects back to the handling page (303) so a refresh does not
// submit again. A change that is not allowed is rejected with 400 and nothing is saved.
router.post('/reports/:id/status', (req, res) => {
  const id = parseReportId(req.params.id);
  if (!id) return notFound(res);
  const nextStatus = (req.body.status || '').trim();
  const result = updateReportStatus(id, nextStatus);
  if (result.error === 'not-found') return notFound(res);
  if (result.error) {
    return res.status(400).render('staff/report', {
      title: '處理報修 ' + result.report.reportNo,
      report: result.report,
      nextStatuses: ALLOWED_TRANSITIONS[result.report.status] || [],
      message: null,
      error: `無法從 ${result.report.status} 改為 ${nextStatus || '（未指定）'}`,
    });
  }
  res.redirect(303, `/staff/reports/${id}?updated=1`);
});

module.exports = router;
