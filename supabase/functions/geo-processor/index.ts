// Supabase Edge Function to process EXIF metadata and interact with Groq Cloud Vision API
// Adheres to Deno (TypeScript) runtime environment.

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

Deno.serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers,
        });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...headers, "Content-Type": "application/json" },
        });
    }

    try {
        const body = await req.json();

        // Validate that 'image' field exists and is a non-empty string
        if (!body || typeof body.image !== "string" || body.image.trim() === "") {
            return new Response(JSON.stringify({ error: "Missing or invalid 'image' field in payload. Expected a Base64 string." }), {
                status: 400,
                headers: { ...headers, "Content-Type": "application/json" },
            });
        }

        // Return standard mock JSON payload that matches outbound response contract
        const mockResponse = {
            coordinates: {
                latitude: 37.7749,
                longitude: -122.4194
            },
            confidence: 0.95,
            reasoning: "Mock response for initial frontend integration testing."
        };

        return new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { ...headers, "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
        });
    }
});
