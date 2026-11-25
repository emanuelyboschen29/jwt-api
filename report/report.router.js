const express = require('express');
const { Op } = require('sequelize');
const authMiddleware = require('../auth/auth.middleware');
const isAdmin = authMiddleware.isAdmin;
const Book = require('../models/book.model');
const Loan = require('../models/loan.model');

const router = express.Router();

router.get('/dashboard', authMiddleware, isAdmin, async (req, res) => {
    try {
        await Loan.update(
            { status: 'ATRASADO' },
            {
                where: {
                    status: 'ATIVO',
                    dueDate: { [Op.lt]: new Date() },
                    returnDate: null
                }
            }
        );

        const books = await Book.findAll();
        const activeLoans = await Loan.count({ where: { status: 'ATIVO' } });
        const overdueLoans = await Loan.count({ where: { status: 'ATRASADO', returnDate: null } });
        const pendingLoans = await Loan.findAll({
            where: { status: ['ATIVO', 'ATRASADO'], returnDate: null }
        });
        const returnedLoans = await Loan.findAll({
            where: { status: 'DEVOLVIDO', returnDate: { [Op.ne]: null } }
        });

        const totalBooks = books.reduce((sum, book) => sum + book.totalCopies, 0);
        const availableCopies = books.reduce((sum, book) => sum + book.availableCopies, 0);
        const pendingFines = overdueLoans;
        const projectedFine = pendingLoans
            .filter((loan) => loan.status === 'ATRASADO')
            .reduce((sum, loan) => {
                const today = new Date();
                const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const due = new Date(loan.dueDate);
                const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
                const days = todayDay > dueDay
                    ? Math.floor((todayDay - dueDay) / (24 * 60 * 60 * 1000))
                    : 0;
                return sum + days;
            }, 0);
        const totalFines = projectedFine + returnedLoans.reduce((sum, loan) => sum + (loan.fine || 0), 0);

        res.json({
            totalBooks,
            totalCopies: totalBooks,
            availableCopies,
            activeLoans,
            borrowedBooks: pendingLoans.length,
            overdueLoans,
            totalFines,
            pendingFines
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
