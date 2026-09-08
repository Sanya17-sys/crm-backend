const jwt = require("jsonwebtoken");
require("dotenv").config();

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_TOKEN || "inventory_crm_secret_key_2026");
};

module.exports = {
    verifyToken
};