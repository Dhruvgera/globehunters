import { NextResponse } from "next/server";
import { searchViatorActivities } from "@/lib/viator/client";
import type { ActivitySearchRequest } from "@/types/activities";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ActivitySearchRequest;
    const destinationName = String(body.destinationName || "").trim();

    if (!destinationName) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "destinationName is required" },
        { status: 400 }
      );
    }

    const response = await searchViatorActivities({
      ...body,
      destinationName,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[ActivitiesSearch] Error:", error);
    return NextResponse.json(
      {
        error: "VIATOR_SEARCH_FAILED",
        message: error instanceof Error ? error.message : "Failed to search activities",
      },
      { status: 500 }
    );
  }
}
