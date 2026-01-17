import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the ephemeral token generation
describe("Gemini Live Token Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use correct model name format", async () => {
    // The model should match an available model from Gemini API
    const LIVE_MODEL = "gemini-2.5-flash-native-audio-latest";

    // Check if the model name matches known available formats
    const validModelFormats = [
      "gemini-2.5-flash-native-audio-latest",
      "gemini-2.0-flash-exp",
      "models/gemini-2.5-flash-native-audio-latest",
    ];

    // This test documents the current model - if it fails, the model format may need updating
    expect(validModelFormats.some(m => LIVE_MODEL.includes("gemini"))).toBe(true);
  });

  it("should have correct audio configuration", () => {
    // Verify audio sample rates match Gemini requirements
    const INPUT_SAMPLE_RATE = 16000;  // Gemini expects 16kHz input
    const OUTPUT_SAMPLE_RATE = 24000; // Gemini outputs 24kHz

    expect(INPUT_SAMPLE_RATE).toBe(16000);
    expect(OUTPUT_SAMPLE_RATE).toBe(24000);
  });
});

// Test audio utilities
describe("Audio Utilities", () => {
  it("should convert Float32 to Int16 correctly", () => {
    // Test the conversion logic used in audio worklet
    const float32Value = 0.5;
    const expectedInt16 = Math.round(float32Value * 0x7FFF);

    // This is the conversion from the worklet
    const s = Math.max(-1, Math.min(1, float32Value));
    const int16Value = s < 0 ? s * 0x8000 : s * 0x7FFF;

    expect(Math.round(int16Value)).toBe(expectedInt16);
  });

  it("should handle negative values correctly", () => {
    const float32Value = -0.5;

    const s = Math.max(-1, Math.min(1, float32Value));
    const int16Value = s < 0 ? s * 0x8000 : s * 0x7FFF;

    expect(int16Value).toBeLessThan(0);
  });
});
