
const authService = require('./auth.service');

const authController = {

    async login(req, res) {
        try {
            const { email, password } = req.body;

            const tokens = await authService.login(email, password);

            res.json(tokens);

        } catch (error) {
            res.status(401).json({ error: error.message });
        }
    },

    async refresh(req, res) {
        try {
            const { refreshToken } = req.body;

            const tokens = await authService.refresh(refreshToken);

            res.json(tokens);

        } catch (error) {
            res.status(401).json({ error: error.message });
        }
    },

    async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            await authService.logout(refreshToken);
            res.json({ message: 'Logout realizado com sucesso.' });
        } catch (error) {
            res.status(401).json({ error: error.message });
        }
    },

    async me(req, res) {
        try {
            res.json(await authService.me(req.user.id));
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
};

module.exports = authController;
