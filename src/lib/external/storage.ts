import { supabase, supabaseAdmin } from "./supabase";

export const STORAGE_BUCKETS = {
  RESUMES: "resumes",
  RECORDINGS: "recordings",
  SCREENSHOTS: "screenshots",
  AVATARS: "avatars",
  DELIVERABLES: "deliverables",
} as const;

interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a CV/resume file to Supabase storage
 * @param file - The file to upload
 * @param userId - The user's ID (used for organizing files)
 * @returns The public URL and path of the uploaded file
 */
export async function uploadResume(
  file: File,
  userId: string
): Promise<UploadResult> {
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "pdf";
  const path = `${userId}/${timestamp}.${extension}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.RESUMES)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload resume: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKETS.RESUMES).getPublicUrl(path);

  return { url: publicUrl, path };
}

/**
 * Delete a resume file from Supabase storage (server-side only)
 * @param path - The path of the file to delete
 */
export async function deleteResume(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKETS.RESUMES)
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete resume: ${error.message}`);
  }
}

/**
 * Get a signed URL for private file access (server-side only)
 * @param path - The path of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
/**
 * Upload a deliverable file for an assessment.
 *
 * Goes through the API route so the server can persist a reference on the
 * Assessment row and generate a summary for the defense call prompt.
 */
export async function uploadDeliverable(
  file: File,
  assessmentId: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("assessmentId", assessmentId);

  const response = await fetch("/api/assessment/deliverable", {
    method: "POST",
    body: formData,
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    const message = json?.error || "Failed to upload deliverable";
    throw new Error(message);
  }

  return { url: json.data.url, path: json.data.path };
}

export async function getSignedResumeUrl(
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKETS.RESUMES)
    .createSignedUrl(path, expiresIn);

  if (error || !data) {
    throw new Error(`Failed to get signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}
