"use strict";

const decode = require("json8-pointer").decode;
const buildRevertPatch = require("./buildRevertPatch");

const operations = Object.create(null);
operations.add = require("./add");
operations.copy = require("./copy");
operations.move = require("./move");
operations.remove = require("./remove");
operations.replace = require("./replace");
operations.test = require("./test");

/**
 * @typedef PatchResult
 * @type Object
 * @property {Any}   doc     - The patched document
 * @property {Array} revert  - An array to be used with revert or buildRevertPatch methods
 */

/**
 * Apply a single JSON Patch operation object to a JSON document
 * @param  {Any}    doc    - JSON document to apply the patch to
 * @param  {Object} patch  - JSON Patch operation object
 * @return {Any}
 */
function run(doc, patch) {
  const pathTokens = typeof patch.path === "string" ? decode(patch.path) : null;
  const fromTokens = typeof patch.from === "string" ? decode(patch.from) : null;

  switch (patch.op) {
    case "add":
    case "replace":
    case "test":
      if (patch.value === undefined) throw new Error("Missing value parameter");
      return operations[patch.op](doc, pathTokens, patch.value);

    case "move":
    case "copy":
      return operations[patch.op](doc, fromTokens, pathTokens);

    case "remove":
      return operations[patch.op](doc, pathTokens);
  }

  throw new Error(patch.op + " isn't a valid operation");
}

/**
 * Apply a JSON Patch to a JSON document
 * @param  {Any}          doc                 - JSON document to apply the patch to
 * @param  {Array}        patch               - JSON Patch array
 * @param  {Object}       options             - options
 * @param  {Boolean}      options.reversible  - return an array to revert
 * @return {PatchResult}
 */
function apply(doc, patch, options) {
  if (!Array.isArray(patch))
    throw new Error("Invalid argument, patch must be an array");

  const done = [];

  for (let i = 0, len = patch.length; i < len; i++) {
    const p = patch[i];
    let r;

    try {
      r = run(doc, p);
    } catch (err) {
      // restore document
      // does not use ./revert.js because it is a circular dependency
      const revertPatch = buildRevertPatch(done);
      apply(doc, revertPatch);
      throw err;
    }

    doc = r.doc;
    done.push([p, r.previous, r.idx]);
  }

  const result = { doc: doc };

  if (options && typeof options === "object" && options.reversible === true)
    result.revert = done;

  return result;
}

module.exports = apply;
