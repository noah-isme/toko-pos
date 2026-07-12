import { getServerAuthSession } from "@/server/auth";
import { Role } from "@/server/db/enums";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await getServerAuthSession();
  if (
    !session?.user ||
    (session.user.role !== Role.ADMIN && session.user.role !== Role.OWNER)
  ) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const mod = await import('@/server/auth');
    const keys = Object.keys(mod || {});
    const types: Record<string, string> = {};
    for (const k of keys) types[k] = typeof (mod as unknown as Record<string, unknown>)[k];
    return new Response(JSON.stringify({ ok: true, keys, types }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: unknown) {
    console.error('[debug-auth] import error', (err as Error)?.stack ?? String(err));
    return new Response(JSON.stringify({ ok: false, error: String((err as Error)?.message ?? err), stack: String((err as Error)?.stack ?? '') }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
