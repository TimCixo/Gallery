import test from "node:test";
import assert from "node:assert/strict";
import { normalizePageJumpInput } from "../features/shared/utils/pagination.js";

test("normalizePageJumpInput rejects invalid values", () => {
  assert.deepEqual(normalizePageJumpInput("abc", 3, 10), {
    isValid: false,
    targetPage: 3
  });
});

test("normalizePageJumpInput clamps lower and upper bounds", () => {
  assert.deepEqual(normalizePageJumpInput("-5", 3, 10), {
    isValid: true,
    targetPage: 1
  });
  assert.deepEqual(normalizePageJumpInput("99", 3, 10), {
    isValid: true,
    targetPage: 10
  });
});

test("normalizePageJumpInput keeps valid in-range value", () => {
  assert.deepEqual(normalizePageJumpInput("4", 1, 10), {
    isValid: true,
    targetPage: 4
  });
});
