
import type { ProcessingStatus } from '../hooks/useGeoProcessor';
import { CheckCircle, AlertCircle, Loader2, MapPin } from 'lucide-react';

export const StatusBadge: React.FC<{ status: ProcessingStatus }> = ({ status }) => {
  switch (status) {
    case 'idle':
      return null;
    case 'parsing':
      return (
        <div className="flex items-center space-x-2 text-neutral-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Parsing metadata...</span>
        </div>
      );
    case 'exif-match':
      return (
        <div className="flex items-center space-x-2 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Local EXIF Match</span>
        </div>
      );
    case 'ai-processing':
      return (
        <div className="flex items-center space-x-2 text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">AI Fallback Processing...</span>
        </div>
      );
    case 'ai-match':
      return (
        <div className="flex items-center space-x-2 text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full border border-purple-400/20">
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-medium">Estimated via AI</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 px-3 py-1 rounded-full border border-red-400/20">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Processing Error</span>
        </div>
      );
  }
};
