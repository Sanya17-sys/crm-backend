const mysql = require("mysql2");
require("dotenv").config();

const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

function ConnectDB() {
    conn.connect((err) => {
        if (err) {
            console.log("Connection failed:", err);
            return;
        }

        console.log("MySQL Connected");
    });
}

module.exports = ConnectDB;