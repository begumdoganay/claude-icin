export async function GET() {
  const res = await fetch("http://localhost:3001/health");
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
