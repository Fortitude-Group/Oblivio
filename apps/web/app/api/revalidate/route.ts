import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

/**
 * ISR revalidation endpoint (T033). The pipeline calls this after a score
 * changes so only the affected pages regenerate. Protected by a shared token.
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_TOKEN ?? "dev-revalidate";
  let body: { token?: string; paths?: string[] };
  try {
    body = (await req.json()) as { token?: string; paths?: string[] };
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
    });
  }
  if (body.token !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
    });
  }
  const paths = Array.isArray(body.paths) ? body.paths : [];
  for (const p of paths) revalidatePath(p);
  return new Response(JSON.stringify({ revalidated: paths.length }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
