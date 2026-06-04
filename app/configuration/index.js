const fs = require('fs');
const joi = require('joi');
const setValue = require('set-value');

const VAR_FILE_SUFFIX = '__FILE';

/*
* Get a prop by path from environment variables.
* @param prop
* @returns {{}}
*/
function get(prop, env = process.env) {
    const object = {};
    const envVarPattern = prop.replace(/\./g, '_').toUpperCase();
    const matchingEnvVars = Object.keys(env).filter((envKey) => envKey.startsWith(envVarPattern));
    matchingEnvVars.forEach((matchingEnvVar) => {
        const envVarValue = env[matchingEnvVar];
        const matchingPropPath = matchingEnvVar.replace(/_/g, '.').toLowerCase();
        const matchingPropPathWithoutPrefix = matchingPropPath.replace(`${prop}.`, '');
        setValue(object, matchingPropPathWithoutPrefix, envVarValue);
    });
    return object;
}

/**
 * Lookup external secrets defined in files.
 * @param hosakaEnvVars
 */
/* eslint-disable no-param-reassign */
function replaceSecrets(hosakaEnvVars) {
    const secretFileEnvVars = Object.keys(hosakaEnvVars)
        .filter((hosakaEnvVar) => hosakaEnvVar.toUpperCase().endsWith(VAR_FILE_SUFFIX));
    secretFileEnvVars.forEach((secretFileEnvVar) => {
        const secretKey = secretFileEnvVar.replace(VAR_FILE_SUFFIX, '');
        const secretFilePath = hosakaEnvVars[secretFileEnvVar];
        const secretFileValue = fs.readFileSync(secretFilePath, 'utf-8');
        delete hosakaEnvVars[secretFileEnvVar];
        hosakaEnvVars[secretKey] = secretFileValue;
    });
}

// 1. Get a copy of all hosaka related env vars
const hosakaEnvVars = {};
Object.keys(process.env)
    .filter((envVar) => envVar.toUpperCase().startsWith('HOSAKA'))
    .forEach((hosakaEnvVar) => {
        hosakaEnvVars[hosakaEnvVar] = process.env[hosakaEnvVar];
    });

// 2. Replace all secret files referenced by their secret values
replaceSecrets(hosakaEnvVars);

function getVersion() {
    return hosakaEnvVars.HOSAKA_VERSION || 'unknown';
}

function getLogLevel() {
    return hosakaEnvVars.HOSAKA_LOG_LEVEL || 'info';
}
/**
 * Get watcher configuration.
 */
function getWatcherConfigurations() {
    return get('hosaka.watcher', hosakaEnvVars);
}

/**
 * Get trigger configurations.
 */
function getTriggerConfigurations() {
    return get('hosaka.trigger', hosakaEnvVars);
}

/**
 * Get registry configurations.
 * @returns {*}
 */
function getRegistryConfigurations() {
    return get('hosaka.registry', hosakaEnvVars);
}

/**
 * Get authentication configurations.
 * @returns {*}
 */
function getAuthenticationConfigurations() {
    return get('hosaka.auth', hosakaEnvVars);
}

/**
 * Get Input configurations.
 */
function getStoreConfiguration() {
    return get('hosaka.store', hosakaEnvVars);
}

/**
 * Get Server configurations.
 */
function getServerConfiguration() {
    const configurationFromEnv = get('hosaka.server', hosakaEnvVars);
    const configurationSchema = joi.object().keys({
        enabled: joi.boolean().default(true),
        port: joi.number().default(3000).integer().min(0)
            .max(65535),
        tls: joi.object({
            enabled: joi.boolean().default(false),
            key: joi.string().when('enabled', { is: true, then: joi.required(), otherwise: joi.optional() }),
            cert: joi.string().when('enabled', { is: true, then: joi.required(), otherwise: joi.optional() }),
        }).default({}),
        cors: joi.object({
            enabled: joi.boolean().default(false),
            origin: joi.string().default('*'),
            methods: joi.string().default('GET,HEAD,PUT,PATCH,POST,DELETE'),
        }).default({}),
        feature: joi.object({
            delete: joi.boolean().default(true),
        }).default({
            delete: true,
        }),
    });

    // Validate Configuration
    const configurationToValidate = configurationSchema.validate(configurationFromEnv || {});
    if (configurationToValidate.error) {
        throw configurationToValidate.error;
    }
    return configurationToValidate.value;
}

function getPublicUrl(req) {
    const publicUrl = hosakaEnvVars.HOSAKA_PUBLIC_URL;
    if (publicUrl) {
        return publicUrl;
    }
    // Try to guess from request
    return `${req.protocol}://${req.hostname}`;
}

module.exports = {
    hosakaEnvVars,
    get,
    replaceSecrets,
    getVersion,
    getLogLevel,
    getStoreConfiguration,
    getWatcherConfigurations,
    getTriggerConfigurations,
    getRegistryConfigurations,
    getAuthenticationConfigurations,
    getServerConfiguration,
    getPublicUrl,
};
