const { Op } = require('sequelize');
const { Book, Category, Author, Loan } = require('../models');
const { erro } = require('../utils/erro');

const CAMPOS = ['title', 'isbn', 'year', 'categoryId', 'totalCopies', 'availableCopies'];

const bookService = {

    // GET /v1/books?title=&categoryId=&authorId=&available=true
    findAll: async (q = {}) => {
        const where = {};
        if (q.title) where.title = { [Op.like]: `%${q.title}%` };
        if (q.categoryId) where.categoryId = q.categoryId;
        if (q.available === 'true') where.availableCopies = { [Op.gt]: 0 };

        const include = [
            Category,
            { model: Author, through: { attributes: [] }, ...(q.authorId ? { where: { id: q.authorId } } : {}) }
        ];
        return Book.findAll({ where, include });
    },

    findById: async (id) => {
        const book = await Book.findByPk(id, {
            include: [Category, { model: Author, through: { attributes: [] } }]
        });
        if (!book) throw erro(404, 'Livro não encontrado');
        return book;
    },

    // body: { title, isbn, year, totalCopies, categoryId, authorIds: [1, 2] }
    create: async (data) => {
        if (data.categoryId && !(await Category.findByPk(data.categoryId))) {
            throw erro(404, 'Categoria não encontrada');
        }
        const total = data.totalCopies ?? 1;
        const book = await Book.create(
            { ...data, totalCopies: total, availableCopies: total },
            { fields: CAMPOS }
        );
        if (Array.isArray(data.authorIds)) await book.setAuthors(data.authorIds);
        return bookService.findById(book.id);
    },

    update: async (id, data) => {
        const book = await Book.findByPk(id);
        if (!book) throw erro(404, 'Livro não encontrado');

        if (data.categoryId && !(await Category.findByPk(data.categoryId))) {
            throw erro(404, 'Categoria não encontrada');
        }

        // se mudar o total, ajusta os exemplares disponíveis na mesma proporção
        if (data.totalCopies !== undefined) {
            const diferenca = data.totalCopies - book.totalCopies;
            if (book.availableCopies + diferenca < 0) {
                throw erro(409, 'O total não pode ser menor que a quantidade de exemplares emprestados');
            }
            book.availableCopies += diferenca;
        }

        await book.update(data, { fields: CAMPOS });
        if (Array.isArray(data.authorIds)) await book.setAuthors(data.authorIds);
        return bookService.findById(id);
    },

    // regra 6: não exclui se houver empréstimo em aberto
    delete: async (id) => {
        const book = await Book.findByPk(id);
        if (!book) throw erro(404, 'Livro não encontrado');

        const abertos = await Loan.count({ where: { bookId: id, returnDate: null } });
        if (abertos > 0) {
            throw erro(409, 'Não é possível excluir: o livro possui empréstimos em aberto');
        }
        await book.destroy();
    }
};

module.exports = bookService;
