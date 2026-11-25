const bcrypt = require('bcrypt');
const User = require('./user.model');
const RefreshToken = require('../auth/refreshToken.model');
const { erro } = require('../utils/erro');

const safeUser = (user) => {
    const data = user.toJSON();
    delete data.password;
    return data;
};

const userService = {
    create: async (userData) => {
        try {
            userData.password = await bcrypt.hash(userData.password, 10);
            const user = await User.create(userData);
            return safeUser(user);
        } catch (error) {
            throw new Error('Error creating user: ' + error.message);
        }
    },
    findById: async (id) => {
        const user = await User.findByPk(id);
        if (!user) throw erro(404, 'User not found');
        return safeUser(user);
    },
    findByEmail: async (email) => {
        const user = await User.findOne({ where: { email } });
        return user ? safeUser(user) : null;
    },
    findAll: async () => {
        const users = await User.findAll();
        return users.map(safeUser);
    },
    update: async (id, userData) => {
        const user = await User.findByPk(id);
        if (!user) throw erro(404, 'User not found');

        const allowed = {};
        for (const field of ['name', 'username', 'email', 'isAdmin']) {
            if (userData[field] !== undefined) allowed[field] = userData[field];
        }
        if (userData.password) {
            allowed.password = await bcrypt.hash(userData.password, 10);
        }

        await user.update(allowed);
        return safeUser(user);
    },
    updateActive: async (id, active) => {
        if (typeof active !== 'boolean') throw erro(400, 'active deve ser boolean');

        const user = await User.findByPk(id);
        if (!user) throw erro(404, 'User not found');

        await user.update({ active });
        if (!active) {
            await RefreshToken.update({ revoked: true }, { where: { userId: id } });
        }
        return safeUser(user);
    }
};

module.exports = userService;