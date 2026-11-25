const jwt = require('jsonwebtoken');

// confere se a requisição tem um access token válido
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// confere se quem fez a requisição é administrador
const isAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};

module.exports = authMiddleware;
module.exports.isAdmin = isAdmin;