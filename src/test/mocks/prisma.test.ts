/**
 * Prisma Mocks Tests (RED phase)
 *
 * Following TDD: Write tests first, watch them fail, then implement.
 * @see Issue #98: REF-008
 */

import { describe, it, expect, vi, type Mock } from "vitest";
import { createMockPrismaClient, MockPrismaClient } from "./prisma";

// Type alias for prisma mock methods
type PrismaMockFn = Mock<(args: unknown) => Promise<unknown>>;

describe("createMockPrismaClient", () => {
  it("creates a mock with user model", () => {
    const prisma = createMockPrismaClient();

    expect(prisma.user).toBeDefined();
    expect(prisma.user.findUnique).toBeDefined();
    expect(prisma.user.findMany).toBeDefined();
    expect(prisma.user.create).toBeDefined();
    expect(prisma.user.update).toBeDefined();
    expect(prisma.user.delete).toBeDefined();
  });

  it("creates a mock with assessment model", () => {
    const prisma = createMockPrismaClient();

    expect(prisma.assessment).toBeDefined();
    expect(prisma.assessment.findUnique).toBeDefined();
    expect(prisma.assessment.findMany).toBeDefined();
    expect(prisma.assessment.create).toBeDefined();
    expect(prisma.assessment.update).toBeDefined();
  });

  it("creates a mock with scenario model", () => {
    const prisma = createMockPrismaClient();

    expect(prisma.scenario).toBeDefined();
    expect(prisma.scenario.findUnique).toBeDefined();
    expect(prisma.scenario.findMany).toBeDefined();
  });

  it("model methods are spy functions", async () => {
    const prisma = createMockPrismaClient();

    await (prisma.user.findUnique as PrismaMockFn)({ where: { id: "123" } });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "123" },
    });
  });

  it("has $transaction method", () => {
    const prisma = createMockPrismaClient();

    expect(prisma.$transaction).toBeDefined();
    expect(typeof prisma.$transaction).toBe("function");
  });

  it("has $connect and $disconnect methods", () => {
    const prisma = createMockPrismaClient();

    expect(prisma.$connect).toBeDefined();
    expect(prisma.$disconnect).toBeDefined();
  });
});

describe("MockPrismaClient", () => {
  it("can be instantiated", () => {
    const prisma = new MockPrismaClient();

    expect(prisma).toBeInstanceOf(MockPrismaClient);
  });

  it("allows setting return values for model methods", async () => {
    const prisma = new MockPrismaClient();
    const mockUser = { id: "123", name: "Test User" };

    (prisma.user.findUnique as PrismaMockFn).mockResolvedValue(mockUser);

    const result = await (prisma.user.findUnique as PrismaMockFn)({
      where: { id: "123" },
    });
    expect(result).toEqual(mockUser);
  });

  it("$transaction executes callback", async () => {
    const prisma = new MockPrismaClient();
    const callback = vi.fn().mockResolvedValue("result");

    const result = await (
      prisma.$transaction as Mock<(cb: unknown) => Promise<unknown>>
    )(callback);

    expect(callback).toHaveBeenCalledWith(prisma);
    expect(result).toBe("result");
  });

  it("can be reset", async () => {
    const prisma = new MockPrismaClient();

    await (prisma.user.findUnique as PrismaMockFn)({ where: { id: "123" } });
    prisma.reset();

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
