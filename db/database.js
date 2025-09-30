const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost", // MySQL local
  user: "root",
  password: "GelenskiRoot.07",
  database: "booktrade",
  port: 3306,
});

module.exports = pool.promise(); // Usamos Promises para async/await
