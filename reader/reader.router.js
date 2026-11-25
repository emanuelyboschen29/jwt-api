const { Router } = require('express');
const router = Router();

const controller = require('./reader.controller');
const auth = require('../auth/auth.middleware');

// atendente e administrador podem listar, cadastrar e editar leitores
router.get('/', auth, controller.findAll);
router.get('/:id', auth, controller.findById);
router.get('/:id/loans', auth, controller.loans);
router.post('/', auth, controller.create);
router.put('/:id', auth, controller.update);

module.exports = router;
