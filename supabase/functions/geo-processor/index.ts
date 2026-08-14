// Supabase Edge Function to process EXIF metadata and interact with Google AI Studio Gemini API
// Adheres to Deno (TypeScript) runtime environment.

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};


async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1500) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status !== 503 || i === retries - 1) {
      return response;
    }
    console.warn(`Gemini busy (503). Retrying attempt ${i + 1} of ${retries}...`);
    await new Promise(res => setTimeout(res, delay));
  }
}

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
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiApiKey) {
            return new Response(JSON.stringify({ error: "Server Configuration Error: Missing GEMINI_API_KEY" }), {
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
        let mimeType = "image/jpeg"; // Default fallback

        // Remove data URI prefix if it exists and extract mime type dynamically
        const prefixMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        if (prefixMatch) {
            mimeType = prefixMatch[1];
            base64Image = base64Image.replace(prefixMatch[0], "");
        }

        const systemPrompt = `You are an elite OSINT geographical location grounder. Analyze this image. If it features a prominent landmark, bridge, or building, use surrounding elements (like vegetation, landscape style, water type) to isolate its true town/city. Return your final answer strictly in valid JSON matching this schema configuration layout:
{
  "analysis": {
    "architecture": "Engineering style notes",
    "flora": "Vegetation notes",
    "signage": "Text or billboard readings extracted"
  },
  "confidence_score": 90,
  "estimated_location": {
    "country": "Country name",
    "city": "Specific City or neighborhood zone",
    "coordinates": { "lat": 0.0, "lng": 0.0 }
  },
  "success": true,
  "source": "Gemini_3.1_Pro"
}`;

        const geminiResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent?key=${geminiApiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemPrompt },
                        { inlineData: { mimeType: mimeType, data: base64Image } }
                    ]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!geminiResponse || !geminiResponse.ok) {
            const errorData = geminiResponse ? await geminiResponse.text() : "No response after retries";
            console.error("Gemini API Error:", errorData);
            return new Response(JSON.stringify({ error: "Failed to process image via Gemini API." }), {
                status: 502,
                headers: { ...headers, "Content-Type": "application/json" }
            });
        }

        const geminiData = await geminiResponse.json();
        let parsedResult;

        try {
            const contentText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            parsedResult = JSON.parse(contentText);
        } catch (parseError) {
            console.error("Failed to parse Gemini JSON output:", parseError, geminiData);
            parsedResult = {};
        }

        // Defensive Programming Sanitization - Fallback mapping
        const responsePayload = {
            success: true,
            source: "Gemini_3.1_Pro",
            estimated_location: {
                country: parsedResult?.estimated_location?.country || "Unknown",
                city: parsedResult?.estimated_location?.city || "Unknown",
                coordinates: {
                    lat: typeof parsedResult?.estimated_location?.coordinates?.lat === 'number' ? parsedResult.estimated_location.coordinates.lat : 0.0,
                    lng: typeof parsedResult?.estimated_location?.coordinates?.lng === 'number' ? parsedResult.estimated_location.coordinates.lng : 0.0,
                }
            },
            confidence_score: typeof parsedResult?.confidence_score === 'number' ? parsedResult.confidence_score : 0,
            analysis: {
                architecture: parsedResult?.analysis?.architecture || "No architecture data available",
                flora: parsedResult?.analysis?.flora || "No flora data available",
                signage: parsedResult?.analysis?.signage || "No signage data available"
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
