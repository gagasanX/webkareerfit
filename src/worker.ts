export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)
      // Serve static files from /_next/static/
      if (url.pathname.startsWith('/_next/static/')) {
        return fetch(request)
      }
      // Default response
      return new Response('Hello from Cloudflare Worker!', {
        headers: { 'content-type': 'text/plain' },
      })
    } catch (e) {
      return new Response('Not Found', { status: 404 })
    }
  },
}
