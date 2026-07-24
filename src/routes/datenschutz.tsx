import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/datenschutz")({
  component: DatenschutzPage,
  head: () => ({
    meta: [
      { title: "Datenschutzerklärung – Carforms" },
      {
        name: "description",
        content:
          "Informationen zur Verarbeitung personenbezogener Daten auf Carforms nach DSGVO: Verantwortlicher, Dienstleister, Cookies, Rechte der Nutzer.",
      },
      { property: "og:title", content: "Datenschutzerklärung – Carforms" },
      {
        property: "og:description",
        content: "Wie Carforms personenbezogene Daten nach DSGVO verarbeitet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://carforms.de/datenschutz" }],
  }),
});

function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <article className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
        <header className="mb-10 border-b border-white/10 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Datenschutzerklärung
          </h1>
          <p className="mt-3 text-sm text-neutral-400">Stand: [Datum einfügen]</p>
        </header>

        <div className="space-y-10 text-[15px] leading-relaxed text-neutral-300">
          <Section title="1. Verantwortlicher">
            <p>
              Verantwortlich für die Datenverarbeitung auf dieser Website (im Sinne
              der DSGVO) ist:
            </p>
            <address className="not-italic mt-3 text-neutral-200">
              [Firmenname / Carforms GbR bzw. UG]
              <br />
              [Straße, Hausnummer]
              <br />
              [PLZ, Ort]
              <br />
              Deutschland
              <br />
              <br />
              E-Mail:{" "}
              <a
                href="mailto:mail.carforms@gmail.com"
                className="text-yellow-400 underline hover:text-yellow-300"
              >
                mail.carforms@gmail.com
              </a>
              <br />
              [Telefonnummer, falls vorhanden]
            </address>
            <p className="mt-3">Vertreten durch: [Clarice ..., Mandy Schwarz]</p>
          </Section>

          <Section title="2. Allgemeines zur Datenverarbeitung">
            <p>
              Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich
              nur, soweit dies zur Bereitstellung einer funktionsfähigen Website
              sowie unserer Inhalte und Leistungen erforderlich ist. Die
              Verarbeitung erfolgt regelmäßig nur nach Einwilligung der Nutzer oder
              auf Basis einer anderen gesetzlichen Erlaubnis (Art. 6 Abs. 1 DSGVO).
            </p>
          </Section>

          <Section title="3. Hosting und Server-Log-Dateien">
            <p>
              Diese Website wird bei [Hosting-Anbieter einfügen] gehostet. Beim
              Aufruf unserer Website erfasst unser Hosting-Anbieter automatisch
              Informationen in sogenannten Server-Log-Dateien, die Ihr Browser
              übermittelt. Dies sind:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>IP-Adresse</li>
              <li>Datum und Uhrzeit der Anfrage</li>
              <li>Browsertyp und -version</li>
              <li>verwendetes Betriebssystem</li>
              <li>Referrer-URL</li>
              <li>Uhrzeit der Serveranfrage</li>
            </ul>
            <p className="mt-3">
              Diese Daten sind nicht bestimmten Personen zuordenbar.
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
              Interesse an der technisch fehlerfreien Darstellung und Optimierung
              unserer Website).
            </p>
          </Section>

          <Section title="4. Datenverarbeitung durch eingesetzte Dienstleister (Auftragsverarbeiter)">
            <p>
              Zur Bereitstellung unserer Plattform nutzen wir folgende Dienste, mit
              denen jeweils Auftragsverarbeitungsverträge (Art. 28 DSGVO)
              geschlossen wurden bzw. deren Standardvertragsklauseln gelten:
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-white">
                  Supabase (Datenbank- und Backend-Infrastruktur)
                </h3>
                <p className="mt-1">
                  Nutzer- und Plattformdaten (z. B. Profil-, Event-,
                  Marktplatzdaten) werden über Supabase gespeichert und verwaltet.
                  Supabase kann Server außerhalb der EU nutzen; in diesem Fall
                  stellen Standardvertragsklauseln (SCC) ein angemessenes
                  Datenschutzniveau sicher. Weitere Informationen: [Link zur
                  Supabase-Datenschutzerklärung]
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  Cloudinary (Bild- und Medienhosting)
                </h3>
                <p className="mt-1">
                  Von Nutzern hochgeladene Bilder (z. B. Fahrzeugfotos,
                  Profilbilder) werden über Cloudinary gespeichert und
                  ausgeliefert. Cloudinary kann Server in den USA nutzen; die
                  Übermittlung erfolgt auf Basis von Standardvertragsklauseln.
                  Weitere Informationen: [Link zur Cloudinary-Datenschutzerklärung]
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white">Resend (E-Mail-Versand)</h3>
                <p className="mt-1">
                  Für den Versand von Transaktions-E-Mails (z. B.
                  Registrierungsbestätigung, Benachrichtigungen) nutzen wir Resend.
                  Hierbei werden die E-Mail-Adresse sowie ggf. Name des Empfängers
                  verarbeitet. Weitere Informationen: [Link zur
                  Resend-Datenschutzerklärung]
                </p>
              </div>
            </div>
            <p className="mt-4">
              Rechtsgrundlage für den Einsatz dieser Dienstleister ist Art. 6 Abs.
              1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. f DSGVO
              (berechtigtes Interesse am technischen Betrieb der Plattform).
            </p>
          </Section>

          <Section title="5. Registrierung und Nutzerkonto">
            <p>Bei der Registrierung eines Nutzerkontos erheben wir folgende Daten:</p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>E-Mail-Adresse</li>
              <li>Benutzername / Anzeigename</li>
              <li>Passwort (verschlüsselt gespeichert)</li>
              <li>
                ggf. weitere freiwillige Profilangaben (z. B. Profilbild,
                Fahrzeugdaten, Standort)
              </li>
            </ul>
            <p className="mt-3">
              Diese Daten werden zur Bereitstellung des Nutzerkontos und der
              Plattformfunktionen (Community, Marktplatz, Events, Werkstattsuche)
              verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
              (Erfüllung des Nutzungsvertrags).
            </p>
          </Section>

          <Section title="6. Inhalte, die Nutzer selbst veröffentlichen">
            <p>
              Beiträge, Kommentare, Bilder, Marktplatz-Anzeigen und Forenbeiträge,
              die Nutzer aktiv veröffentlichen, sind für andere Nutzer bzw. ggf.
              öffentlich sichtbar. Nutzer sollten selbst darauf achten, welche
              personenbezogenen Daten sie in solchen Inhalten preisgeben.
            </p>
          </Section>

          <Section title="7. Kontaktformular / Kontaktaufnahme per E-Mail">
            <p>
              Wenn Sie uns per Kontaktformular oder E-Mail kontaktieren, werden
              Ihre Angaben (z. B. Name, E-Mail-Adresse, Nachrichtentext) zur
              Bearbeitung Ihrer Anfrage gespeichert. Rechtsgrundlage ist Art. 6
              Abs. 1 lit. b DSGVO bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
              Interesse an der Beantwortung von Anfragen).
            </p>
          </Section>

          <Section title="8. Cookies">
            <p>
              Unsere Website verwendet Cookies. Cookies sind kleine Textdateien,
              die auf Ihrem Endgerät gespeichert werden.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-white">Technisch notwendige Cookies</strong>{" "}
                (z. B. zur Aufrechterhaltung der Anmeldesitzung) werden auf Basis
                von Art. 6 Abs. 1 lit. f DSGVO bzw. § 25 Abs. 2 TTDSG eingesetzt.
              </li>
              <li>
                <strong className="text-white">Optionale Cookies</strong> (z. B.
                Statistik/Analyse, Marketing) werden nur mit Ihrer Einwilligung
                gesetzt (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TTDSG). Sie können
                Ihre Einwilligung jederzeit über die Cookie-Einstellungen
                (Footer/Cookie-Icon unten links) widerrufen bzw. anpassen.
              </li>
            </ul>
            <p className="mt-3 text-neutral-400">
              [Falls Analyse-Tools wie Google Analytics genutzt werden, hier
              ergänzen: Anbieter, Zweck, Rechtsgrundlage, Widerspruchsmöglichkeit.]
            </p>
          </Section>

          <Section title="9. Ihre Rechte als betroffene Person">
            <p>Sie haben jederzeit das Recht auf:</p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Auskunft über die von uns verarbeiteten personenbezogenen Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
              <li>Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)</li>
            </ul>
            <p className="mt-3">
              Zur Ausübung dieser Rechte genügt eine formlose Mitteilung an:{" "}
              <a
                href="mailto:mail.carforms@gmail.com"
                className="text-yellow-400 underline hover:text-yellow-300"
              >
                mail.carforms@gmail.com
              </a>
            </p>
            <p className="mt-3">
              Zudem besteht ein Beschwerderecht bei einer
              Datenschutzaufsichtsbehörde, z. B. bei der Berliner Beauftragten für
              Datenschutz und Informationsfreiheit.
            </p>
          </Section>

          <Section title="10. Speicherdauer">
            <p>
              Personenbezogene Daten werden nur so lange gespeichert, wie dies für
              die jeweiligen Zwecke erforderlich ist, oder solange gesetzliche
              Aufbewahrungspflichten bestehen. Nach Löschung eines Nutzerkontos
              werden die zugehörigen Daten gelöscht, soweit keine gesetzlichen
              Aufbewahrungsfristen entgegenstehen.
            </p>
          </Section>

          <Section title="11. Änderungen dieser Datenschutzerklärung">
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie
              an geänderte Rechtslagen oder bei Änderungen unserer Leistungen
              anzupassen. Die jeweils aktuelle Fassung ist auf dieser Seite
              abrufbar.
            </p>
          </Section>
        </div>

        <footer className="mt-16 border-t border-white/10 pt-6 text-sm text-neutral-400">
          <Link to="/" className="hover:text-yellow-400">
            ← Zurück zur Startseite
          </Link>
        </footer>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
