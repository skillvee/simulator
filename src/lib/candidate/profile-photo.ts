import { db } from "@/server/db";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/external";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/core";

const gemini = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
});

const IMAGE_EDIT_MODEL = "gemini-2.5-flash-image";
const AVATAR_BUCKET = STORAGE_BUCKETS.AVATARS;

export interface GenerateProfilePhotoOptions {
  assessmentId: string;
  userId: string;
}

export interface GenerateProfilePhotoResult {
  success: boolean;
  imageUrl: string | null;
  error?: string;
}

/**
 * Generate a studio-quality profile headshot from a webcam snapshot.
 *
 * Uses Gemini 2.5 Flash image editing to transform the actual webcam photo
 * into a professional headshot — preserving the candidate's real face while
 * enhancing lighting, background, and framing.
 *
 * Falls back to the raw webcam snapshot if AI editing fails.
 */
export async function generateProfilePhoto(
  options: GenerateProfilePhotoOptions
): Promise<GenerateProfilePhotoResult> {
  const { assessmentId, userId } = options;

  try {
    // 1. Download webcam snapshot from storage
    const snapshotPath = `${assessmentId}/webcam-profile.jpg`;
    const { data: snapshotData, error: downloadError } =
      await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.SCREENSHOTS)
        .download(snapshotPath);

    if (downloadError || !snapshotData) {
      return {
        success: false,
        imageUrl: null,
        error: "Webcam profile snapshot not found",
      };
    }

    const snapshotBuffer = Buffer.from(await snapshotData.arrayBuffer());

    // 2. Try AI-enhanced headshot editing; fall back to raw snapshot
    let processedImageBuffer: Buffer;
    try {
      processedImageBuffer = await editWebcamToHeadshot(snapshotBuffer);
    } catch (genError) {
      console.error(
        "[ProfilePhoto] AI headshot editing failed, using raw snapshot:",
        genError
      );
      processedImageBuffer = snapshotBuffer;
    }

    // 3. Upload to avatars bucket
    const avatarPath = `candidates/${userId}.jpg`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(avatarPath, processedImageBuffer, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      return {
        success: false,
        imageUrl: null,
        error: `Upload failed: ${uploadError.message}`,
      };
    }

    // 4. Get signed URL (1 year)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(avatarPath, 60 * 60 * 24 * 365);

    if (urlError || !urlData?.signedUrl) {
      return {
        success: false,
        imageUrl: null,
        error: "Failed to generate signed URL",
      };
    }

    // 5. Update User.image
    await db.user.update({
      where: { id: userId },
      data: { image: urlData.signedUrl },
    });

    return { success: true, imageUrl: urlData.signedUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ProfilePhoto] Error:", err);
    return { success: false, imageUrl: null, error: message };
  }
}

/**
 * Use Gemini 2.5 Flash image editing to transform a webcam snapshot
 * into a professional studio headshot, preserving the person's actual face.
 */
async function editWebcamToHeadshot(
  sourceImageBuffer: Buffer
): Promise<Buffer> {
  const base64Image = sourceImageBuffer.toString("base64");

  const response = await gemini.models.generateContent({
    model: IMAGE_EDIT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Transform this webcam photo into a professional corporate headshot.
Keep the person's face, features, and identity exactly the same.
Replace the background with a neutral light gray studio backdrop.
Apply professional studio lighting — soft, even, and flattering.
Frame as head and shoulders, centered.
Output a clean, high-quality professional headshot.`,
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE"],
    },
  });

  // Extract edited image from response
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("No response parts from Gemini image editing");
  }

  const imagePart = parts.find(
    (part) => part.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image data in Gemini image editing response");
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}
