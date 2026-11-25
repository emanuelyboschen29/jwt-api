const dotenv = require('dotenv');
dotenv.config();
const db = require('./config/db');
const express = require('express');
const cors = require('cors');
require('./models');

const authRouter = require('./auth/auth.router');
const userRouter = require('./user/user.router');
const userService = require('./user/user.service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:3001', credentials: true }));
app.use(express.json());

app.use('/v1/auth', authRouter);
app.use('/v1/user', userRouter);
app.use('/v1/categories', require('./category/category.router'));
app.use('/v1/authors', require('./author/author.router'));
app.use('/v1/books', require('./book/book.router'));
app.use('/v1/readers', require('./reader/reader.router'));  
app.use('/v1/loans', require('./loan/loan.router'));
app.use('/v1/reports', require('./report/report.router'));
db.sync().then(async () => {
    // seed: cria o primeiro admin se ele ainda não existir
    const admin = await userService.findByEmail('admin@biblioteca.com');
    if (!admin) {
        await userService.create({
            name: 'Admin',
            username: 'admin',
            email: 'admin@biblioteca.com',
            password: '123456',
            isAdmin: true
        });
        console.log('Admin criado: admin@biblioteca.com / 123456');
    }

    app.listen(PORT, (error) => {
        if (error) {
            console.error('Erro ao iniciar o servidor:', error.message);
            return;
        }
        console.log(`SERVIDOR RODANDO http://localhost:${PORT}`);
    });
});