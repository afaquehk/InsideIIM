import { researchGraph } from "@/lib/agent/graph";

export async function GET() {
  return new Response(JSON.stringify({ status: "ready", message: "Investment research API endpoint is available." }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  let companyName: string;

  try {
    const body = await request.json();
    companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!companyName) {
    return new Response(JSON.stringify({ error: "companyName is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const abortHandler = () => controller.close();
      request.signal.addEventListener("abort", abortHandler);

      try {
        const graphStream = await researchGraph.streamEvents(
          { companyName },
          { version: "v3", encoding: "text/event-stream" }
        );

        for await (const chunk of graphStream as AsyncIterable<Uint8Array>) {
          if (request.signal.aborted) {
            break;
          }
          controller.enqueue(chunk);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const payload = JSON.stringify({ error: message });
        controller.enqueue(encoder.encode(`event: error\ndata: ${payload}\n\n`));
      } finally {
        request.signal.removeEventListener("abort", abortHandler);
        controller.close();
      }
    },
    cancel() {
      /* client disconnected */
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
