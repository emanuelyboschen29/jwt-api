const { Router } = require('express');
const router = Router();

const controller = require('./author.controller');
const auth = require('../auth/auth.middleware');

// leitura: qualquer usuário logado | escrita: somente administrador
router.get('/', auth, controller.findAll);
router.get('/:id', auth, controller.findById);
router.post('/', auth, auth.isAdmin, controller.create);
router.put('/:id', auth, auth.isAdmin, controller.update);
router.delete('/:id', auth, auth.isAdmin, controller.delete);

module.exports = router;
