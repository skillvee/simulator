import { describe, it, expect, vi, beforeEach } from "vitest";
import { notFound, redirect } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

// Mock database
vi.mock("@/server/db", () => ({
  db: {
    scenario: {
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "@/server/db";
import InviteLayout from "./layout";

describe("InviteLayout - scenario language redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects from English to Spanish when scenario is Spanish", async () => {
    // Setup: Spanish scenario accessed via English URL
    const mockScenario = {
      language: "es",
    };
    vi.mocked(db.scenario.findUnique).mockResolvedValue(mockScenario as never);

    const params = Promise.resolve({
      locale: "en",
      scenarioId: "spanish-scenario-123",
    });

    // Act
    await InviteLayout({
      children: <div>Test</div>,
      params,
    });

    // Assert: Should redirect to Spanish URL
    expect(redirect).toHaveBeenCalledWith("/es/invite/spanish-scenario-123");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("redirects from Spanish to English when scenario is English", async () => {
    // Setup: English scenario accessed via Spanish URL
    const mockScenario = {
      language: "en",
    };
    vi.mocked(db.scenario.findUnique).mockResolvedValue(mockScenario as never);

    const params = Promise.resolve({
      locale: "es",
      scenarioId: "english-scenario-456",
    });

    // Act
    await InviteLayout({
      children: <div>Test</div>,
      params,
    });

    // Assert: Should redirect to English URL
    expect(redirect).toHaveBeenCalledWith("/en/invite/english-scenario-456");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("does not redirect when locale matches scenario language", async () => {
    // Setup: Spanish scenario accessed via Spanish URL
    const mockScenario = {
      language: "es",
    };
    vi.mocked(db.scenario.findUnique).mockResolvedValue(mockScenario as never);

    const params = Promise.resolve({
      locale: "es",
      scenarioId: "matching-scenario-789",
    });

    const testChild = <div>Test Child Component</div>;

    // Act
    const result = await InviteLayout({
      children: testChild,
      params,
    });

    // Assert: Should not redirect, should render children
    expect(redirect).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("returns 404 when scenario does not exist", async () => {
    // Setup: Non-existent scenario
    vi.mocked(db.scenario.findUnique).mockResolvedValue(null);

    const params = Promise.resolve({
      locale: "en",
      scenarioId: "non-existent-scenario",
    });

    // Act
    await InviteLayout({
      children: <div>Test</div>,
      params,
    });

    // Assert: Should call notFound()
    expect(notFound).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("verifies correct database query parameters", async () => {
    // Setup
    const mockScenario = {
      language: "en",
    };
    vi.mocked(db.scenario.findUnique).mockResolvedValue(mockScenario as never);

    const params = Promise.resolve({
      locale: "en",
      scenarioId: "verify-query-scenario",
    });

    // Act
    await InviteLayout({
      children: <div>Test</div>,
      params,
    });

    // Assert: Verify the database was queried with correct parameters
    expect(db.scenario.findUnique).toHaveBeenCalledWith({
      where: { id: "verify-query-scenario" },
      select: {
        language: true,
      },
    });
  });
});