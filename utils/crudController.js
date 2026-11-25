const { responder } = require('./erro');

// controller padrão: serve para qualquer recurso que tenha um service com
// findAll, findById, create, update e delete
module.exports = (service) => ({
    findAll: async (req, res) => {
        try { res.json(await service.findAll(req.query)); }
        catch (error) { responder(res, error); }
    },
    findById: async (req, res) => {
        try { res.json(await service.findById(req.params.id)); }
        catch (error) { responder(res, error); }
    },
    create: async (req, res) => {
        try { res.status(201).json(await service.create(req.body)); }
        catch (error) { responder(res, error); }
    },
    update: async (req, res) => {
        try { res.json(await service.update(req.params.id, req.body)); }
        catch (error) { responder(res, error); }
    },
    delete: async (req, res) => {
        try { await service.delete(req.params.id); res.status(204).send(); }
        catch (error) { responder(res, error); }
    }
});
