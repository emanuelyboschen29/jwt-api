const jwt = require('jsonwebtoken');
const User = require('../user/user.model');

// confere se a requisição tem um access token válido
const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(req.user.id);
        if (!user || user.active === false) {
            return res.status(401).json({ error: 'User is inactive.' });
        }
        req.user.isAdmin = user.isAdmin;
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