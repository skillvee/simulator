import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI, Modality } from "@google/genai";
import { env } from "@/lib/env";

// Debug endpoint to test WebSocket connection details
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    steps: [],
  };

  try {
    // Step 1: Initialize client
    const ai = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: { apiVersion: "v1alpha" },
    });
    (results.steps as unknown[]).push({ step: 1, name: "Client initialized", success: true });

    // Step 2: Generate token
    const tokenResponse = await ai.authTokens.create({
      config: {
        uses: 1,
        liveConnectConstraints: {
          model: "gemini-2.5-flash-native-audio-latest",
          config: {
            responseModalities: [Modality.AUDIO],
          },
        },
      },
    });

    const token = tokenResponse.name;
    (results.steps as unknown[]).push({
      step: 2,
      name: "Token generated",
      success: !!token,
      tokenPrefix: token?.substring(0, 30) + "...",
    });

    // Step 3: Construct expected WebSocket URL (for debugging)
    // The SDK constructs this internally, but let's see what it should be
    const expectedWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;

    // Check for double slashes
    const hasDoubleSlash = expectedWsUrl.includes("//ws/");

    (results.steps as unknown[]).push({
      step: 3,
      name: "WebSocket URL analysis",
      expectedUrl: expectedWsUrl.substring(0, 100) + "...",
      hasDoubleSlash,
      warning: hasDoubleSlash ? "URL has double slash - this may cause connection issues" : null,
    });

    // Step 4: Check model availability
    const modelInfo = {
      requested: "gemini-2.5-flash-native-audio-latest",
      note: "Using native audio model for live conversations",
    };
    (results.steps as unknown[]).push({
      step: 4,
      name: "Model info",
      ...modelInfo,
    });

    // Step 5: SDK version note
    (results.steps as unknown[]).push({
      step: 5,
      name: "SDK version",
      version: "1.37.0", // Manually tracked
    });

    results.status = "diagnostics_complete";
    results.recommendation = "If WebSocket fails with double slash, the SDK may have a URL construction bug. Consider using direct WebSocket connection instead.";

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    (results.steps as unknown[]).push({
      step: "error",
      name: "Error occurred",
      error: errorMessage,
    });
    results.status = "error";
  }

  return NextResponse.json(results);
}
