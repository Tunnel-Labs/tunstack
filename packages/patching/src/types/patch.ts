export type PatchFunction = (args: {
	temporaryPatchDirectory: string;
}) => Promise<void>;

export interface Patch {
	patch: PatchFunction;
}
