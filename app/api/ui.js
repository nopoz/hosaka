const path = require('path');
const express = require('express');

/**
 * Init the UI router.
 * @returns {*|Router}
 */
function init() {
    const router = express.Router();
    router.use(express.static(path.join(__dirname, '..', 'ui'), {
        setHeaders: (res, filePath) => {
            // Vite emits content-hashed files under /assets/ => safe to cache
            // forever. Everything else (index.html, service worker, manifest)
            // must revalidate so a new build is picked up.
            if (/[/\\]assets[/\\]/.test(filePath)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            } else {
                res.setHeader('Cache-Control', 'no-cache');
            }
        },
    }));

    // Redirect all 404 to index.html (for vue history mode)
    router.get('/{*splat}', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'ui', 'index.html'));
    });
    return router;
}

module.exports = {
    init,
};
