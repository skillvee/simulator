import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger, shouldSkipScreenRecording } from "./logger";

describe("createLogger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("development mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("logs info with color-coded prefix and module name", () => {
      const logger = createLogger("TestModule");
      logger.info("hello world");

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("[INFO]"),
        "hello world"
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("[TestModule]"),
        "hello world"
      );
    });

    it("logs warn with console.warn", () => {
      const logger = createLogger("TestModule");
      logger.warn("warning message");

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("[WARN]"),
        "warning message"
      );
    });

    it("logs error with console.error", () => {
      const logger = createLogger("TestModule");
      logger.error("error message");

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR]"),
        "error message"
      );
    });

    it("logs debug with console.debug", () => {
      vi.stubEnv("LOG_LEVEL", "debug");
      const logger = createLogger("TestModule");
      logger.debug("debug message");

      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining("[DEBUG]"),
        "debug message"
      );
    });

    it("includes extra data when provided", () => {
      const logger = createLogger("TestModule");
      const data = { userId: "123", action: "login" };
      logger.info("user action", data);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("[TestModule]"),
        "user action",
        data
      );
    });

    it("omits data argument when data is empty object", () => {
      const logger = createLogger("TestModule");
      logger.info("no data", {});

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("[TestModule]"),
        "no data"
      );
    });
  });

  describe("production mode (JSON output)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    it("outputs JSON with required fields for info", () => {
      const logger = createLogger("api");
      logger.info("request received");

      expect(console.log).toHaveBeenCalledTimes(1);
      const output = JSON.parse(
        (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]
      );
      expect(output).toMatchObject({
        level: "info",
        module: "api",
        message: "request received",
      });
      expect(output.timestamp).toBeDefined();
      expect(() => new Date(output.timestamp)).not.toThrow();
    });

    it("outputs JSON via console.error for error level", () => {
      const logger = createLogger("api");
      logger.error("something broke");

      expect(console.error).toHaveBeenCalledTimes(1);
      const output = JSON.parse(
        (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0]
      );
      expect(output.level).toBe("error");
    });

    it("outputs JSON via console.warn for warn level", () => {
      const logger = createLogger("api");
      logger.warn("deprecation");

      expect(console.warn).toHaveBeenCalledTimes(1);
      const output = JSON.parse(
        (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0]
      );
      expect(output.level).toBe("warn");
    });

    it("spreads extra data into JSON output", () => {
      const logger = createLogger("api");
      logger.info("request", { path: "/foo", status: 200 });

      const output = JSON.parse(
        (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]
      );
      expect(output.path).toBe("/foo");
      expect(output.status).toBe(200);
    });
  });

  describe("LOG_LEVEL filtering", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("defaults to info level (suppresses debug)", () => {
      vi.stubEnv("LOG_LEVEL", "");
      const logger = createLogger("test");
      logger.debug("should not appear");
      logger.info("should appear");

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
    });

    it("respects LOG_LEVEL=debug (shows all)", () => {
      vi.stubEnv("LOG_LEVEL", "debug");
      const logger = createLogger("test");
      logger.debug("visible");
      logger.info("visible");
      logger.warn("visible");
      logger.error("visible");

      expect(console.debug).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it("respects LOG_LEVEL=warn (suppresses debug and info)", () => {
      vi.stubEnv("LOG_LEVEL", "warn");
      const logger = createLogger("test");
      logger.debug("hidden");
      logger.info("hidden");
      logger.warn("visible");
      logger.error("visible");

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it("respects LOG_LEVEL=error (only errors)", () => {
      vi.stubEnv("LOG_LEVEL", "error");
      const logger = createLogger("test");
      logger.debug("hidden");
      logger.info("hidden");
      logger.warn("hidden");
      logger.error("visible");

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it("handles case-insensitive LOG_LEVEL", () => {
      vi.stubEnv("LOG_LEVEL", "WARN");
      const logger = createLogger("test");
      logger.info("hidden");
      logger.warn("visible");

      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });

    it("falls back to info for invalid LOG_LEVEL", () => {
      vi.stubEnv("LOG_LEVEL", "invalid");
      const logger = createLogger("test");
      logger.debug("hidden");
      logger.info("visible");

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
    });
  });
});

describe("shouldSkipScreenRecording", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SKIP_SCREEN_RECORDING", "true");
    expect(shouldSkipScreenRecording()).toBe(false);
  });

  it("returns true in development when SKIP_SCREEN_RECORDING is set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SKIP_SCREEN_RECORDING", "true");
    expect(shouldSkipScreenRecording()).toBe(true);
  });

  it("returns true in development when E2E_TEST_MODE is set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST_MODE", "true");
    expect(shouldSkipScreenRecording()).toBe(true);
  });

  it("returns false in development when neither flag is set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SKIP_SCREEN_RECORDING", "");
    vi.stubEnv("NEXT_PUBLIC_E2E_TEST_MODE", "");
    expect(shouldSkipScreenRecording()).toBe(false);
  });
});

describe("core barrel export isolation", () => {
  it("does NOT re-export env from the barrel (prevents client bundle contamination)", async () => {
    const barrel = await import("./index");
    // env should NOT be available through the barrel
    expect("env" in barrel).toBe(false);
    // But createLogger and shouldSkipScreenRecording should be
    expect("createLogger" in barrel).toBe(true);
    expect("shouldSkipScreenRecording" in barrel).toBe(true);
  });
});
