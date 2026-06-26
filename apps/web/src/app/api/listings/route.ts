import { NextRequest, NextResponse } from "next/server";
import { listPublic, createListing, publicView } from "@/lib/server/registry";

export async function GET() {
  return NextResponse.json({ listings: await listPublic() });
}

export async function POST(req: NextRequest) {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "bad JSON" }, { status: 400 });
  }
  const { listing, error } = await createListing(input);
  if (error || !listing) {
    return NextResponse.json({ error: error ?? "invalid listing" }, { status: 400 });
  }
  return NextResponse.json({ listing: publicView(listing) });
}
