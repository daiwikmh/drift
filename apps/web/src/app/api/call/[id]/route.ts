import { NextRequest, NextResponse } from "next/server";
import { getListing, isNonceUsed, markNonce, recordCall } from "@/lib/server/registry";
import {
  buildRequirements,
  decodePayment,
  facilitatorVerify,
  facilitatorSettle,
} from "@/lib/server/x402casper";
import { callMcp } from "@/lib/server/mcp";

const X402_VERSION = 2;

function need(requirements: ReturnType<typeof buildRequirements>, resource: string, error: string) {
  const paymentRequired = { x402Version: X402_VERSION, error, resource: { url: resource }, accepts: [requirements] };
  return NextResponse.json(paymentRequired, {
    status: 402,
    headers: { "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(paymentRequired)).toString("base64") },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) {
    return NextResponse.json({ error: "endpoint not found" }, { status: 404 });
  }

  const resource = `${req.nextUrl.origin}/api/call/${id}`;
  const requirements = buildRequirements({
    priceCspr: listing.priceCspr,
    payTo: listing.payTo,
    resource,
    description: listing.description || listing.name,
  });

  const header = req.headers.get("payment-signature");
  if (!header) return need(requirements, resource, "payment required");

  const payment = decodePayment(header);
  if (!payment || payment.accepted?.scheme !== "native") {
    return need(requirements, resource, "this endpoint accepts native CSPR via x402");
  }

  const verified = await facilitatorVerify(payment, requirements);
  if (!verified.isValid || !verified.txHash) return need(requirements, resource, verified.invalidReason ?? "payment invalid");

  const txHash = verified.txHash;
  if (await isNonceUsed(txHash)) return need(requirements, resource, "payment already used");

  const settled = await facilitatorSettle(payment, requirements);
  if (!settled.success) return need(requirements, resource, settled.error ?? "settlement failed");
  await markNonce(txHash);

  // Payment is settled — fulfil the call. The settlement receipt rides back on
  // every response (success or upstream error) so the buyer can prove they paid.
  const paymentResponse = Buffer.from(
    JSON.stringify({ success: true, transaction: settled.txHash, payer: settled.payer, network: requirements.network })
  ).toString("base64");
  const outHeaders = (contentType: string) => ({
    "Content-Type": contentType,
    "PAYMENT-RESPONSE": paymentResponse,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "PAYMENT-RESPONSE",
  });

  const rawBody = await req.text().catch(() => "");

  // Owner-supplied secret to reach their upstream — injected here, never seen by the buyer.
  const auth =
    listing.authHeaderName && listing.authHeaderValue
      ? { name: listing.authHeaderName, value: listing.authHeaderValue }
      : undefined;

  // MCP listings: run the Streamable-HTTP handshake (initialize → initialized →
  // tools/call) on the buyer's behalf and return the tool result as JSON.
  if (listing.kind === "mcp") {
    let parsed: unknown = {};
    if (rawBody.trim()) {
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: "body must be valid JSON", paid: true, txHash: settled.txHash },
          { status: 400, headers: outHeaders("application/json") }
        );
      }
    }
    const mcp = await callMcp(listing.upstreamUrl, parsed, auth);
    if (!mcp.ok) {
      return NextResponse.json(
        { error: `mcp upstream failed: ${mcp.error}`, paid: true, txHash: settled.txHash },
        { status: 502, headers: outHeaders("application/json") }
      );
    }
    await recordCall(id);
    return NextResponse.json(mcp.result, { status: 200, headers: outHeaders("application/json") });
  }

  // Plain HTTP listings: replay the buyer's body verbatim to the owner's upstream.
  const upstreamBody = listing.method === "POST" ? (rawBody || "{}") : undefined;
  const upstreamHeaders: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) upstreamHeaders[auth.name] = auth.value;
  let upstream: Response;
  try {
    upstream = await fetch(listing.upstreamUrl, {
      method: listing.method,
      headers: upstreamHeaders,
      body: upstreamBody,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `upstream failed: ${(e as Error).message}`, paid: true, txHash: settled.txHash },
      { status: 502, headers: outHeaders("application/json") }
    );
  }

  recordCall(id);
  const upstreamText = await upstream.text();
  return new NextResponse(upstreamText, {
    status: upstream.status,
    headers: outHeaders(upstream.headers.get("content-type") ?? "application/json"),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, PAYMENT-SIGNATURE",
      "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
    },
  });
}
