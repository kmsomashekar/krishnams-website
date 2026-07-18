export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Router configuration for API versioning path
    if (url.pathname === "/api/v1/health") {
      // Return unified success envelope for system health evaluation
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

    // Standard baseline 404 handler for unmatched worker requests
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