// @ts-check

const path = require('node:path');

module.exports = function createFileExistsWrapper() {
	/** @param {string} filepath */
	return function (filepath) {
		if (path.basename(filepath).startsWith('__virtual__:')) {
			return true;
		}

		// @ts-expect-error: This function is defined in the TypeScript patch file
		// eslint-disable-next-line no-undef -- This function is defined in the TypeScript patch file
		return fileExists(filepath);
	};
};
