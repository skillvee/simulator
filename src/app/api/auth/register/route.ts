import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/server/db";
import { Prisma } from "@prisma/client";
import { validateRequest } from "@/lib/api";
import { RegisterRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  // Validate request body using Zod schema
  const validated = await validateRequest(request, RegisterRequestSchema);
  if ("error" in validated) return validated.error;
  const { email, password, name, role } = validated.data;

  try {
    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user directly - use error handling for duplicate email
    // This avoids the race condition where two concurrent registrations
    // both pass the findUnique check before either creates the user
    try {
      const user = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || null,
          role: role ?? "USER", // Default to USER if not specified
          emailVerified: new Date(),
        },
      });

      // Return user without password
      return NextResponse.json(
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      // Handle unique constraint violation (P2002) - email already exists
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 }
        );
      }
      // Re-throw other errors to be handled by outer catch
      throw error;
    }
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
