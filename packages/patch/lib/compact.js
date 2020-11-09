"use strict";

/**
 * Finds the operation to be cancelled given a regex pattern
 * of the operation name, i.e. "add", "remove", etc.
 * @param {array} operations An array with all operations made in a specific JSON pointer
 * @param {regexp} pattern The regex pattern for operations that can be cancelled
 * @returns {object} The cancelling operation or null if no operation matching the pattern is found
 */
function getCancellingOperation(operations = [], pattern = RegExp()) {
  const cancellingOperation = operations.find(({ op }) => pattern.test(op));
  if (cancellingOperation !== undefined) {
    return cancellingOperation;
  }

  return null;
}

/**
 * Removes the cancelling operation from the given JSON Patch array
 *
 * @param {*} jsonPatch The JSON Patch array from where to remove the cancelling operation
 * @param {*} cancelling The cancelling object to be removed
 */
function removeCancellingOperation(jsonPatch = [], cancelling = {}) {
  jsonPatch.splice(jsonPatch.indexOf(cancelling), 1);
}

const Cancelling = {
  remove: {
    compact(operations = [], jsonPatch = []) {
      const cancelling = getCancellingOperation(operations, /add|replace|copy/);
      if (cancelling) {
        removeCancellingOperation(jsonPatch, cancelling);
        // if the cancelling operation is not "replace", then remove the current ("remove") operation as well
        if (cancelling.op !== "replace") {
          jsonPatch.pop();
        }
      }
    },
  },
  replace: {
    compact(operations = [], jsonPatch, { value }) {
      const cancelling = getCancellingOperation(operations, /replace|copy/);
      // make sure the cancelling "replace" op is not the current operation
      if (cancelling && cancelling.value !== value) {
        removeCancellingOperation(jsonPatch, cancelling);
      }
    },
  },
  copy: {
    compact(operations = [], jsonPatch) {
      const cancelling = getCancellingOperation(operations, /replace/);
      if (cancelling) {
        removeCancellingOperation(jsonPatch, cancelling);
      }
    },
  },
  add: { compact() {} },
  move: { compact() {} },
  test: { compact() {} },
};

/**
 * Compacts a JSON Patch removing all cancelling operations
 * Ex.:
 * [
 *    { "op": "add", "path": "/foo", "value": "bar" },
 *    { "op": "add", "path": "/bar", "value": "baz" },
 *    { "op": "remove", "path": "/foo" }
 * ]
 *
 * becomes:
 * Ex.:
 * [
 *    { "op": "add", "path": "/bar", "value": "baz" },
 * ]
 *
 * @param {Array} jsonPatch The JSON Patch to be compacted
 * @returns {Array} The compacted JSON Patch
 */
function compact(jsonPatch = []) {
  const operations = {};
  const resultJsonPatch = [];

  jsonPatch.forEach(operation => {
    const { op, path } = operation;

    // creates an array of operations for each pointer
    if (operations[path] === undefined) {
      operations[path] = [];
    }

    // stack operations on same pointer, for each pointer
    operations[path].push(operation);
    // stores all operations in resultJsonPatch
    resultJsonPatch.push(operation);

    // Call compact function for the current op inside the Cancelling object
    Cancelling[op].compact(operations[path], resultJsonPatch, operation);
  });

  return resultJsonPatch;
}

module.exports = compact;
