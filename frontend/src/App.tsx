
import { useGeoProcessor } from './hooks/useGeoProcessor';
import { Uploader } from './components/Uploader';
import { MetadataCard } from './components/MetadataCard';
import { Map } from './components/Map';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in react-leaflet
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  const {
    processImage,
    status,
    coordinates,
    exifData,
    apiData,
    error,
    imageUrl
  } = useGeoProcessor();

  const isProcessing = status === 'parsing' || status === 'ai-processing';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-900 text-neutral-100">

      {/* Left Column - Controls & Metadata */}
      <div className="w-full md:w-1/3 lg:w-[450px] flex flex-col h-screen overflow-y-auto border-r border-neutral-800 bg-neutral-900 z-10 shadow-2xl">
        <div className="p-6 space-y-8 flex-1">

          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
              Geo Extractor
            </h1>
            <p className="text-neutral-400 text-sm">
              Upload an image to extract GPS coordinates or use AI to estimate the location based on visual landmarks.
            </p>
          </div>

          <div className="space-y-4">
            <Uploader
              onImageSelect={processImage}
              disabled={isProcessing}
            />

            {imageUrl && (
              <div className="rounded-xl overflow-hidden border border-neutral-800 bg-black/50 aspect-video relative">
                <img
                  src={imageUrl}
                  alt="Uploaded preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          {(status !== 'idle' || exifData || apiData) && (
            <MetadataCard
              exifData={exifData}
              apiData={apiData}
              status={status}
              error={error}
            />
          )}

        </div>
      </div>

      {/* Right Column - Map Canvas */}
      <div className="flex-1 h-[50vh] md:h-screen relative bg-neutral-950">
        <Map coordinates={coordinates} />
      </div>

    </div>
  );
}

export default App;
