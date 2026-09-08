const { verifyToken } = require('../utils/verify');
const pool = require('../config/pool');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: 'Token missing'
            });
        }

        const token = authHeader.split(' ')[1];

        // Check blacklist
        const [blacklisted] = await pool.query(
            'SELECT * FROM token_blacklist WHERE token = ?',
            [token]
        );

        if (blacklisted.length > 0) {
            return res.status(401).json({
                message: 'Token has been revoked'
            });
        }

        const decoded = verifyToken(token);

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: error.message
        });
    }
};

module.exports = authenticate;