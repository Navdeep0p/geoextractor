import { useState } from 'react';
import type { Coordinates, ExifData, APIResponse } from '../types';
import { parseExifData, fileToBase64 } from '../utils/exifParser';

export type ProcessingStatus = 'idle' | 'parsing' | 'exif-match' | 'ai-processing' | 'ai-match' | 'error';

interface ProcessorState {
  status: ProcessingStatus;
  coordinates: Coordinates | null;
  exifData: ExifData | null;
  apiData: APIResponse | null;
  error: string | null;
  imageUrl: string | null;
}

export const useGeoProcessor = () => {
  const [state, setState] = useState<ProcessorState>({
    status: 'idle',
    coordinates: null,
    exifData: null,
    apiData: null,
    error: null,
    imageUrl: null,
  });

  const reset = () => {
    setState({
      status: 'idle',
      coordinates: null,
      exifData: null,
      apiData: null,
      error: null,
      imageUrl: null,
    });
  };

  const processImage = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);

    setState(prev => ({
      ...prev,
      status: 'parsing',
      error: null,
      imageUrl: objectUrl,
      coordinates: null,
      exifData: null,
      apiData: null,
    }));

    try {
      const parsedExif = await parseExifData(file);

      if (parsedExif.coordinates) {
        setState(prev => ({
          ...prev,
          status: 'exif-match',
          coordinates: parsedExif.coordinates!,
          exifData: parsedExif,
        }));
        return;
      }

      // Fallback to API
      setState(prev => ({ ...prev, status: 'ai-processing', exifData: parsedExif }));
      const base64Image = await fileToBase64(file);

      const apiUrl = import.meta.env.VITE_SUPABASE_FUNCTION_URL;
      if (!apiUrl) {
        throw new Error('VITE_SUPABASE_FUNCTION_URL is not defined in environment variables.');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data: APIResponse = await response.json();

      if (data.success && data.estimated_location?.coordinates) {
         setState(prev => ({
           ...prev,
           status: 'ai-match',
           coordinates: data.estimated_location.coordinates,
           apiData: data
         }));
      } else {
         throw new Error('API returned unsuccessful response or missing coordinates');
      }

    } catch (error: any) {
      console.error('Processing error:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message || 'An unknown error occurred.',
      }));
    }
  };

  return { ...state, processImage, reset };
};
