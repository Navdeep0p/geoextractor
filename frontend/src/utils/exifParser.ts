import * as ExifReader from 'exifreader';
import type { ExifData, Coordinates } from '../types';

export const parseExifData = async (file: File): Promise<ExifData> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);

    let coordinates: Coordinates | undefined = undefined;

    if (tags['GPSLatitude'] && tags['GPSLongitude']) {
      const lat = tags['GPSLatitude'].description;
      const lng = tags['GPSLongitude'].description;

      if (lat !== undefined && lng !== undefined) {
         coordinates = {
             lat: typeof lat === 'number' ? lat : parseFloat(lat),
             lng: typeof lng === 'number' ? lng : parseFloat(lng)
         }
      }
    }

    return {
      cameraModel: tags['Model']?.description,
      date: tags['DateTimeOriginal']?.description || tags['DateTime']?.description,
      focalLength: tags['FocalLength']?.description,
      coordinates
    };
  } catch (error) {
    console.error('Error parsing EXIF data:', error);
    return {};
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
