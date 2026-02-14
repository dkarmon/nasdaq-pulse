// ABOUTME: Tests middleware auth routing for protected and signin pages.
// ABOUTME: Prevents redirect ping-pong between /signin and /pulse.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const mockCreateServerClient = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

function setMockUser(user: { id: string } | null) {
  mockCreateServerClient.mockReturnValue({
    auth: {
      getUser: vi.fn(async () => ({ data: { user } })),
    },
  });
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated protected requests to locale signin", async () => {
    setMockUser(null);

    const request = new NextRequest("http://localhost/en/pulse");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/en/signin");
  });

  it("redirects authenticated signin requests to locale pulse", async () => {
    setMockUser({ id: "user-1" });

    const request = new NextRequest("http://localhost/he/signin");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/he/pulse");
  });

  it("allows unauthenticated signin requests", async () => {
    setMockUser(null);

    const request = new NextRequest("http://localhost/en/signin");
    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
