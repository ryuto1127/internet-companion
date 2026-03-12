export default {
  async fetch(request: Request) {

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      })
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 })
    }

    let body

    try {
      body = await request.json()
    } catch {
      return new Response("Invalid JSON", { status: 400 })
    }

    const { url, title, text } = body

    const safeText = text.slice(0, 5000)
    const summary = safeText.slice(0, 200)

    return new Response(
      JSON.stringify({ summary }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    )
  }
}