const sequelize = require('sequelize');

const db = new sequelize( {
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite'
});

module.exports = db;