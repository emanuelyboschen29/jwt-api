const {Router} = require('express');
const router = Router();

const userController = require('./user.controller');
const authMiddleware = require('../auth/auth.middleware');

router.use(authMiddleware, authMiddleware.isAdmin);

router.post('/', userController.create);
router.get('/', userController.findAll);
router.get('/:id', userController.findById);
router.get('/email/:email', userController.findByEmail);
router.put('/:id', userController.update);
router.patch('/:id', userController.update);
router.patch('/:id/active', userController.updateActive);

module.exports = router;