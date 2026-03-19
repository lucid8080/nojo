import { NextResponse } from "next/server";
import { OpenClawError, checkHealth } from "@/lib/openclaw/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const upstream = await checkHealth();
    return NextResponse.json({
      success: true,
      upstream: {
        endpoint: upstream.endpoint,
        status: upstream.status,
        data: upstream.data,
      },
    });
  } catch (err) {
    if (err instanceof OpenClawError && err.code === "CONFIG") {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: err.message,
            code: err.code,
          },
        },
        { status: 500 },
      );
    }

    if (err instanceof OpenClawError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: err.message,
            code: err.code,
            status: err.status,
          },
        },
        { status: 502 },
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: {
          message,
        },
      },
      { status: 502 },
    );
  }
}

