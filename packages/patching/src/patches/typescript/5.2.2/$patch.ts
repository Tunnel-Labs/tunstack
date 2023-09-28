import fs from 'node:fs';

import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import * as acorn from 'acorn';
import { join } from 'desm';
import { walk } from 'estree-walker';
import { outdent } from 'outdent';
import path from 'pathe';
import { rollup } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';

import { definePatch } from '~/utils/patch.ts';

export default definePatch({
	async patch({ temporaryPatchDirectory }) {
		const createBundle = async (input: string) => {
			const bundle = await rollup({
				input,
				plugins: [
					(esbuild.default ?? esbuild)({
						loaders: {
							'.ts': 'ts'
						},
						minify: true
					}),
					nodeResolve({ preferBuiltins: true, browser: false }),
					(commonjs.default ?? commonjs)()
				]
			});
			const { output } = await bundle.generate({
				format: 'commonjs'
			});
			return output[0].code;
		};

		const createReadFileWrapperCode = await createBundle(
			join(import.meta.url, '../create-read-file-wrapper.cjs')
		);
		const createFileExistsWrapperCode = await createBundle(
			join(import.meta.url, '../create-file-exists-wrapper.cjs')
		);
		const createDirectoryExistsWrapperCode = await createBundle(
			join(import.meta.url, '../create-directory-exists-wrapper.cjs')
		);

		const getPatchedJs = (js: string) => {
			const typescriptAst = acorn.parse(js, {
				ecmaVersion: 2022
			}) as any;
			const replacements: { start: number; end: number; value: string }[] = [];
			walk(typescriptAst, {
				enter(node: any) {
					if (
						node.type === 'VariableDeclarator' &&
						node.id?.name === 'nodeSystem' &&
						node.init?.type === 'ObjectExpression'
					) {
						const fileExistsProperty = node.init.properties.find(
							(property: any) => property.key?.name === 'fileExists'
						);
						if (fileExistsProperty === undefined) {
							throw new Error('`fileExists` property not found.');
						}

						replacements.push({
							start: fileExistsProperty.start,
							end: fileExistsProperty.end,
							value: `fileExists: ((module) => {${createFileExistsWrapperCode};return module.exports()})({})`
						});

						const directoryExistsProperty = node.init.properties.find(
							(property: any) => property.key?.name === 'directoryExists'
						);
						if (directoryExistsProperty === undefined) {
							throw new Error('`directoryExists` property not found.');
						}

						replacements.push({
							start: directoryExistsProperty.start,
							end: directoryExistsProperty.end,
							value: `directoryExists: ((module) => {${createDirectoryExistsWrapperCode};return module.exports()})({})`
						});

						const readFileProperty = node.init.properties.find(
							(property: any) => property.key?.name === 'readFile'
						);
						if (readFileProperty === undefined) {
							throw new Error('`readFile` property not found.');
						}

						replacements.push({
							start: readFileProperty.start,
							end: readFileProperty.end,
							value: `readFile: ((module) => {${createReadFileWrapperCode};return module.exports()})({})`
						});
					}
				}
			});

			// Sort replacements by start index
			replacements.sort((a, b) => a.start - b.start);

			/** @type {string[]} */
			const newJsParts = [];
			let previousEnd = 0;
			for (const replacement of replacements) {
				newJsParts.push(
					js.slice(previousEnd, replacement.start),
					replacement.value
				);
				previousEnd = replacement.end;
			}

			newJsParts.push(js.slice(previousEnd));

			return (
				newJsParts
					.join('')
					// Needed to prevent the error "File '/Users/leondreamed/projects/Tunnel-Labs/Tunnel/devops/aws/src/cdk/stacks/*.ts/__virtual__:matches.ts' is not listed within the file list of project '/Users/leondreamed/projects/Tunnel-Labs/Tunnel/tsconfig.json'. Projects must list all files or use an 'include' pattern."
					.replace(
						'if (sourceFileMayBeEmitted(file, program) && !rootPaths.has(file.path)) {',
						() =>
							`if (!require('path').basename(file.path).startsWith('__virtual__:') && require('path').basename(file.path) !== 'package.json' && sourceFileMayBeEmitted(file, program) && !rootPaths.has(file.path)) {`
					)
					// Needed to support package-based relative paths in the root `tsconfig.json` file using a custom `<packagePath>` variable
					.replace(
						'const path = matchedStar ? subst.replace("*", matchedStar) : subst;',
						() => outdent`
							const unreplacedPath = (matchedStar ? subst.replace("*", matchedStar) : subst);
							let path;
							if (unreplacedPath.includes('./<packagePath>')) {
								const match = /^.*\\/tunnel\\/[^\\/]+\\/[^\\/]+\\/?/.exec(state.requestContainingDirectory.toLowerCase());
								path = unreplacedPath.replace('./<packagePath>', state.requestContainingDirectory.slice(0, match.index + match[0].length))
							} else {
								path = unreplacedPath
							}

							if (path.includes('./<dirname>')) {
								path = path.replace(
									'./<dirname>',
									state.requestContainingDirectory
								)
							}
						`
					)
			);
		};

		const [
			originalTscJs,
			originalTypescriptJs,
			originalTsserverJs,
			originalTsserverlibraryJs
		] = await Promise.all([
			fs.promises.readFile(
				path.join(temporaryPatchDirectory, 'lib/tsc.js'),
				'utf8'
			),
			fs.promises.readFile(
				path.join(temporaryPatchDirectory, 'lib/typescript.js'),
				'utf8'
			),
			fs.promises.readFile(
				path.join(temporaryPatchDirectory, 'lib/tsserver.js'),
				'utf8'
			),
			fs.promises.readFile(
				path.join(temporaryPatchDirectory, 'lib/tsserverlibrary.js'),
				'utf8'
			)
		]);

		await Promise.all([
			fs.promises.writeFile(
				path.join(temporaryPatchDirectory, 'lib/tsc.js'),
				getPatchedJs(originalTscJs)
			),
			fs.promises.writeFile(
				path.join(temporaryPatchDirectory, 'lib/typescript.js'),
				getPatchedJs(originalTypescriptJs)
			),
			fs.promises.writeFile(
				path.join(temporaryPatchDirectory, 'lib/tsserver.js'),
				getPatchedJs(originalTsserverJs)
			),
			fs.promises.writeFile(
				path.join(temporaryPatchDirectory, 'lib/tsserverlibrary.js'),
				getPatchedJs(originalTsserverlibraryJs)
			)
		]);
	}
});
