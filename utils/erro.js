// cria um erro com código HTTP (404, 409...)
const erro = (status, message) => Object.assign(new Error(message), { status });

// responde ao cliente com o código certo
const responder = (res, error) => {
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Já existe um registro com esse valor (campo único)' });
    }
    res.status(error.status || 400).json({ error: error.message });
};

module.exports = { erro, responder };
