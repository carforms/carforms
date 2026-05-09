import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;
const map: Record<string, string> = {
  "Endlich fertig: Mein E30 nach 4 Jahren Restauration": img("1542362567-b07e54358753"),
  "Erfahrungen mit dem ID.7 nach 10.000 km": img("1605559424843-9e4c228bf1c2"),
  "Reifenempfehlung für Trackday am Hockenheimring?": img("1494976388531-d1058494cdd8"),
  "Mein erster Roadtrip mit dem T3 nach Italien": img("1503736334956-4c8f8e92946d"),
  "Welcher Kompakte für die Stadt? Polo, Fiesta oder Yaris?": img("1549399542-7e3f8b79c341"),
  "Ölwechsel selber machen: Anleitung für Anfänger": img("1486262715619-67b85e0b08d3"),
  "Tesla Model 3 vs. BMW i4 – mein direkter Vergleich": img("1523983254932-c7e6571c9d60"),
  "Cars & Coffee Stuttgart am Sonntag": img("1503376780353-7e6692767b70"),
  "Mercedes W123 240D – Kaufberatung gesucht": img("1502877338535-766e1452684a"),
  "Defender 110 in den Alpen – Sommertour 2026": img("1568772585407-9361f9bf3a87"),
  "Skyline R34 GT-R nach Deutschland importieren": img("1606664515524-ed2f786a0bd6"),
  "Café Racer Umbau aus einer Honda CB500": img("1558981403-c5f9899a28bc"),
  "Drift-Training auf dem Lausitzring – mein Erfahrungsbericht": img("1493238792000-8113da705763"),
  "VW Käfer 1303 Bj. 1973 – frische Restauration": img("1471444928139-48c5bf5173f8"),
  "EV-Laden im Winter: Tipps gegen Reichweitenverlust": img("1593941707882-a5bba14938c7"),
  "Werkstatt-Empfehlung im Raum Köln gesucht": img("1632823471565-1ecdf5c6d7fb"),
  "Motor-Tuning E36: Welcher Krümmer macht Sinn?": img("1547038577-da80abbc4f19"),
  "Mein neuer Daily: Audi A4 Avant B9 TDI": img("1606152421802-db97b9c7a11b"),
  "Frage zur HU: Rost am Schweller – kritisch?": img("1517524008697-84bbe3c3fd98"),
  "Porsche 911 (964) – Versicherungstipps für Youngtimer": img("1503376780353-7e6692767b70"),
};
let n = 0;
for (const [title, url] of Object.entries(map)) {
  const { error, count } = await supabase.from("posts").update({ image_url: url }, { count: "exact" }).eq("title", title);
  if (error) { console.error(title, error); continue; }
  n += count ?? 0;
}
console.log(`Updated ${n} rows`);
