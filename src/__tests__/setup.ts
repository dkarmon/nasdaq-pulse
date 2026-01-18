// ABOUTME: Test setup file for Vitest.
// ABOUTME: Configures globals and mocks needed for testing.

import "@testing-library/react";

// Mock next/headers for server component tests
vi.mock("next/headers", () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: () => null,
    set: () => {},
  }),
}));
