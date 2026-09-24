const app = require('express').Router();
const fs = require('fs');
const path = require('path');
const {brandingFolder} = require("../utils/file");
const {isSetupComplete} = require("../utils/auth");

const readBranding = (fileName) => {
    const file = fs.readFileSync(path.join(brandingFolder, fileName));
    return Buffer.from(file).toString('base64');
}

const safeReadJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
const packageJson = require("../../package.json");

app.get('/', (req, res) => {
    const brandingPayload = safeReadJson(path.join(brandingFolder, "branding.json"));
    res.json({
        logo: readBranding("logo.png"),
        title: readBranding("title.png"),
        ...brandingPayload,
        setupComplete: isSetupComplete(),
        version: packageJson.version
    });
});

module.exports = app;