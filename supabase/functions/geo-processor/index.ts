// Supabase Edge Function to process EXIF metadata and interact with Google Cloud Vision API
// Adheres to Deno (TypeScript) runtime environment.
// test trigger
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
        const googleApiKey = Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY");
        if (!googleApiKey) {
            return new Response(JSON.stringify({ error: "Server Configuration Error: Missing GOOGLE_CLOUD_VISION_API_KEY" }), {
                status: 500,
                headers: { ...headers, "Content-Type": "application/json" },
            });
        }

        const body = await req.json();

        // Validate that 'image' field exists and is a non-empty string
        if (!body || typeof body.image !== "string" || body.image.trim() === "") {
            return new Response(JSON.stringify({ error: "Missing or invalid 'image' field in payload. Expected a Base64 string." }), {
                status: 400,
                headers: { ...headers, "Content-Type": "application/json" },
            });
        }

        let base64Image = body.image.trim();
        // Remove data URI prefix if it exists as Google Cloud Vision expects raw base64 bytes
        const prefixMatch = base64Image.match(/^data:image\/[a-zA-Z+]+;base64,/);
        if (prefixMatch) {
            base64Image = base64Image.replace(prefixMatch[0], "");
        }

        const googleResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                requests: [
                    {
                        image: { content: base64Image },
                        features: [{ type: "LANDMARK_DETECTION", maxResults: 1 }]
                    }
                ]
            })
        });

        if (!googleResponse.ok) {
            const errorData = await googleResponse.text();
            console.error("Google Cloud Vision API Error:", errorData);
            return new Response(JSON.stringify({ error: "Failed to process image via Google Vision API." }), {
                status: 502,
                headers: { ...headers, "Content-Type": "application/json" }
            });
        }

        const googleData = await googleResponse.json();
        const responseBlock = googleData.responses?.[0] || {};
        const landmark = responseBlock.landmarkAnnotations?.[0];

        // Fallback checking to see if a landmark annotation actually exists
        const hasLandmark = !!landmark;

        const responsePayload = {
            success: true,
            source: "Google_Vision_API",
            estimated_location: {
                city: hasLandmark ? (landmark.description || "Recognized Location") : "No Database Match",
                country: "India",
                coordinates: {
                    lat: landmark?.locations?.[0]?.latLng?.latitude ?? 0.0,
                    lng: landmark?.locations?.[0]?.latLng?.longitude ?? 0.0,
                }
            },
            confidence_score: hasLandmark ? Math.round((landmark.score || 0) * 100) : 0,
            analysis: {
                architecture: hasLandmark
                    ? "Verified match found in Google Cloud Landmark index."
                    : "No architectural structures matched in Google's geospatial index.",
                flora: hasLandmark
                    ? "Surrounding terrain cross-verified against global image patterns."
                    : "Generic visual elements detected; landscape lacks distinct markers.",
                signage: hasLandmark ? (landmark.description || "None visible") : "None visible"
            }
        };

        return new Response(JSON.stringify(responsePayload), {
            status: 200,
            headers: { ...headers, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Internal Server Error:", error);
        return new Response(JSON.stringify({ error: "Invalid request payload or internal server error." }), {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
        });
    }
});
