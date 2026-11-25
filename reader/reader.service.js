const { Reader, Loan, Book } = require('../models');
const { erro } = require('../utils/erro');

const CAMPOS = ['name', 'cpf', 'email', 'phone'];

const readerService = {
    findAll: async () => Reader.findAll(),

    findById: async (id) => {
        const reader = await Reader.findByPk(id);
        if (!reader) throw erro(404, 'Leitor não encontrado');
        return reader;
    },

    create: async (data) => Reader.create(data, { fields: CAMPOS }),

    update: async (id, data) => {
        const reader = await readerService.findById(id);
        return reader.update(data, { fields: CAMPOS });
    },

    // GET /v1/readers/:id/loans (histórico do leitor)
    loans: async (id) => {
        await readerService.findById(id);
        const loans = await Loan.findAll({
            where: { readerId: id },
            include: [Book],
            order: [['loanDate', 'DESC']]
        });
        return loans.map((l) => ({
            ...l.toJSON(),
            status: l.returnDate ? 'DEVOLVIDO' : (l.dueDate < new Date() ? 'ATRASADO' : 'ATIVO')
        }));
    }
};

module.exports = readerService;
