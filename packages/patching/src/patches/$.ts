import patchExports from 'glob[files]:./**/$patch.ts';
import mapObject from 'map-obj';
import path from 'pathe';

export const patches = mapObject(
	patchExports,
	(patchRelativeFilePath, patch) => [
		path.dirname(
			path.relative('packages/patching/src/patches', patchRelativeFilePath)
		),
		patch.default
	]
) as {
	[K in keyof typeof patchExports as K extends `packages/patching/src/patches/${infer Id}/$patch.ts`
		? Id
		: never]: (typeof patchExports)[K]['default'];
};
