/**
 * Hosaka supported Docker labels.
 */
module.exports = {

    /**
     * Should the container be tracked? (true | false).
     */
    wudWatch: 'hosaka.watch',

    /**
     * Optional regex indicating what tags to consider.
     */
    wudTagInclude: 'hosaka.tag.include',

    /**
     * Optional regex indicating what tags to not consider.
     */
    wudTagExclude: 'hosaka.tag.exclude',

    /**
     * Optional transform function to apply to the tag.
     */
    wudTagTransform: 'hosaka.tag.transform',

    /**
     * Should container digest be tracked? (true | false).
     */
    wudWatchDigest: 'hosaka.watch.digest',

    /**
     * Optional templated string pointing to a browsable link.
     */
    wudLinkTemplate: 'hosaka.link.template',

    /**
     * Optional friendly name to display.
     */
    wudDisplayName: 'hosaka.display.name',

    /**
     * Optional friendly icon to display.
     */
    wudDisplayIcon: 'hosaka.display.icon',

};
