// Fixed choices for the report form. Keeping locations as a fixed list makes
// the Sprint 2 "filter by location" feature a simple exact match.
const LOCATIONS = [
  '商學大樓',
  '人文大樓',
  '社會科學大樓',
  '法律大樓',
  '公共事務大樓',
  '電資大樓',
  '圖書館',
  '體育館',
  '學生活動中心',
  '學生宿舍',
  '其他',
];

const CATEGORIES = [
  '教學設備',
  '建築設施',
  '網路 / Wi-Fi',
  '其他',
];

module.exports = { LOCATIONS, CATEGORIES };
