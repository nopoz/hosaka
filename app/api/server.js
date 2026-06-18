const express = require('express');
const nocache = require('nocache');
const { getServerConfiguration, getAiPublicConfiguration } = require('../configuration');

const router = express.Router();

/**
 * Get store infos.
 * @param req
 * @param res
 */
function getServer(req, res) {
    res.status(200).json({
        configuration: {
            ...getServerConfiguration(),
            ai: getAiPublicConfiguration(),
        },
    });
}

/**
 * Init Router.
 * @returns {*}
 */
function init() {
    router.use(nocache());
    router.get('/', getServer);
    return router;
}

module.exports = {
    init,
};
