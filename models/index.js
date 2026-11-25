const User = require('../user/user.model');
const Category = require('./category.model');
const Author = require('./author.model');
const Book = require('./book.model');
const Reader = require('./reader.model');
const Loan = require('./loan.model');

// Categoria 1:N Livro
Category.hasMany(Book, { foreignKey: 'categoryId' });
Book.belongsTo(Category, { foreignKey: 'categoryId' });

// Livro N:N Autor (tabela BookAuthor criada automaticamente)
Book.belongsToMany(Author, { through: 'BookAuthor', foreignKey: 'bookId' });
Author.belongsToMany(Book, { through: 'BookAuthor', foreignKey: 'authorId' });

// Empréstimo pertence a Livro, Leitor e User (atendente)
Book.hasMany(Loan, { foreignKey: 'bookId' });
Loan.belongsTo(Book, { foreignKey: 'bookId' });

Reader.hasMany(Loan, { foreignKey: 'readerId' });
Loan.belongsTo(Reader, { foreignKey: 'readerId' });

User.hasMany(Loan, { foreignKey: 'userId' });
Loan.belongsTo(User, { foreignKey: 'userId' });

module.exports = { User, Category, Author, Book, Reader, Loan };