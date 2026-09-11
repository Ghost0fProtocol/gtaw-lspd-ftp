import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabase,
} from "../../../lib/supabase";

export async function GET(
  request: NextRequest
) {
  const secret =
    request.headers.get(
      "x-keepalive-secret"
    );

  if (
    secret !==
    process.env.KEEPALIVE_SECRET
  ) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const {
    error,
  } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    ok: true,
  });
}