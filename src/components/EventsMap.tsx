import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet expects filesystem paths that Vite doesn't resolve)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const yellowIcon = L.divIcon({
  className: "carforms-marker",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#f5c518;border:2px solid #000;box-shadow:0 0 0 2px #f5c518aa;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// keep default icon usable as fallback
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export type MapEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  lat: number;
  lng: number;
  website?: string;
};

export function EventsMap({ events }: { events: MapEvent[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <MapContainer
        center={[51.3, 10.4]}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: "420px", width: "100%", background: "#0b0b0b" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {events.map((e) => (
          <Marker key={e.id} position={[e.lat, e.lng]} icon={yellowIcon}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>{e.title}</strong>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{e.date}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{e.location}</div>
                {e.website && (
                  <a
                    href={e.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#f5c518", fontWeight: 600, fontSize: 12 }}
                  >
                    Jetzt anmelden →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
