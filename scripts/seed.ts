/**
 * Seed script: inserts 10 demo users (profiles) and 20 demo car-themed posts in German.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/seed.ts
 *
 * The service role key bypasses RLS. Do NOT commit secrets.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const profiles = [
  { username: "max_motorsport", display_name: "Max Berger", bio: "Schraubt seit 20 Jahren an alten BMWs.", location: "München" },
  { username: "lena_drives", display_name: "Lena Hoffmann", bio: "Roadtrip-Enthusiastin. Mein Bulli und ich.", location: "Hamburg" },
  { username: "tobi_turbo", display_name: "Tobias Krüger", bio: "Tuning, Trackdays, Tschüss Reifen.", location: "Stuttgart" },
  { username: "annika_ev", display_name: "Annika Roth", bio: "EV-Fahrerin der ersten Stunde. Model 3 Performance.", location: "Berlin" },
  { username: "klassiker_klaus", display_name: "Klaus Weber", bio: "Mercedes W123 fahren ist Therapie.", location: "Köln" },
  { username: "sara_offroad", display_name: "Sara Lindemann", bio: "Defender, Schlamm, Gute Laune.", location: "Hannover" },
  { username: "jonas_jdm", display_name: "Jonas Albers", bio: "Skyline-Träumer. Importiere alles aus Japan.", location: "Düsseldorf" },
  { username: "marie_motors", display_name: "Marie Fischer", bio: "Kfz-Mechatronikerin & Caffè Racer.", location: "Leipzig" },
  { username: "ricardo_drift", display_name: "Ricardo Pérez", bio: "Hauptsache quer. E36 mit LSD.", location: "Frankfurt" },
  { username: "felix_oldtimer", display_name: "Felix Wagner", bio: "Käfer, Bullis, alles luftgekühlt.", location: "Nürnberg" },
];

const posts = [
  { title: "Endlich fertig: Mein E30 nach 4 Jahren Restauration", body: "Heute zum ersten Mal eingetragen! Komplettlackierung in Diamantschwarz, M50-Swap und Coilovers. Bin überglücklich." },
  { title: "Erfahrungen mit dem ID.7 nach 10.000 km", body: "Reichweite real ca. 480 km im Sommer, im Winter eher 350. Verarbeitung top, Software immer noch zäh. Was meint ihr?" },
  { title: "Reifenempfehlung für Trackday am Hockenheimring?", body: "Fahre einen Cayman GT4. Bisher Cup 2, aber neue Sätze sind teuer geworden. Alternative Vorschläge?" },
  { title: "Mein erster Roadtrip mit dem T3 nach Italien", body: "1.600 km, 0 Pannen, unzählige Espresso. Der alte Bulli hat sich tapfer geschlagen. Bilder folgen." },
  { title: "Welcher Kompakte für die Stadt? Polo, Fiesta oder Yaris?", body: "Brauche etwas Sparsames für den Pendelverkehr in Berlin. Maximal 15.000 €, Baujahr ab 2020." },
  { title: "Ölwechsel selber machen: Anleitung für Anfänger", body: "Habt ihr eine gute Schritt-für-Schritt-Anleitung für den 1.4 TSI? Welches Werkzeug brauche ich wirklich?" },
  { title: "Tesla Model 3 vs. BMW i4 – mein direkter Vergleich", body: "Bin beide eine Woche gefahren. Fahrwerk klar BMW, Software klar Tesla. Spoiler: ich nehme den i4." },
  { title: "Cars & Coffee Stuttgart am Sonntag", body: "Wer kommt? Treffpunkt 9 Uhr Karl-Benz-Platz. Bringt eure Klassiker und Youngtimer mit!" },
  { title: "Mercedes W123 240D – Kaufberatung gesucht", body: "Habe ein Angebot für 8.500 €, 280.000 km, lückenloses Scheckheft. Lohnt sich das noch?" },
  { title: "Defender 110 in den Alpen – Sommertour 2026", body: "Drei Wochen, neun Pässe, ein Platten. Wenn ihr Fragen zur Route habt, fragt einfach." },
  { title: "Skyline R34 GT-R nach Deutschland importieren", body: "Hat das jemand vor kurzem gemacht? Welche Hürden bei TÜV und Eintragung sind realistisch?" },
  { title: "Café Racer Umbau aus einer Honda CB500", body: "Tank lackiert, Sitzbank neu, Auspuff kommt nächste Woche. Werde alles dokumentieren." },
  { title: "Drift-Training auf dem Lausitzring – mein Erfahrungsbericht", body: "Erstes Mal überhaupt quer gefahren. Instruktoren top, Reifen am Ende des Tages durch." },
  { title: "VW Käfer 1303 Bj. 1973 – frische Restauration", body: "Bodenplatten neu, Motor revidiert, jetzt fehlt nur noch die Innenausstattung. Empfehlungen?" },
  { title: "EV-Laden im Winter: Tipps gegen Reichweitenverlust", body: "Vorheizen via App, max. 80 % laden, Bremsenergie nutzen. Was sind eure Tricks?" },
  { title: "Werkstatt-Empfehlung im Raum Köln gesucht", body: "Brauche eine ehrliche Werkstatt für meinen E46 330i. Keine Ketten bitte." },
  { title: "Motor-Tuning E36: Welcher Krümmer macht Sinn?", body: "Habe einen 325i mit M50-Manifold-Swap. Lohnt sich der Wechsel auf einen Schrick-Krümmer?" },
  { title: "Mein neuer Daily: Audi A4 Avant B9 TDI", body: "8.000 € investiert, 180.000 km, läuft wie ein Uhrwerk. Bisher null Probleme nach 2 Monaten." },
  { title: "Frage zur HU: Rost am Schweller – kritisch?", body: "Prüfer hat Mängel notiert. Wie viel Aufwand ist eine Schweller-Reparatur realistisch?" },
  { title: "Porsche 911 (964) – Versicherungstipps für Youngtimer", body: "Welche Versicherer sind fair für Liebhaberfahrzeuge mit km-Begrenzung? Erfahrungen willkommen?" },
];

function randomCreatedAt(): string {
  // Spread over the last 30 days
  const now = Date.now();
  const offsetMs = Math.random() * 30 * 24 * 60 * 60 * 1000;
  return new Date(now - offsetMs).toISOString();
}

async function main() {
  console.log("Creating auth users…");
  // profiles.id has a FK to auth.users.id. Create auth users first; the
  // handle_new_user trigger seeds a profile row, which we then update.
  const profileIds: string[] = [];
  for (const p of profiles) {
    const email = `${p.username}@demo.carforms.de`;
    const { data: created, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        username: p.username,
        display_name: p.display_name,
      },
    });
    if (authErr || !created.user) {
      console.error(`Auth create failed for ${p.username}:`, authErr);
      process.exit(1);
    }
    const uid = created.user.id;
    profileIds.push(uid);

    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        username: p.username,
        display_name: p.display_name,
        bio: p.bio,
        location: p.location,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`,
      })
      .eq("id", uid);
    if (updErr) {
      console.error(`Profile update failed for ${p.username}:`, updErr);
      process.exit(1);
    }
  }
  console.log(`Created ${profileIds.length} auth users + profiles.`);

  console.log("Inserting posts…");

  const postRows = posts.map((post) => ({
    author_id: profileIds[Math.floor(Math.random() * profileIds.length)],
    title: post.title,
    body: post.body,
    created_at: randomCreatedAt(),
  }));

  const { data: insertedPosts, error: postError } = await supabase
    .from("posts")
    .insert(postRows)
    .select("id");

  if (postError) {
    console.error("Post insert failed:", postError);
    process.exit(1);
  }
  console.log(`Inserted ${insertedPosts?.length ?? 0} posts.`);
  console.log("Seed complete ✅");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
