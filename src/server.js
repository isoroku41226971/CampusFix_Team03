const app = require('./app');
const { DB_PATH } = require('./db');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`CampusFix running at http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
