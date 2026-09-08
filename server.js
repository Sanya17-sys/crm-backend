require("dotenv").config();
const app = require("./src/app");
const initDb = require("./src/config/initDb");

const PORT = process.env.PORT || 3000;

// Initialize database tables asynchronously
initDb();

app.listen(PORT, () => {
    console.log(`🚀 Server running smoothly on port ${PORT}`);
});