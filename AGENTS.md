"""# AGENTS.md - Context & System Rules for AI Coding Partners

Welcome, agent! You are collaborating on **Geo Extractor**, a lightweight, high-fidelity web application designed to extract EXIF metadata from uploaded images to plot their coordinates on an interactive map. If the EXIF data is missing or stripped, the application triggers a serverless fallback pipeline that passes the image payload to a vision LLM to estimate the location based on visual landmarks, architectural styles, topography, flora, and environmental clues.

---

## 👥 1. The Team & Roles

* **User (Lead Backend Engineer):** Responsible for Supabase architecture, Edge Functions, database schema, data models, error handling, and Groq API orchestration.
* **Teammate (Frontend Engineer):** Responsible for building the UI canvas using **Google Stitch** to generate high-fidelity React + Tailwind CSS components.

---

## 🛠️ 2. Tech Stack & Infrastructure Environment

* **Frontend Ecosystem:** React, Tailwind CSS. Design system, responsive grids, and layout tokens are derived directly from Google Stitch visual blueprints.
* **Client-Side Metadata Parsing:** `exifreader` (or vanilla JS equivalent) executed inside the browser to parse local files before server upload.
* **Backend Runtime:** Supabase Edge Functions executing on a **Deno (TypeScript)** runtime environment.
* **Core AI Inference:** Groq Cloud Vision API using highly accelerated models like `qwen-2.5-vl-72b` or `llama-3.2-11b-vision-preview`.

---

## 🔌 3. The Core API Contract

All code modifications to the backend proxy layers or frontend state consumers **must** strictly adhere to this exact JSON data handshake. Do not modify key naming conventions, text casing, or structural nestings, as doing so will break the integration between the Google Stitch frontend and the Supabase backend.

### 3.1. Inbound Request (Frontend ──► Supabase Edge Function)
Sent over HTTP POST only when client-side EXIF processing fails to find GPS metadata. The raw image is passed as a Base64 data string payload.
