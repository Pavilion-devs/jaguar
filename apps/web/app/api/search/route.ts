import { NextResponse } from "next/server";

import { runJaguarSearch } from "@/lib/search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({
      query: query.trim(),
      local: [],
      goldrush: [],
      goldrushError: null,
    });
  }

  const results = await runJaguarSearch(query, {
    localLimit: 5,
    goldrushLimit: 0,
  });

  return NextResponse.json(results);
}
