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
    console.warn(`Gemini API busy or throttled (${response.status}). Retrying in ${delay}ms...`);
    await new Promise((res) => setTimeout(res, delay));
    delay *= 1.5;
  }
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
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
            return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
                status: 500,
                headers: { ...headers, "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        if (!body || typeof body.image !== "string" || body.image.trim() === "") {
            return new Response(JSON.stringify({ error: "Missing or invalid 'image' Base64 string." }), {
                status: 400,
                headers: { ...headers, "Content-Type": "application/json" },
            });
        }

        let base64Image = body.image.trim();
        let mimeType = "image/jpeg";

        const prefixMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        if (prefixMatch) {
            mimeType = prefixMatch[1];
            base64Image = base64Image.replace(prefixMatch[0], "");
        }

        const systemPrompt = `You are a forensic OSINT geo-location investigator.

### ANALYSIS INSTRUCTIONS:
1. IDENTIFY THE UNIQUE VISUAL ANOMALY:
   - Identify what makes this specific structure unique from generic architecture (e.g., a yellow cylindrical observation tower rising directly from a massive circular stone fort bastion).
2. BEWARE OF CAPITAL / HUB BIAS (CRITICAL):
   - Do NOT default to major hub cities (e.g., Hyderabad, Warangal, Delhi, Jaipur) unless the structure is unambiguously located there.
   - Distinct regional forts belong to their specific towns/districts (e.g., Kurnool, Chandragiri, Bhongir, Gooty).
3. DEDUCE AND GROUND:
   - Identify the exact landmark name first before assigning the city and coordinates.

Return your response strictly in valid JSON:
{
  "landmark_name": "Exact name of the building/monument",
  "deduction_reasoning": "Unique visual features confirming this exact location",
  "analysis": {
    "architecture": "Masonry and architectural details",
    "flora": "Vegetation notes",
    "signage": "Extracted text or script"
  },
  "confidence_score": 95,
  "estimated_location": {
    "country": "Country",
    "state_or_region": "State / Province",
    "city": "Specific City or District",
    "coordinates": { "lat": 0.0, "lng": 0.0 }
  },
  "success": true,
  "source": "Gemini_Flash"
}`;

        // 1. Primary Model Attempt
        let geminiResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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

        // 2. Dynamic Failover Attempt (if primary is degraded/overloaded)
        if (!geminiResponse || !geminiResponse.ok) {
            console.warn("Primary model cluster busy, trying fallback to gemini-1.5-flash...");
            geminiResponse = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
            return new Response(JSON.stringify({ error: "Service busy. Please try again shortly.", details: errorData }), {
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
            console.error("JSON Parse Error:", parseError);
            parsedResult = {};
        }

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
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 400,
            headers: { ...headers, "Content-Type": "application/json" },
        });
    }
});
