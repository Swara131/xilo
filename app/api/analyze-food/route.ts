import { NextResponse } from "next/server";
import { analyzeFoodLabel } from "@/lib/gemini";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/options";
import { validateProfile } from "@/lib/validate-profile";

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError("Add a photo of a food label before analyzing.", 400);
    }
    const image = form.get("image");
    const profileField = form.get("profile");

    if (!(image instanceof File) || image.size === 0) {
      return jsonError("Add a photo of a food label before analyzing.", 400);
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return jsonError("That image is too large. Please use a photo under 5 MB.", 413);
    }

    const bytes = new Uint8Array(await image.arrayBuffer());
    const mimeType = sniffMime(bytes);
    if (!mimeType || !ACCEPTED_IMAGE_TYPES.includes(mimeType)) {
      return jsonError("Please upload a JPG, PNG, or WEBP image of the label.", 400);
    }

    if (typeof profileField !== "string") {
      return jsonError("Add your dietary preferences before analyzing a label.", 400);
    }

    let profileJson: unknown;
    try {
      profileJson = JSON.parse(profileField);
    } catch {
      return jsonError("Add your dietary preferences before analyzing a label.", 400);
    }

    const validated = validateProfile(profileJson);
    if (!validated.ok) {
      const message = Object.values(validated.errors)[0] ?? "Check your preferences and try again.";
      return jsonError(message, 400);
    }

    const analysis = await analyzeFoodLabel({
      base64: Buffer.from(bytes).toString("base64"),
      mimeType,
      profile: validated.profile,
    });

    return NextResponse.json(analysis, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : "";

    if (message === "MISSING_API_KEY") {
      return jsonError(
        "The food analysis service is not configured yet. Add the server API key and try again.",
        500,
      );
    }
    if (name === "UNREADABLE_LABEL") {
      if (message === "NOT_A_LABEL") {
        return jsonError(
          "This image does not appear to contain a readable food ingredient or nutrition label.",
          422,
        );
      }
      return jsonError(
        "We could not read the ingredients in this photo. Please upload a closer, well-lit photo of the label.",
        422,
      );
    }
    if (message === "INVALID_JSON" || message === "EMPTY_RESPONSE") {
      return jsonError("We couldn't read the analysis. Please try the photo again.", 502);
    }
    if (message === "AUTH_REJECTED") {
      return jsonError(
        "The analysis service rejected the request. Check that the server API key is valid.",
        502,
      );
    }
    if (message === "INSUFFICIENT_CREDITS") {
      return jsonError(
        "The analysis service does not have enough credits to finish this analysis. Please try again later.",
        502,
      );
    }
    if (message === "RATE_LIMITED") {
      return jsonError(
        "The analysis service is busy right now. Please wait a moment and try again.",
        502,
      );
    }

    const known = new Set([
      "MISSING_API_KEY",
      "PROVIDER_ERROR",
      "ANALYSIS_FAILED",
      "MODEL_MISSING",
    ]);
    console.error("Food analysis failed:", known.has(message) ? message : "PROVIDER_ERROR");
    return jsonError("We couldn't analyze this label right now. Please try again in a moment.", 502);
  }
}
