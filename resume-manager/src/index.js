export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Preserve /api/v1/health endpoint exactly
    if (path === "/api/v1/health") {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: "healthy",
            environment: env.ENVIRONMENT || "development",
            timestamp: new Date().toISOString()
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    // 2. Route UI Assets using the standardized Cloudflare ASSETS binding
    if (env.ASSETS) {
      // Serve the frontend shell from the root route
      if (path === "/") {
        return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
      }
      
      // Serve explicitly mapped static frontend asset resources
      if (
        path === "/app.css" || 
        path === "/js/api.js" || 
        path === "/js/app.js"
      ) {
        return env.ASSETS.fetch(request);
      }
    }

    // 3. Unchanged API response envelope for unmapped endpoints
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "The requested API endpoint does not exist."
        }
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};