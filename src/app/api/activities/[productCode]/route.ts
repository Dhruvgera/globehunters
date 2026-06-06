import { NextResponse } from "next/server";
import { getViatorProduct } from "@/lib/viator/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productCode: string }> }
) {
  try {
    const { productCode } = await params;
    const product = await getViatorProduct(productCode);

    if (!product) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Activity product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("[ActivityProduct] Error:", error);
    return NextResponse.json(
      {
        error: "VIATOR_PRODUCT_FAILED",
        message: error instanceof Error ? error.message : "Failed to load activity product",
      },
      { status: 500 }
    );
  }
}
