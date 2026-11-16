// Server-side validation for the report form (WD-14).
// Returns an object keyed by field name; an empty object means the input is valid.
const { LOCATIONS, CATEGORIES } = require('./constants');

const MAX_TITLE = 100;
const MAX_DESCRIPTION = 1000;

function validateReport({ title, location, category, description }) {
  const errors = {};

  if (!title) errors.title = '請填寫標題';
  else if (title.length > MAX_TITLE) errors.title = `標題最多 ${MAX_TITLE} 個字`;

  if (!location) errors.location = '請選擇地點';
  else if (!LOCATIONS.includes(location)) errors.location = '請從清單中選擇地點';

  if (!category) errors.category = '請選擇類別';
  else if (!CATEGORIES.includes(category)) errors.category = '請從清單中選擇類別';

  if (!description) errors.description = '請填寫描述';
  else if (description.length > MAX_DESCRIPTION) errors.description = `描述最多 ${MAX_DESCRIPTION} 個字`;

  return errors;
}

module.exports = { validateReport, MAX_TITLE, MAX_DESCRIPTION };
