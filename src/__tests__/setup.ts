// ABOUTME: Test setup file for Vitest.
// ABOUTME: Configures globals and mocks needed for testing.

import "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock next/headers for server component tests
vi.mock("next/headers", () => ({
  headers: () => new Map(),
  cookies: () => ({
    get: () => null,
    set: () => {},
  }),
}));

// Mock matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for chart components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
