import { useEffect, useState } from 'react';
import type { Coordinates } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

interface MapProps {
  coordinates: Coordinates | null;
}

// Custom hook to update map view when coordinates change
const MapUpdater = ({ coords }: { coords: Coordinates }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([coords.lat, coords.lng], 13);
  }, [coords, map]);
  return null;
};

export const Map = ({ coordinates }: MapProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-full w-full bg-neutral-800 animate-pulse" />;

  if (!coordinates) {
    return (
      <div className="h-full w-full bg-neutral-900 flex items-center justify-center border-l border-neutral-800">
        <p className="text-neutral-500 text-lg">Upload an image to view location</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[coordinates.lat, coordinates.lng]}
      zoom={13}
      className="h-full w-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater coords={coordinates} />
      <Marker position={[coordinates.lat, coordinates.lng]}>
        <Popup>
          Estimated Location
        </Popup>
      </Marker>
    </MapContainer>
  );
};
