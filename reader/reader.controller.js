const readerService = require('./reader.service');
const { responder } = require('../utils/erro');

const controller = require('../utils/crudController')(readerService);

controller.loans = async (req, res) => {
    try { res.json(await readerService.loans(req.params.id)); }
    catch (error) { responder(res, error); }
};

module.exports = controller;
