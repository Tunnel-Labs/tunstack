// @ts-check

// @ts-expect-error: works
const { getMonorepoDirpath } = require('get-monorepo-root');
// @ts-expect-error: works
const { createTildeImportExpander } = require('tilde-imports');

module.exports = function createGetPackagePath() {
	const monorepoDirpath = getMonorepoDirpath(__dirname);
	if (monorepoDirpath === undefined) {
		throw new Error('Could not find monorepo directory');
	}

	const expandTildeImport = createTildeImportExpander({
		monorepoDirpath
	});

	/** @param {string} directory */
	return function (directory) {
		const expandedTildeImport = expandTildeImport({
			importSpecifier: '~',
			importerFilepath: directory
		});

		return expandedTildeImport;
	};
};
