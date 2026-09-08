const jwt = require("jsonwebtoken");
require("dotenv").config();

const generatetoken = (id, email) => {
    return jwt.sign(
        {
            id, email
        },
        process.env.JWT_TOKEN || "inventory_crm_secret_key_2026",
        {
            expiresIn: '1d'
        }
    );
};

module.exports = generatetoken;