"use strict";

const compact = require("../lib/compact");
const tests = require("./compact.json");
const assert = require("assert");

describe("compact", () => {
  tests.forEach(test => {
    it(test.description, () => {
      const result = compact(test.input);
      assert.deepEqual(result, test.output);
    });
  });
});
