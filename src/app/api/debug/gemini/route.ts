import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI, Modality } from "@google/genai";
import { env } from "@/lib/env";

// Debug endpoint to test Gemini Live connection
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  // Test 1: Check if API key is configured
  try {
    const hasApiKey = !!env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 0;
    diagnostics.tests = {
      ...diagnostics.tests as object,
      apiKeyConfigured: {
        passed: hasApiKey,
        message: hasApiKey ? "API key is configured" : "GEMINI_API_KEY is missing",
      },
    };
  } catch (error) {
    diagnostics.tests = {
      ...diagnostics.tests as object,
      apiKeyConfigured: {
        passed: false,
        message: `Error checking API key: ${error}`,
      },
    };
  }

  // Test 2: Try to initialize GoogleGenAI client
  try {
    const ai = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: { apiVersion: "v1alpha" },
    });

    diagnostics.tests = {
      ...diagnostics.tests as object,
      clientInitialized: {
        passed: true,
        message: "GoogleGenAI client initialized successfully",
      },
    };

    // Test 3: Try to generate an ephemeral token
    try {
      const response = await ai.authTokens.create({
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

      diagnostics.tests = {
        ...diagnostics.tests as object,
        tokenGeneration: {
          passed: !!response.name,
          message: response.name
            ? `Token generated successfully: ${response.name.substring(0, 20)}...`
            : "Token generation returned empty name",
          tokenName: response.name ? `${response.name.substring(0, 30)}...` : null,
        },
      };
    } catch (tokenError) {
      const errorMessage = tokenError instanceof Error ? tokenError.message : String(tokenError);
      diagnostics.tests = {
        ...diagnostics.tests as object,
        tokenGeneration: {
          passed: false,
          message: `Token generation failed: ${errorMessage}`,
          error: errorMessage,
        },
      };
    }
  } catch (clientError) {
    const errorMessage = clientError instanceof Error ? clientError.message : String(clientError);
    diagnostics.tests = {
      ...diagnostics.tests as object,
      clientInitialized: {
        passed: false,
        message: `Client initialization failed: ${errorMessage}`,
        error: errorMessage,
      },
    };
  }

  // Test 4: List available models (if possible)
  try {
    const ai = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
    });

    // Try to list models
    const models = await ai.models.list();
    const liveModels = [];
    for await (const model of models) {
      if (model.name?.includes("live") || model.name?.includes("2.5")) {
        liveModels.push(model.name);
      }
    }

    diagnostics.tests = {
      ...diagnostics.tests as object,
      availableModels: {
        passed: true,
        message: `Found ${liveModels.length} potentially compatible models`,
        models: liveModels.slice(0, 10),
      },
    };
  } catch (modelError) {
    const errorMessage = modelError instanceof Error ? modelError.message : String(modelError);
    diagnostics.tests = {
      ...diagnostics.tests as object,
      availableModels: {
        passed: false,
        message: `Could not list models: ${errorMessage}`,
      },
    };
  }

  // Calculate overall status
  const tests = diagnostics.tests as Record<string, { passed: boolean }>;
  const allPassed = Object.values(tests).every((t) => t.passed);
  diagnostics.status = allPassed ? "healthy" : "issues_detected";

  return NextResponse.json(diagnostics);
}
