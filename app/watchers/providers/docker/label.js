/**
 * Hosaka supported Docker labels.
 */
module.exports = {

    /**
     * Should the container be tracked? (true | false).
     */
    hosakaWatch: 'hosaka.watch',

    /**
     * Optional regex indicating what tags to consider.
     */
    hosakaTagInclude: 'hosaka.tag.include',

    /**
     * Optional regex indicating what tags to not consider.
     */
    hosakaTagExclude: 'hosaka.tag.exclude',

    /**
     * Optional transform function to apply to the tag.
     */
    hosakaTagTransform: 'hosaka.tag.transform',

    /**
     * Should container digest be tracked? (true | false).
     */
    hosakaWatchDigest: 'hosaka.watch.digest',

    /**
     * Optional templated string pointing to a browsable link.
     */
    hosakaLinkTemplate: 'hosaka.link.template',

    /**
     * Optional friendly name to display.
     */
    hosakaDisplayName: 'hosaka.display.name',

    /**
     * Optional friendly icon to display.
     */
    hosakaDisplayIcon: 'hosaka.display.icon',

};
