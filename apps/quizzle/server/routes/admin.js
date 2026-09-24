const app = require('express').Router();
const {requireAdmin} = require('../middleware/auth');
const {getUsers, createUser, deleteUser, updateUserRole, changePassword} = require('../utils/auth');
const fs = require('fs');
const path = require('path');
const {brandingFolder} = require('../utils/file');
const {createProvider} = require('../utils/ai');

app.post('/models', requireAdmin, async (req, res) => {
    const {provider, apiKey, baseUrl} = req.body;
    if (!provider) return res.status(400).json({message: 'Provedor é obrigatório.'});

    const instance = createProvider({provider, apiKey, baseUrl});
    if (!instance) return res.status(400).json({message: 'Provedor inválido.'});

    try {
        const models = await instance.listModels();
        res.json({models});
    } catch {
        res.json({models: []});
    }
});

const safeReadJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));

app.get('/settings', requireAdmin, (req, res) => {
    const configPayload = safeReadJson(path.join(brandingFolder, 'config.json'));
    const brandingPayload = safeReadJson(path.join(brandingFolder, 'branding.json'));

    res.json({
        config: {
            ai: configPayload.ai || {provider: '', apiKey: '', model: '', baseUrl: ''},
            media: configPayload.media || {unsplashAccessKey: '', giphyApiKey: ''}
        },
        branding: brandingPayload
    });
});

app.put('/settings', requireAdmin, (req, res) => {
    const {config, branding} = req.body;

    if (config) {
        const configPath = path.join(brandingFolder, 'config.json');
        const existing = safeReadJson(configPath);

        if (config.ai) {
            existing.ai = {
                provider: config.ai.provider || '',
                apiKey: config.ai.apiKey || '',
                model: config.ai.model || '',
                baseUrl: config.ai.baseUrl || ''
            };
        }

        if (config.media) {
            existing.media = {
                unsplashAccessKey: config.media.unsplashAccessKey || '',
                giphyApiKey: config.media.giphyApiKey || ''
            };
        }

        delete existing.password;

        fs.writeFileSync(configPath, JSON.stringify(existing, null, 2), 'utf8');

        delete require.cache[require.resolve(configPath)];
    }

    if (branding) {
        const brandingPath = path.join(brandingFolder, 'branding.json');
        const existing = safeReadJson(brandingPath);

        for (const key of ['name', 'color', 'imprint', 'privacy']) {
            if (branding[key] !== undefined) existing[key] = branding[key];
        }

        fs.writeFileSync(brandingPath, JSON.stringify(existing, null, 2), 'utf8');
        delete require.cache[require.resolve(brandingPath)];
    }

    res.json({success: true});
});

app.put('/branding/:type', requireAdmin, (req, res) => {
    const {type} = req.params;

    if (type !== 'logo' && type !== 'title') {
        return res.status(400).json({message: 'Tipo de imagem inválido.'});
    }

    const {image} = req.body;

    if (!image || typeof image !== 'string') {
        return res.status(400).json({message: 'Nenhuma imagem enviada.'});
    }

    const match = image.match(/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,(.+)$/);
    if (!match) {
        return res.status(400).json({message: 'Formato de imagem inválido. Permitido: PNG, JPEG, GIF, WebP, SVG.'});
    }

    const buffer = Buffer.from(match[2], 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({message: 'A imagem é muito grande (máx. 5 MB).'});
    }

    const filePath = path.join(brandingFolder, `${type}.png`);
    fs.writeFileSync(filePath, buffer);

    res.json({success: true});
});

app.delete('/branding/:type', requireAdmin, (req, res) => {
    const {type} = req.params;

    if (type !== 'logo' && type !== 'title') {
        return res.status(400).json({message: 'Tipo de imagem inválido.'});
    }

    const defaultPath = path.join(process.cwd(), 'content', `${type}.png`);
    const targetPath = path.join(brandingFolder, `${type}.png`);

    if (!fs.existsSync(defaultPath)) {
        return res.status(404).json({message: 'Imagem padrão não encontrada.'});
    }

    fs.copyFileSync(defaultPath, targetPath);
    res.json({success: true});
});

app.get('/users', requireAdmin, (req, res) => {
    res.json({users: getUsers()});
});

app.post('/users', requireAdmin, (req, res) => {
    const {username, password, role} = req.body;

    if (!username || !password) {
        return res.status(400).json({message: 'Nome de usuário e senha são obrigatórios.'});
    }

    if (username.length < 3 || username.length > 32) {
        return res.status(400).json({message: 'O nome de usuário deve ter entre 3 e 32 caracteres.'});
    }

    if (password.length < 6) {
        return res.status(400).json({message: 'A senha deve ter no mínimo 6 caracteres.'});
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
        return res.status(400).json({message: 'O nome de usuário pode conter apenas letras, números, pontos, hífens e sublinhados.'});
    }

    if (role && !['admin', 'teacher'].includes(role)) {
        return res.status(400).json({message: 'Função inválida.'});
    }

    const result = createUser(username, password, role || 'teacher');
    if (result.error) {
        return res.status(400).json({message: result.error});
    }

    res.json(result);
});

app.delete('/users/:userId', requireAdmin, (req, res) => {
    const {userId} = req.params;

    if (userId === req.user.id) {
        return res.status(400).json({message: 'Você não pode excluir sua própria conta.'});
    }

    const result = deleteUser(userId);
    if (result.error) {
        return res.status(400).json({message: result.error});
    }

    res.json(result);
});

app.put('/users/:userId/role', requireAdmin, (req, res) => {
    const {userId} = req.params;
    const {role} = req.body;

    if (!role || !['admin', 'teacher'].includes(role)) {
        return res.status(400).json({message: 'Função inválida.'});
    }

    if (userId === req.user.id) {
        return res.status(400).json({message: 'Você não pode alterar sua própria função.'});
    }

    const result = updateUserRole(userId, role);
    if (result.error) {
        return res.status(400).json({message: result.error});
    }

    res.json(result);
});

app.put('/users/:userId/password', requireAdmin, (req, res) => {
    const {userId} = req.params;
    const {password} = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({message: 'A senha deve ter no mínimo 6 caracteres.'});
    }

    const result = changePassword(userId, password);
    if (result.error) {
        return res.status(400).json({message: result.error});
    }

    res.json(result);
});

module.exports = app;
