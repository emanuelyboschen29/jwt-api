const express = require('express');
const authMiddleware = require('../auth/auth.middleware');
const Loan = require('../models/loan.model');
const Book = require('../models/book.model');
const Reader = require('../models/reader.model');
const db = require('../config/db');
const { Op } = require('sequelize');

const router = express.Router();

const loanIncludes = [
    { model: Book, as: 'Book' },
    { model: Reader, as: 'Reader' }
];

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const where = {};
        if (req.query.status) {
            where.status = String(req.query.status).toUpperCase();
        }

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

        if (req.query.status) {
            where.status = String(req.query.status).toUpperCase();
        }

        const loans = await Loan.findAll({
            where,
            include: loanIncludes,
            order: [['loanDate', 'DESC']]
        });
        res.json(loans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    const transaction = await db.transaction();
    try {
        const { bookId, readerId } = req.body;
        const book = await Book.findByPk(bookId, { transaction, lock: transaction.LOCK.UPDATE });
        const reader = await Reader.findByPk(readerId, { transaction });

        if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });
        if (!reader) return res.status(404).json({ error: 'Leitor não encontrado.' });
        if (book.availableCopies <= 0) {
            await transaction.rollback();
            return res.status(409).json({ error: 'Não há exemplares disponíveis deste livro.' });
        }

        const activeLoans = await Loan.count({
            where: { readerId, status: ['ATIVO', 'ATRASADO'] },
            transaction
        });
        if (activeLoans >= 3) {
            await transaction.rollback();
            return res.status(409).json({ error: 'O leitor já possui o limite de 3 empréstimos ativos.' });
        }

        const overdue = await Loan.count({
            where: {
                readerId,
                status: 'ATRASADO',
                returnDate: null
            },
            transaction
        });
        if (overdue > 0) {
            await transaction.rollback();
            return res.status(409).json({ error: 'O leitor possui empréstimos atrasados.' });
        }

        const loanDate = new Date();
        const dueDate = new Date(loanDate);
        dueDate.setDate(dueDate.getDate() + 7);

        const loan = await Loan.create({
            bookId,
            readerId,
            userId: req.user.id,
            loanDate,
            dueDate,
            status: 'ATIVO'
        }, { transaction });

        await book.update({ availableCopies: book.availableCopies - 1 }, { transaction });
        await transaction.commit();

        const created = await Loan.findByPk(loan.id, { include: loanIncludes });
        res.status(201).json(created);
    } catch (error) {
        await transaction.rollback();
        res.status(400).json({ error: error.message });
    }
});

router.patch('/:id/return', async (req, res) => {
    const transaction = await db.transaction();
    try {
        const loan = await Loan.findByPk(req.params.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        if (!loan) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Empréstimo não encontrado.' });
        }
        if (loan.returnDate) {
            await transaction.rollback();
            return res.status(409).json({ error: 'Este empréstimo já foi devolvido.' });
        }

        const today = new Date();
        let fine = 0;
        if (today > new Date(loan.dueDate)) {
            const millisecondsPerDay = 24 * 60 * 60 * 1000;
            const overdueDays = Math.ceil((today - new Date(loan.dueDate)) / millisecondsPerDay);
            fine = overdueDays;
        }

        await loan.update({
            returnDate: today,
            status: 'DEVOLVIDO',
            fine
        }, { transaction });

        const book = await Book.findByPk(loan.bookId, { transaction, lock: transaction.LOCK.UPDATE });
        await book.update({ availableCopies: book.availableCopies + 1 }, { transaction });
        await transaction.commit();

        const returned = await Loan.findByPk(loan.id, { include: loanIncludes });
        res.json(returned);
    } catch (error) {
        await transaction.rollback();
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
