const { Author } = require('../models');
const { erro } = require('../utils/erro');

const CAMPOS = ['name', 'nationality', 'birthDate'];

const authorService = {
    findAll: async () => Author.findAll(),

    findById: async (id) => {
        const author = await Author.findByPk(id);
        if (!author) throw erro(404, 'Autor não encontrado');
        return author;
    },

    create: async (data) => Author.create(data, { fields: CAMPOS }),

    update: async (id, data) => {
        const author = await authorService.findById(id);
        return author.update(data, { fields: CAMPOS });
    },

    // regra 6: não exclui se houver livros vinculados
    delete: async (id) => {
        const author = await authorService.findById(id);
        const total = await author.countBooks(); // criado pelo Sequelize (relação N:N)
        if (total > 0) {
            throw erro(409, 'Não é possível excluir: o autor possui livros vinculados');
        }
        await author.destroy();
    }
};

module.exports = authorService;
