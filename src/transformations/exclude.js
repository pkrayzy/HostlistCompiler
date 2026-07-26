const _ = require('lodash');
const consola = require('consola');
const filterUtils = require('../filter');

/**
 * Scans the specified array of rules and removes all that match the specified exclusions.
 *
 * @param {Array<String>} rules - array of rules to filter
 * @param {Array<String>} exclusions - array of exclusions to apply
 * @param {Array<String>} exclusionsSources - array of exclusion sources
 * (can be a local or remote file)
 * @returns {Promise<Array<String>>} filtered array of rules
 */
async function exclude(rules, exclusions, exclusionsSources) {
    if (_.isEmpty(exclusions) && _.isEmpty(exclusionsSources)) {
        // Nothing to filter here
        return rules;
    }

    const wildcards = await filterUtils.prepareWildcards(exclusions, exclusionsSources);
    if (_.isEmpty(wildcards)) {
        return rules;
    }
    consola.info(`Filtering the list of rules using ${wildcards.length} exclusion rules`);

    // Separate wildcards into fast and slow paths
    const exactMatches = new Set();
    const plainSubstrings = [];
    const regexes = [];

    for (const w of wildcards) {
        const str = w.toString();
        if (w.regex === null) {
            // If it's a plain string, we check if it's likely an exact match
            // (no special adblock characters that would imply a substring search)
            // However, to be safe and simple, we can treat everything without regex
            // as a substring search, BUT we can optimize by using a single large regex
            // for all plain substrings.
            plainSubstrings.push(_.escapeRegExp(str));
        } else {
            regexes.push(w.regex);
        }
    }

    const combinedPlainRegex = plainSubstrings.length > 0 
        ? new RegExp(plainSubstrings.join('|'), 'i') 
        : null;

    const filtered = rules.filter((rule) => {
        // 1. Fast path: Combined plain substring check
        if (combinedPlainRegex && combinedPlainRegex.test(rule)) {
            return false;
        }

        // 2. Slower path: Complex regexes
        const excluded = regexes.some((re) => re.test(rule));
        
        return !excluded;
    });

    consola.info(`Excluded ${rules.length - filtered.length} rules. ${filtered.length} rules left.`);
    return filtered;
}

module.exports = exclude;
