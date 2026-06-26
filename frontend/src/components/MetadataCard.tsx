
import type { ExifData, APIResponse } from '../types';
import { StatusBadge } from './StatusBadge';
import type { ProcessingStatus } from '../hooks/useGeoProcessor';
import { Camera, Calendar, Maximize, MapPin, Search } from 'lucide-react';

interface MetadataCardProps {
  exifData: ExifData | null;
  apiData: APIResponse | null;
  status: ProcessingStatus;
  error: string | null;
}

export const MetadataCard: React.FC<MetadataCardProps> = ({ exifData, apiData, status, error }) => {
  return (
    <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Image Analysis</h2>
        <StatusBadge status={status} />
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {exifData && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">EXIF Metadata</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 text-neutral-200">
              <Camera className="w-5 h-5 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Camera Model</p>
                <p className="text-sm font-medium">{exifData.cameraModel || 'Unknown'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-neutral-200">
              <Calendar className="w-5 h-5 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Date</p>
                <p className="text-sm font-medium">{exifData.date || 'Unknown'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-neutral-200">
              <Maximize className="w-5 h-5 text-neutral-500" />
              <div>
                <p className="text-xs text-neutral-500">Focal Length</p>
                <p className="text-sm font-medium">{exifData.focalLength || 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {apiData && (
        <div className="space-y-4 pt-4 border-t border-neutral-700">
          <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider flex items-center gap-2">
            <Search className="w-4 h-4" /> AI Analysis (Confidence: {apiData.confidence_score}%)
          </h3>

          <div className="space-y-3">
            <div className="flex items-start space-x-3 text-neutral-200">
               <MapPin className="w-5 h-5 text-neutral-500 mt-0.5" />
               <div>
                  <p className="text-xs text-neutral-500">Estimated Location</p>
                  <p className="text-sm font-medium">{apiData.estimated_location.city}, {apiData.estimated_location.country}</p>
               </div>
            </div>

            <div className="bg-neutral-900/50 rounded-lg p-3 space-y-2 text-sm text-neutral-300">
              <p><strong className="text-neutral-500 font-normal">Architecture:</strong> {apiData.analysis.architecture}</p>
              <p><strong className="text-neutral-500 font-normal">Flora:</strong> {apiData.analysis.flora}</p>
              <p><strong className="text-neutral-500 font-normal">Signage:</strong> {apiData.analysis.signage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
