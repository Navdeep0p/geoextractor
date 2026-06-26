export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ExifData {
  cameraModel?: string;
  date?: string;
  focalLength?: string;
  coordinates?: Coordinates;
}

export interface APIResponse {
  success: boolean;
  source: string;
  estimated_location: {
    country: string;
    city: string;
    coordinates: Coordinates;
  };
  confidence_score: number;
  analysis: {
    architecture: string;
    flora: string;
    signage: string;
  };
}
