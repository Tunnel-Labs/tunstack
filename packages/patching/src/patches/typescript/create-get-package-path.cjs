// @ts-check

const { globSync } = require("glob");
const { getMonorepoDirpath } = require("get-monorepo-root");
const { createTildeImportExpander } = require("tilde-imports");

module.exports = function createGetPackagePath() {
  const monorepoDirpath = getMonorepoDirpath(__dirname);
  if (monorepoDirpath === undefined) {
    throw new Error("Could not find monorepo directory");
  }

  const expandTildeImport = createTildeImportExpander({
    monorepoDirpath,
  });

  return function (directory: string) {
    expandTildeImport({
      importSpecifier: "~",
      importerFilepath: directory,
    });
  };
};
