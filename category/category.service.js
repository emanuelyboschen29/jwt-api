const { Category, Book } = require('../models');
const { erro } = require('../utils/erro');

const CAMPOS = ['name', 'description'];

const categoryService = {
    findAll: async () => Category.findAll(),

    findById: async (id) => {
        const category = await Category.findByPk(id);
        if (!category) throw erro(404, 'Categoria não encontrada');
        return category;
    },

    create: async (data) => Category.create(data, { fields: CAMPOS }),

    update: async (id, data) => {
        const category = await categoryService.findById(id);
        return category.update(data, { fields: CAMPOS });
    },

    // regra 6: não exclui se houver livros vinculados
    delete: async (id) => {
        const category = await categoryService.findById(id);
        const total = await Book.count({ where: { categoryId: id } });
        if (total > 0) {
            throw erro(409, 'Não é possível excluir: a categoria possui livros vinculados');
        }
        await category.destroy();
    }
};

module.exports = categoryService;
