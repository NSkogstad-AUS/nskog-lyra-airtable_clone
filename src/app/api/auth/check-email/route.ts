import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

const checkEmailSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    const validationResult = checkEmailSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 },
      );
    }

    const { email } = validationResult.data;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    return NextResponse.json({
      exists: !!existingUser,
      hasPassword: existingUser ? !!existingUser.password : false,
    });
  } catch (error) {
    console.error("Check email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
