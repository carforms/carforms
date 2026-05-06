## Logo oben links einbauen

Das hochgeladene CF-Auto-Logo (`IMG_7822.JPG`) ersetzt den aktuellen Text-Platzhalter „CF" in der Kopfzeile und bleibt wie bisher per Klick mit der Startseite verlinkt.

### Schritte

1. **Logo ins Projekt kopieren**
   - `user-uploads://IMG_7822.JPG` → `src/assets/logo-carforms.png`
   - Speicherort `src/assets/` ermöglicht optimiertes Bundling über den ES-Import.

2. **Header anpassen** (`src/components/Header.tsx`)
   - Import hinzufügen: `import logoUrl from "@/assets/logo-carforms.png";`
   - Den `<Link to="/">`-Block ersetzen: statt des „CF"-Textes ein `<img src={logoUrl} alt="carforms" />`.
   - Logo wird auf eine angenehme Höhe skaliert (`h-9 w-auto`), Klick führt weiterhin zu `/`.
   - Da die Datei einen weißen Hintergrund hat, dezentes Helligkeits-Tweak via Tailwind (z. B. `object-contain`) – der dunkle Header zeigt das schwarze Logo dann auf weißem Mini-Plate. Falls gewünscht, kann das Logo später als reines SVG/PNG mit transparentem Hintergrund nachgereicht werden.

3. **Favicon / Meta** (optional in diesem Schritt)
   - Vorerst keine Favicon-Änderung – nur das sichtbare Header-Logo wird ersetzt.

### Ergebnis
Oben links erscheint das Auto-„CF"-Logo statt der Textmarke; Klick darauf öffnet `/` (Home).
