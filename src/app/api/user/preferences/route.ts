import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { SUPPORTED_LANGUAGES, isSupportedLanguage } from "@/lib/core/language";

export async function PATCH(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { preferredLanguage } = body;

    // Validate preferredLanguage
    if (!preferredLanguage) {
      return NextResponse.json(
        { success: false, error: "Missing preferredLanguage" },
        { status: 400 }
      );
    }

    if (!isSupportedLanguage(preferredLanguage)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid language. Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Update user preference in database
    const updatedUser = await db.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        preferredLanguage,
      },
      select: {
        id: true,
        preferredLanguage: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        preferredLanguage: updatedUser.preferredLanguage,
      },
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}