// @ts-check

const path = require('pathe');
const { globSync } = require('glob');
// @ts-expect-error: bad typings
const trimExtension = require('trim-extension');
// @ts-expect-error: works
const { getMonorepoDirpath } = require('get-monorepo-root');
const {
	getMonorepoPackagesDirpathsSync
	// @ts-expect-error: works
} = require('@ts-monorepo/get-monorepo-packages');

module.exports = function createReadFileWrapper() {
	const monorepoDirpath = getMonorepoDirpath(__dirname);
	if (monorepoDirpath === undefined) {
		throw new Error('Could not find monorepo directory');
	}

	const monorepoPackagesDirpaths = getMonorepoPackagesDirpathsSync({
		monorepoDirpath
	});

	/** @param {string} filepath */
	const pathToIdentifier = (filepath) =>
		`__${filepath.replaceAll(/[^\w$]/g, '_')}`;

	// @ts-expect-error: This function is defined in the TypeScript patch file
	// eslint-disable-next-line no-undef -- This function is defined in the TypeScript patch file
	const _readFile = readFile;

	/**
		@param {string} filepath
	*/
	return function (filepath) {
		if (/tsconfig\..*\.json$/.test(path.basename(filepath))) {
			const tsconfig = JSON.parse(_readFile(filepath));
			if (tsconfig.tsconfigInclude !== undefined) {
				tsconfig.include ??= [];
				const tsconfigIncludes = [tsconfig.tsconfigInclude].flat();

				for (const monorepoPackageDirpath of monorepoPackagesDirpaths) {
					const monorepoPackageJson = JSON.parse(
						_readFile(path.join(monorepoPackageDirpath, 'package.json'))
					);

					if (
						tsconfigIncludes.some(
							(tsconfigInclude) =>
								(tsconfigInclude === 'default' &&
									monorepoPackageJson.tsconfig === undefined) ||
								monorepoPackageJson.tsconfig === tsconfigInclude
						)
					) {
						tsconfig.include.push(
							path.relative(monorepoDirpath, monorepoPackageDirpath) + '/**/*'
						);
					}
				}

				delete tsconfig.tsconfigInclude;
			}

			return JSON.stringify(tsconfig, null, '\t');
		} else if (path.basename(filepath).startsWith('__virtual__:')) {
			const virtualFileType = /** @type {'matches' | 'files' | 'filepaths'} */ (
				(trimExtension.default ?? trimExtension)(
					path.basename(filepath).replace('__virtual__:', '')
				)
			);

			const globPattern = path.dirname(filepath);

			// To support glob-based imports from TypeScript, we create a virtual file containing the imports
			const matchedFilePaths = globSync(globPattern, {
				absolute: true
			});

			const virtualFileContentLines = [];

			switch (virtualFileType) {
				case 'files': {
					for (const matchedFilePath of matchedFilePaths) {
						const relativeFilePath = path.relative(
							monorepoDirpath,
							matchedFilePath
						);
						const identifier = pathToIdentifier(relativeFilePath);
						virtualFileContentLines.push(
							`import * as ${identifier} from ${JSON.stringify(
								matchedFilePath
							)};`
						);
					}

					virtualFileContentLines.push('export default {');

					for (const matchedFilePath of matchedFilePaths) {
						const relativeFilePath = path.relative(
							monorepoDirpath,
							matchedFilePath
						);
						const identifier = pathToIdentifier(relativeFilePath);
						virtualFileContentLines.push(
							`${JSON.stringify(relativeFilePath)}: ${identifier},`
						);
					}

					virtualFileContentLines.push('};');
					break;
				}

				case 'matches': {
					virtualFileContentLines.push(
						...matchedFilePaths.map(
							(matchedFilePath) =>
								`export * from ${JSON.stringify(matchedFilePath)};`
						)
					);
					break;
				}

				case 'filepaths': {
					virtualFileContentLines.push('export default {');

					for (const matchedFilePath of matchedFilePaths) {
						const relativeFilePath = path.relative(
							monorepoDirpath,
							matchedFilePath
						);
						virtualFileContentLines.push(
							`${JSON.stringify(relativeFilePath)}: true,`
						);
					}

					virtualFileContentLines.push('};');
					break;
				}

				default: {
					throw new Error(`Unknown virtual file type: ${virtualFileType}`);
				}
			}

			virtualFileContentLines.push('export {};');
			return virtualFileContentLines.join('\n');
		} else {
			return _readFile(filepath);
		}
	};
};
