const sql = require('mssql');
const config = require('./config.json');

const pool = new sql.ConnectionPool({
  server: config.database.server,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  options: config.database.options,
});

const poolConnect = pool.connect();

pool.on('error', (err) => {
  console.error('SQL Pool Error:', err);
});

async function getPool() {
  await poolConnect;
  return pool;
}

module.exports = { getPool, sql };
