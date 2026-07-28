# GeoExtractor 🌍📌

GeoExtractor is a web application designed to extract EXIF metadata—specifically geographical coordinates and photo details—from images, visualize the metadata on an interactive map, and process spatial information using Supabase Edge Functions.

---

## 🛠 Project Structure

The repository is organized into a frontend React application powered by Vite and a backend serverless setup using Supabase Functions.

```text
geoextractor/
├── .github/
│   └── workflows/
│       └── deploy-supabase.yml    # CI/CD workflow for Supabase function deployment
├── frontend/                       # React + TypeScript + Vite frontend
│   ├── public/                     # Static assets and icons
│   ├── src/
│   │   ├── assets/                # Visual assets (images, logos)
│   │   ├── components/            # UI Components
│   │   │   ├── Map.tsx            # Interactive map visualization
│   │   │   ├── MetadataCard.tsx   # EXIF metadata extraction display
│   │   │   ├── StatusBadge.tsx    # Operational status indicators
│   │   │   └── Uploader.tsx       # Drag-and-drop / file upload component
│   │   ├── hooks/
│   │   │   └── useGeoProcessor.ts # Custom React hook for edge function processing
│   │   ├── utils/
│   │   │   └── exifParser.ts      # Utility functions to parse EXIF metadata
│   │   ├── App.tsx                # Main Application Layout
│   │   ├── main.tsx               # App entry point
│   │   └── types.ts               # TypeScript interfaces & types
│   ├── .env                       # Frontend environment configuration
│   ├── package.json               # Dependencies & scripts
│   └── vite.config.ts             # Vite configuration
├── supabase/
│   └── functions/
│       └── geo-processor/         # Supabase Edge Function (Deno/TypeScript)
│           └── index.ts           # Geo processing handler
└── AGENTS.md                      # Developer / AI agent instructions
```

---

## ✨ Features

- **Image EXIF Extraction:** Client-side parsing of image metadata including GPS coordinates, camera specs, timestamp, and dimensions.
- **Interactive Map:** Displays photo geolocation with pin markers on an interactive map interface.
- **Supabase Edge Processing:** Serverless API integration via `geo-processor` function for extended geospatial computation and backend integration.
- **Modern UI/UX:** Fast, responsive UI built with React, TypeScript, and Vite.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` or `yarn`
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local backend development)

---

### Local Setup & Development

#### 1. Frontend Setup

Navigate into the `frontend` directory and install dependencies:

```bash
cd frontend
npm install
```

Set up environment variables:

Create or inspect `.env` in the `frontend` directory:

```env
VITE_SUPABASE_FUNCTION_URL=http://127.0.0.1:54321/functions/v1/geo-processor
```

Start the Vite development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

#### 2. Backend / Supabase Edge Function Setup

To run the Supabase function locally:

```bash
supabase start
supabase functions serve geo-processor
```

---

## 📜 Available Scripts (Frontend)

- `npm run dev` — Start local development server.
- `npm run build` — Build the application for production.
- `npm run preview` — Preview the production build locally.
- `npm run lint` / `oxlint` — Run linter checks.

---

## 🚢 Deployment

### Supabase Edge Functions
                                                        

A GitHub Action workflow is configured under `.github/workflows/deploy-supabase.yml` to automatically deploy the `geo-processor` function upon commits to the main branch. Ensure the required Supabase credentials (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`) are configured in your repository secrets.

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE.md) file for details.
