const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../user/user.model');
const RefreshToken = require('./refreshToken.model');

// gera o access token (15 min)
const generateAccessToken = (user) => jwt.sign(
    { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
);

// gera o refresh token (7 dias) e salva no banco
const generateRefreshToken = async (user) => {
    const token = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d', jwtid: crypto.randomUUID() }
    );

    await RefreshToken.create({
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return token;
};

const authService = {

    login: async (email, password) => {
        const user = await User.findOne({ where: { email } });

        if (!user || user.active === false) {
            throw new Error('Invalid email or password');
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            throw new Error('Invalid email or password');
        }

        return {
            accessToken: generateAccessToken(user),
            refreshToken: await generateRefreshToken(user),
            user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
        };
    },

    refresh: async (refreshToken) => {
        if (!refreshToken) {
            throw new Error('Refresh token required');
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired refresh token');
        }

        const stored = await RefreshToken.findOne({ where: { token: refreshToken } });

        if (!stored) {
            throw new Error('Invalid or expired refresh token');
        }

        if (stored.userId !== decoded.id) {
            throw new Error('Invalid refresh token');
        }

        // token já usado sendo reutilizado: revoga todos os tokens do usuário
        if (stored.revoked) {
            await RefreshToken.update({ revoked: true }, { where: { userId: stored.userId } });
            throw new Error('Refresh token reuse detected');
        }

        if (stored.expiresAt <= new Date()) {
            stored.revoked = true;
            await stored.save();
            throw new Error('Invalid or expired refresh token');
        }

        const user = await User.findByPk(decoded.id);

        if (!user || user.active === false) {
            throw new Error('User not found');
        }

        // rotação: revoga o antigo e gera um par novo
        stored.revoked = true;
        await stored.save();

        return {
            accessToken: generateAccessToken(user),
            refreshToken: await generateRefreshToken(user),
            user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
        };
    },

    logout: async (refreshToken) => {
        if (!refreshToken) {
            throw new Error('Refresh token required');
        }
        await RefreshToken.update({ revoked: true }, { where: { token: refreshToken } });
    },

    me: async (id) => {
        const user = await User.findByPk(id);
        if (!user) {
            throw new Error('User not found');
        }
        return { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin };
    },

    verifyToken: (token) => jwt.verify(token, process.env.JWT_SECRET)
};

module.exports = authService;