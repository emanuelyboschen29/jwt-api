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

        const totalBooks = books.reduce((sum, book) => sum + book.totalCopies, 0);
        const availableCopies = books.reduce((sum, book) => sum + book.availableCopies, 0);
        const pendingFines = overdueLoans;

        res.json({
            totalBooks,
            totalCopies: totalBooks,
            availableCopies,
            activeLoans,
            borrowedBooks: pendingLoans.length,
            overdueLoans,
            totalFines: pendingLoans.reduce((sum, loan) => sum + (loan.fine || 0), 0),
            pendingFines
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
