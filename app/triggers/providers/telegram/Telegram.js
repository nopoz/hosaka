const rp = require('../../../request');
const Trigger = require('../Trigger');

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';

/**
 * Telegram Trigger implementation
 */
class Telegram extends Trigger {
    /**
     * Get the Trigger configuration schema.
     * @returns {*}
     */
    getConfigurationSchema() {
        return this.joi.object().keys({
            bottoken: this.joi.string().required(),
            chatid: this.joi.string().required(),
        });
    }

    /**
     * Sanitize sensitive data
     * @returns {*}
     */
    maskConfiguration() {
        return {
            ...this.configuration,
            bottoken: Telegram.mask(this.configuration.bottoken),
            chatid: Telegram.mask(this.configuration.chatid),
        };
    }

    /**
     * Init trigger.
     * @returns {Promise<void>}
     */
    async initTrigger() {
        // Nothing to init; messages are sent over the Telegram Bot HTTP API.
    }

    /*
     * Post a message with new image version details.
     *
     * @param image the image
     * @returns {Promise<void>}
     */
    async trigger(container) {
        return this.sendMessage(this.renderSimpleBody(container));
    }

    async triggerBatch(containers) {
        return this.sendMessage(this.renderBatchBody(containers));
    }

    /**
     * Post a message to a Slack channel.
     * @param text the text to post
     * @returns {Promise<>}
     */
    async sendMessage(text) {
        return rp({
            method: 'POST',
            uri: `${TELEGRAM_API_BASE_URL}/bot${this.configuration.bottoken}/sendMessage`,
            headers: { 'Content-Type': 'application/json' },
            body: {
                chat_id: this.configuration.chatid,
                text,
            },
        });
    }
}

module.exports = Telegram;
