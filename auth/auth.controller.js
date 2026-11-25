
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
    }
};

module.exports = authController;
