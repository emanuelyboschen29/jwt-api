const db = require('../config/db');
const { DataTypes } = require('sequelize');
const User = require('../user/user.model');

const RefreshToken = db.define('RefreshToken', {
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revoked: { type: DataTypes.BOOLEAN, defaultValue: false }
});

User.hasMany(RefreshToken, { foreignKey: 'userId' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

module.exports = RefreshToken;