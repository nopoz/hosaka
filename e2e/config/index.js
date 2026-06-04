module.exports = {
    protocol: process.env.HOSAKA_PROTOCOL || 'http',
    host: process.env.HOSAKA_HOST || 'localhost',
    port: process.env.HOSAKA_PORT || 3000,
    username: process.env.HOSAKA_USERNAME || 'john',
    password: process.env.HOSAKA_PASSWORD || 'doe',
};
