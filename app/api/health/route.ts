export async function GET() {
  return Response.json({
    ok: true,
    service: "converter",
    now: new Date().toISOString(),
  });
}
