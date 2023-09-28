// @ts-check

const { globSync } = require('glob');

module.exports = function createDirectoryExistsWrapper() {
	/** @param {string} directoryPath */
	return function (directoryPath) {
		// @ts-expect-error: This function is defined in the TypeScript patch file
		// eslint-disable-next-line no-undef -- This function is defined in the TypeScript patch file
		if (directoryExists(directoryPath)) {
			return true;
		}

		const globPattern = directoryPath.replace(/\/__virtual__:.*$/, '');
		// We add a "/" to only match directories
		return globSync(globPattern + '/').length > 0;
	};
};
