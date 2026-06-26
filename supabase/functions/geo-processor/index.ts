// Supabase Edge Function to process EXIF metadata and interact with Groq Cloud Vision API
// Adheres to Deno (TypeScript) runtime environment.
//a
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
        const groqApiKey = Deno.env.get("GROQ_API_KEY");
        if (!groqApiKey) {
            return new Response(JSON.stringify({ error: "Server Configuration Error: Missing GROQ_API_KEY" }), {
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
        // Add normalization helper to ensure the base64 payload is correctly prefixed
        if (!base64Image.startsWith("data:image/")) {
            // Default to jpeg if no prefix exists, as requested
            base64Image = `data:image/jpeg;base64,${base64Image}`;
        }

        const systemPrompt = `You are an elite digital intelligence investigator. Your task is to analyze the provided image to estimate its geographical location based on visual landmarks, regional architecture patterns, vegetation (flora), language scripts, and transit markers.
You must respond strictly in JSON format matching this exact schema:
{
  "success": true,
  "source": "LLM_Fallback",
  "estimated_location": {
    "country": "Country name (or 'Unknown')",
    "city": "City name (or 'Unknown')",
    "coordinates": {
      "lat": 0.0,
      "lng": 0.0
    }
  },
  "confidence_score": 0,
  "analysis": {
    "architecture": "Description of architectural style",
    "flora": "Description of vegetation and flora",
    "signage": "Description of language, scripts, and signage"
  }
}
If you cannot determine an exact location, provide your best guess for country and city, output approximate coordinates, and reflect your uncertainty in a lower confidence_score (0-100). Provide detailed observations in the analysis section.`;

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.2-11b-vision-preview",
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Analyze this image and return the estimated geographical coordinates matching our required JSON formatting rules exactly."
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: base64Image
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.2
            })
        });

        if (!groqResponse.ok) {
         const errorData = await groqResponse.text();
         console.error("Groq API Error:", errorData);
         return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to process image via Vision API.", 
        details: errorData 
        }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" }
        });
      }

        const groqData = await groqResponse.json();

        let parsedResult;
        try {
            const contentString = groqData.choices?.[0]?.message?.content || "{}";
            parsedResult = JSON.parse(contentString);
        } catch (parseError) {
            console.error("Failed to parse LLM JSON output:", parseError, groqData);
            parsedResult = {};
        }

        // Defensive Programming Sanitization - Fallback mapping
        const responsePayload = {
            success: true,
            source: "LLM_Fallback",
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
