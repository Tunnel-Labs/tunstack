import { cli } from '@t/cli-helpers';
import { packageDirpaths } from '@t/packages-config';
import path from 'pathe';
import * as replace from 'replace-in-file';
import tmp from 'tmp-promise';

import { patches } from '~/patches/$.ts';
import type { Patch } from '~/types/patch.ts';
import { createVariableWhitespaceRegexp } from '~/utils/regex.ts';

export function definePatch(patch: Patch) {
	return patch;
}

export async function generatePatch({
	patchId
}: {
	patchId: keyof typeof patches;
}) {
	const temporaryPatchDirectory = await tmp.dir();
	const lastSlash = patchId.lastIndexOf('/');
	const packageToPatchWithVersion =
		patchId.slice(0, lastSlash) + '@' + patchId.slice(lastSlash + 1);

	await cli.pnpm(
		[
			'patch',
			packageToPatchWithVersion,
			'--edit-dir',
			temporaryPatchDirectory.path,
			'--ignore-existing'
		],
		{ cwd: packageDirpaths.monorepo, stdio: 'inherit' }
	);
	await patches[patchId].patch({
		temporaryPatchDirectory: temporaryPatchDirectory.path
	});
	await cli.pnpm(
		[
			'patch-commit',
			temporaryPatchDirectory.path,
			'--patches-dir',
			path.relative(
				packageDirpaths.monorepo,
				path.join(packageDirpaths.patching, 'generated/patches')
			)
		],
		{
			cwd: packageDirpaths.monorepo,
			stdio: 'inherit',
			env: { NODE_ENV: 'development', SKIP_TUNNEL_POSTINSTALL: '1' }
		}
	);
	// temporaryPatchDirectory.cleanup();
}

export function createPatchFileReplacer({
	temporaryPatchDirectory
}: {
	temporaryPatchDirectory: string;
}) {
	return function (options: Parameters<(typeof replace)['replaceInFile']>[0]) {
		// @ts-expect-error: Bad typings
		return replace.default({
			...options,
			files: [options.files]
				.flat()
				.map((file) => path.join(temporaryPatchDirectory, file)),
			from: [options.from]
				.flat()
				.map((file) =>
					typeof file === 'string' ? createVariableWhitespaceRegexp(file) : file
				)
		});
	};
}
