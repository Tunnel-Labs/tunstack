#!/usr/bin/env -S pnpm exec tsx

import { program } from "commander";

import { patches } from "~/patches/$.ts";
import { generatePatch } from "~/utils/patch.ts";

await program
  .requiredOption(
    "--monorepo-dir <monorepoDirpath>",
    "The path to the monorepo directory"
  )
  .requiredOption(
    "--patches-dir <patchesDirpath>",
    "The path to the patches directory"
  )
  .argument(
    "[patch-ids...]",
    "The IDs of the patches to generate. If not provided, all patches will be generates."
  )
  .action(
    async (
      patchIds: string[],
      options: { patchesDir: string; monorepoDir: string }
    ) => {
      const patchIdsToGenerate =
        patchIds.length > 0 ? patchIds : Object.keys(patches);

      for (const patchId of patchIdsToGenerate) {
        console.info(`Generating patch "${patchId}"...`);
        // eslint-disable-next-line no-await-in-loop, @typescript-eslint/no-unnecessary-condition -- We need to apply patches synchronously to prevent race conditions for updating files
        await generatePatch({
          patchId: patchId as keyof typeof patches,
          monorepoDirpath: options.monorepoDir,
          patchesDirpath: options.patchesDir,
        });
        console.info(`Successfully generated patch "${patchId}"!`);
      }
    }
  )
  .parseAsync();
