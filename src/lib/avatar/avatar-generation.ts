/**
 * Avatar Generation Service (RF-021)
 *
 * Generates photorealistic avatar images for coworkers using Gemini's image generation.
 * Uploads to Supabase Storage and updates coworker records.
 *
 * API Choice: Gemini 2.0 Flash with imagen-3.0-generate-002
 * - Uses existing @google/genai SDK already configured in the project
 * - Imagen 3 provides high-quality photorealistic images
 * - Simpler integration than Vertex AI (no separate SDK/auth)
 * - Pricing: ~$0.04 per image
 */

import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/core";
import { supabaseAdmin } from "@/lib/external/supabase";
import { db } from "@/server/db";

// Constants
const AVATAR_BUCKET = "avatars";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second base delay for exponential backoff

// Gemini client configured for image generation
const gemini = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

// Model for image generation - Imagen 3
const IMAGE_MODEL = "imagen-3.0-generate-002";

interface CoworkerData {
  id: string;
  name: string;
  role: string;
  personaStyle: string;
}

interface GenerationResult {
  coworkerId: string;
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Build a prompt for generating a professional headshot avatar.
 * Uses coworker data including name to create a contextually appropriate,
 * ethnicity-coherent image (e.g. "Mei Lin" → East Asian appearance).
 */
function buildAvatarPrompt(coworker: CoworkerData): string {
  // Extract persona style hints for appearance
  const styleHints = extractStyleHints(coworker.personaStyle);

  // Build the prompt — include name so Imagen infers appropriate ethnicity/appearance
  const prompt = `Professional headshot photograph of a person named ${coworker.name}, who is a ${styleHints} ${coworker.role}.
The person's appearance should be consistent with their name's cultural background.
Corporate style portrait, neutral gray background, professional lighting,
high quality, photorealistic, head and shoulders only, facing camera,
friendly expression, business casual attire.`;

  return prompt;
}

/**
 * Extract style hints from persona description for avatar generation.
 * Maps persona traits to visual descriptors.
 */
function extractStyleHints(personaStyle: string): string {
  const style = personaStyle.toLowerCase();
  const hints: string[] = [];

  // Personality-based appearance hints
  if (style.includes("friendly") || style.includes("warm")) {
    hints.push("approachable");
  }
  if (style.includes("professional") || style.includes("formal")) {
    hints.push("polished");
  }
  if (style.includes("casual") || style.includes("relaxed")) {
    hints.push("casual");
  }
  if (style.includes("energetic") || style.includes("enthusiastic")) {
    hints.push("dynamic");
  }
  if (style.includes("technical") || style.includes("analytical")) {
    hints.push("thoughtful");
  }
  if (style.includes("creative") || style.includes("innovative")) {
    hints.push("creative-looking");
  }

  // Default if no hints matched
  if (hints.length === 0) {
    hints.push("professional");
  }

  return hints.join(", ");
}

/**
 * Generate an avatar image using Gemini/Imagen 3.
 * Returns base64 image data or throws on error.
 */
async function generateAvatarImage(coworker: CoworkerData): Promise<Buffer> {
  const prompt = buildAvatarPrompt(coworker);

  const response = await gemini.models.generateImages({
    model: IMAGE_MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/jpeg",
      aspectRatio: "1:1",
    },
  });

  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error("No image generated");
  }

  const imageData = response.generatedImages[0].image?.imageBytes;
  if (!imageData) {
    throw new Error("No image data in response");
  }

  // Convert base64 to Buffer
  return Buffer.from(imageData, "base64");
}

/**
 * Upload avatar image to Supabase Storage.
 * Creates the avatars bucket if it doesn't exist.
 */
async function uploadAvatarToStorage(
  coworkerId: string,
  imageBuffer: Buffer
): Promise<string> {
  const path = `coworkers/${coworkerId}.jpg`;

  // Upload to storage (upsert in case of retry)
  const { error: uploadError } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(path, imageBuffer, {
      contentType: "image/jpeg",
      cacheControl: "31536000", // 1 year cache
      upsert: true, // Allow overwriting for retries
    });

  if (uploadError) {
    // If bucket doesn't exist, try to create it
    if (uploadError.message.includes("Bucket not found")) {
      await createAvatarBucket();
      // Retry upload
      const { error: retryError } = await supabaseAdmin.storage
        .from(AVATAR_BUCKET)
        .upload(path, imageBuffer, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: true,
        });
      if (retryError) {
        throw new Error(`Failed to upload avatar: ${retryError.message}`);
      }
    } else {
      throw new Error(`Failed to upload avatar: ${uploadError.message}`);
    }
  }

  // Get signed URL (long-lived for avatar display)
  const { data: urlData, error: urlError } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year expiry

  if (urlError || !urlData?.signedUrl) {
    throw new Error(`Failed to get signed URL: ${urlError?.message}`);
  }

  return urlData.signedUrl;
}

/**
 * Create the avatars bucket in Supabase Storage.
 */
async function createAvatarBucket(): Promise<void> {
  const { error } = await supabaseAdmin.storage.createBucket(AVATAR_BUCKET, {
    public: false, // Use signed URLs for access
    fileSizeLimit: 5 * 1024 * 1024, // 5MB max
    allowedMimeTypes: ["image/jpeg", "image/png"],
  });

  if (error && !error.message.includes("already exists")) {
    throw new Error(`Failed to create avatar bucket: ${error.message}`);
  }
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate avatar for a single coworker with retry logic.
 */
async function generateAvatarWithRetry(
  coworker: CoworkerData
): Promise<GenerationResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Generate the image
      const imageBuffer = await generateAvatarImage(coworker);

      // Upload to storage
      const avatarUrl = await uploadAvatarToStorage(coworker.id, imageBuffer);

      // Update the coworker record
      await db.coworker.update({
        where: { id: coworker.id },
        data: { avatarUrl },
      });

      console.log(`[Avatar] Generated avatar for ${coworker.name}`);

      return {
        coworkerId: coworker.id,
        success: true,
        avatarUrl,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[Avatar] Attempt ${attempt + 1}/${MAX_RETRIES} failed for ${coworker.name}:`,
        lastError.message
      );

      // Exponential backoff before retry
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  // All retries failed
  console.error(
    `[Avatar] All retries failed for ${coworker.name}:`,
    lastError?.message
  );
  return {
    coworkerId: coworker.id,
    success: false,
    error: lastError?.message || "Unknown error",
  };
}

/**
 * Generate avatars for all coworkers in a scenario.
 * Only generates for coworkers without existing avatars.
 * Runs asynchronously - doesn't block scenario save.
 */
export async function generateAvatarsForScenario(
  scenarioId: string
): Promise<GenerationResult[]> {
  // Get all coworkers without avatars
  const coworkers = await db.coworker.findMany({
    where: {
      scenarioId,
      avatarUrl: null,
    },
    select: {
      id: true,
      name: true,
      role: true,
      personaStyle: true,
    },
  });

  if (coworkers.length === 0) {
    console.log(`[Avatar] No coworkers need avatars for scenario ${scenarioId}`);
    return [];
  }

  console.log(
    `[Avatar] Generating avatars for ${coworkers.length} coworkers in scenario ${scenarioId}`
  );

  // Generate avatars sequentially to avoid rate limits
  const results: GenerationResult[] = [];
  for (const coworker of coworkers) {
    const result = await generateAvatarWithRetry(coworker);
    results.push(result);
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(
    `[Avatar] Generation complete: ${successful} succeeded, ${failed} failed`
  );

  return results;
}

/**
 * Generate avatar for a single coworker.
 * Useful for individual coworker creation.
 */
export async function generateAvatarForCoworker(
  coworkerId: string
): Promise<GenerationResult> {
  const coworker = await db.coworker.findUnique({
    where: { id: coworkerId },
    select: {
      id: true,
      name: true,
      role: true,
      personaStyle: true,
      avatarUrl: true,
    },
  });

  if (!coworker) {
    return {
      coworkerId,
      success: false,
      error: "Coworker not found",
    };
  }

  // Skip if already has avatar
  if (coworker.avatarUrl) {
    return {
      coworkerId,
      success: true,
      avatarUrl: coworker.avatarUrl,
    };
  }

  return generateAvatarWithRetry(coworker);
}

// Export types
export type { CoworkerData, GenerationResult };
