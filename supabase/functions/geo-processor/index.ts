// Supabase Edge Function to process EXIF metadata and interact with Google AI Studio Gemini API
// Adheres to Deno (TypeScript) runtime environment.

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, delay = 600) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if ((response.status !== 503 && response.status !== 429) || i === retries - 1) {
      return response;
    }
    console.warn(`Gemini API busy or throttled (${response.status}). Retrying in ${delay}ms (Attempt ${i + 1}/${retries})...`);
    await new Promise((res) => setTimeout(res, delay));
    delay *= 1.5;
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

        const systemPrompt = `You are an elite OSINT geographical location grounder.

Carefully analyze this image using structured elimination:
1. VISUAL ANCHORS: Identify distinguishing architectural elements (e.g., specific fort bastions, watchtowers, gables, balustrades), signage/script (e.g., Telugu, Hindi, Tamil, Latin), masonry type, and topography.
2. CANDIDATE MATCHING: Actively match these features against known real-world historical monuments, forts, campuses, or structures. Discard generic regional hubs if the specific architectural signature belongs to a known landmark.
3. GROUNDING: State the verified landmark name and visual proof first, then assign the precise city, state, and coordinates.

Return your final answer strictly in valid JSON matching this schema:
{
  "landmark_name": "Exact name of the building/monument (or 'Unidentified Landmark' if unknown)",
  "deduction_reasoning": "Brief explanation of the unique visual features that confirm this specific location",
  "analysis": {
    "architecture": "Detailed structural notes",
    "flora": "Vegetation notes",
    "signage": "Text, script, or billboard readings extracted"
  },
  "confidence_score": 90,
  "estimated_location": {
    "country": "Country name",
    "state_or_region": "State / Province",
    "city": "Specific City or Town",
    "coordinates": { "lat": 0.0, "lng": 0.0 }
  },
  "success": true,
  "source": "Gemini_Flash"
}`;

        // Primary Model Call (gemini-2.5-flash)
        let geminiResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
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

        // Failover fallback if primary cluster returns 503/429
        if (!geminiResponse || !geminiResponse.ok) {
            console.warn("Primary model cluster busy, falling back to gemini-1.5-flash...");
            geminiResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
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
            }, 1, 300);
        }

        if (!geminiResponse || !geminiResponse.ok) {
            const errorData = geminiResponse ? await geminiResponse.text() : "No response after retries";
            console.error("Gemini API Error:", errorData);
            return new Response(JSON.stringify({ error: "Gemini service is temporarily busy. Please retry shortly.", details: errorData }), {
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
            source: "Gemini_Flash",
            landmark_name: parsedResult?.landmark_name || "Unidentified Landmark",
            deduction_reasoning: parsedResult?.deduction_reasoning || "Visual analysis complete.",
            estimated_location: {
                country: parsedResult?.estimated_location?.country || "Unknown",
                state_or_region: parsedResult?.estimated_location?.state_or_region || "Unknown",
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
