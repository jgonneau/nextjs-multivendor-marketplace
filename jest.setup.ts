import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";

Object.assign(global, { TextDecoder, TextEncoder });

// A test that never reaches an assertion fails instead of silently passing.
beforeEach(() => {
  expect.hasAssertions();
});
