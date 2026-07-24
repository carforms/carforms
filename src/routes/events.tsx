import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  TrendingUp,
  Users,
  Plus,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EventsMap, type MapEvent } from "@/components/EventsMap";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events — Carforms" },
      {
        name: "description",
        content:
          "Track Days, Treffen und Workshops in ganz Deutschland — entdecke kommende Carforms Events.",
      },
      { property: "og:title", content: "Events — Carforms" },
      {
        property: "og:description",
        content: "Track Days, Treffen und Workshops in ganz Deutschland.",
      },
    ],
  }),
  component: EventsPage,
});

type EventCategory = "Track Day" | "Meet & Greet" | "Workshop";

type EventItem = {
  id: string;
  title: string;
  category: EventCategory;
  price: string | null; // null = kostenlos
  description: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  participants: number;
  capacity: number;
  cover: string;
  startDate: string; // ISO YYYY-MM-DD — used for chronological sort
  createdAt: number;
  website?: string;
  lat?: number;
  lng?: number;
};


const NOW = Date.now();
export const SEED_EVENTS: EventItem[] = [
  {
    id: "7",
    startDate: "2026-07-02",
    title: "Syndikat Asphaltfieber",
    category: "Meet & Greet",
    price: "ab 49 €",
    description:
      "Weltgrößtes Treffen für BMW-Fans: Camping, Show & Shine, Racing. 4 Tage von Donnerstagnachmittag bis Sonntagmittag auf dem Flugplatz Obermehler.",
    date: "02.–05. Juli 2026",
    time: "Do 14:00 – So 13:00",
    location: "Flugplatz Obermehler, Thüringen",
    organizer: "Syndikat e.V.",
    participants: 4200,
    capacity: 6000,
    cover:
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=70",
    createdAt: NOW + 1 * 60_000,
    lat: 51.2862,
    lng: 10.7173,
    website: "https://www.bmw-syndikat.de/",
  },
  {
    id: "8",
    startDate: "2026-07-30",
    title: "Reisbrennen 2026 — Lausitzring",
    category: "Track Day",
    price: "ab 79 €",
    description:
      "Das 22. Reisbrennen auf Deutschlands modernster Rennstrecke. Internationales Treffen für japanische Fahrzeuge und Fans der JDM-Importszene aus ganz Europa.",
    date: "30. Juli – 02. August 2026",
    time: "ganztägig",
    location: "Lausitzring, Brandenburg",
    organizer: "Reisbrennen",
    participants: 1800,
    capacity: 3000,
    cover:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=70",
    createdAt: NOW + 2 * 60_000,
    lat: 51.5353,
    lng: 14.1281,
    website: "https://www.reisbrennen.de/",
  },
  {
    id: "9",
    startDate: "2026-07-31",
    title: "Classic Days / Grand Meeting",
    category: "Meet & Greet",
    price: "ab 35 €",
    description:
      "Eine der größten Oldtimer- und Lifestyle-Veranstaltungen Europas im Stil einer britischen Summer-Gardenparty — über 40.000 Besucher, tausende Fahrzeuge.",
    date: "31. Juli – 02. August 2026",
    time: "10:00 – 19:00",
    location: "Rittergut Birkhof, Korschenbroich (NRW)",
    organizer: "Classic Days",
    participants: 28000,
    capacity: 40000,
    cover:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=70",
    createdAt: NOW + 3 * 60_000,
    lat: 51.1841,
    lng: 6.5222,
    website: "https://www.classic-days.de/",
  },
  {
    id: "10",
    startDate: "2026-08-22",
    title: "Automotive Interiors Expo",
    category: "Workshop",
    price: "Fachbesucher",
    description:
      "Fachmesse für Fahrzeuginnenausstattungen — eher B2B/Fachbesucher, aber relevant für das Design-Netzwerk.",
    date: "22.–23. August 2026",
    time: "09:00 – 17:00",
    location: "Messe Stuttgart, BW",
    organizer: "Automotive Interiors Expo",
    participants: 0,
    capacity: 5000,
    cover: "",
    createdAt: NOW + 4 * 60_000,
    lat: 48.6900,
    lng: 9.1939,
    website: "https://www.automotive-interiors-expo.com/",
  },
  {
    id: "12",
    startDate: "2026-09-06",
    title: "US Car Classics",
    category: "Meet & Greet",
    price: "Tageskarte",
    description:
      "Automobilmesse für klassische amerikanische Fahrzeuge — Publikumsmesse direkt bei Berlin, gut erreichbar.",
    date: "06. September 2026",
    time: "10:00 – 18:00",
    location: "Schloss Diedersdorf, Großbeeren (nahe Berlin)",
    organizer: "US Car Classics",
    participants: 0,
    capacity: 10000,
    cover: "",
    createdAt: NOW + 6 * 60_000,
    lat: 52.3340,
    lng: 13.3950,
    website: "https://www.us-car-classics.de/",
  },
  {
    id: "13",
    startDate: "2026-09-08",
    title: "Automechanika Frankfurt",
    category: "Workshop",
    price: "Fachbesucher",
    description:
      "Leitmesse für Kfz-Ersatzteilmarkt und Aftermarket — über 4.500 Aussteller und mehr als 100.000 Fachbesucher aus 170+ Ländern. B2B/Trade.",
    date: "08.–12. September 2026",
    time: "09:00 – 18:00",
    location: "Messe Frankfurt, HE",
    organizer: "Messe Frankfurt",
    participants: 0,
    capacity: 100000,
    cover: "",
    createdAt: NOW + 7 * 60_000,
    lat: 50.1122,
    lng: 8.6440,
    website: "https://automechanika.messefrankfurt.com/",
  },
  {
    id: "14",
    startDate: "2026-04-24",
    title: "DTM 2026 — Saisonauftakt Red Bull Ring",
    category: "Track Day",
    price: "ab 39 €",
    description:
      "Start der DTM-Saison 2026: Zum ersten Mal eröffnet der Red Bull Ring die Saison. Acht Rennwochenenden in Deutschland, den Niederlanden und Österreich — GT3-Boliden von Audi, BMW, Ferrari, Lamborghini, Mercedes-AMG, Porsche & Co.",
    date: "24.–26. April 2026",
    time: "ganztägig",
    location: "Red Bull Ring, Spielberg (AT)",
    organizer: "ADAC / DTM",
    participants: 0,
    capacity: 90000,
    cover: "",
    createdAt: NOW + 8 * 60_000,
    lat: 47.2197,
    lng: 14.7647,
    website: "https://www.dtm.com/en",
  },
  {
    id: "15",
    startDate: "2026-07-18",
    title: "JDMania Car Event Mendig",
    category: "Meet & Greet",
    price: null,
    description:
      "JDM-Treffen auf einem ehemaligen Militärflugplatz mit entspannter Community-Atmosphäre.",
    date: "18. Juli 2026",
    time: "ganztägig",
    location: "Flugplatz Mendig, 56743 Mendig, Rheinland-Pfalz",
    organizer: "JDMania",
    participants: 0,
    capacity: 3000,
    cover: "",
    createdAt: NOW + 9 * 60_000,
    lat: 50.3667,
    lng: 7.3167,
    website: "https://jdmania.de/",
  },
  {
    id: "16",
    startDate: "2026-09-03",
    title: "German RaceWars",
    category: "Track Day",
    price: "Tageskarte",
    description:
      "Outdoor-Event mit Viertelmeile-Rennen für alle Fahrzeugtypen, DriftWars, Nightrace, Feuerwerk.",
    date: "03.–06. September 2026",
    time: "ganztägig",
    location: "Hörselberg-Hainich, Thüringen",
    organizer: "German RaceWars",
    participants: 0,
    capacity: 15000,
    cover: "",
    createdAt: NOW + 10 * 60_000,
    lat: 50.9833,
    lng: 10.4167,
    website: "https://www.german-racewars.com/",
  },
  {
    id: "17",
    startDate: "2026-09-04",
    title: "Asia Arena Oschersleben",
    category: "Meet & Greet",
    price: "Tageskarte",
    description:
      "Tuningevent mit Fokus auf asiatische Fahrzeugszene, inkl. Cosplay-Programm und Fahrerlager-Präsentationen.",
    date: "04.–06. September 2026",
    time: "ganztägig",
    location: "Motorsport Arena Oschersleben, Sachsen-Anhalt",
    organizer: "Asia Arena",
    participants: 0,
    capacity: 8000,
    cover: "",
    createdAt: NOW + 11 * 60_000,
    lat: 52.0289,
    lng: 11.2789,
    website: "https://www.asia-arena.de/",
  },
  {
    id: "18",
    startDate: "2026-10-10",
    title: "Tuning Masters — Season End",
    category: "Track Day",
    price: "Tageskarte",
    description:
      "Saisonabschluss der Tuningszene am Nürburgring mit AvD Drift Championship Finale, Show & Shine Contest und European Timeattack Masters.",
    date: "10.–11. Oktober 2026",
    time: "ganztägig",
    location: "Nürburgring, Rheinland-Pfalz",
    organizer: "Tuning Masters",
    participants: 0,
    capacity: 20000,
    cover: "",
    createdAt: NOW + 12 * 60_000,
    lat: 50.3356,
    lng: 6.9475,
    website: "https://www.tuningmasters.de/season-end-home/",
  },
  {
    id: "19",
    startDate: "2026-11-27",
    title: "Essen Motor Show",
    category: "Meet & Greet",
    price: "ab 19 €",
    description:
      "Europas führende Messe für Sportwagen, Tuning, Motorsport und Classic Cars mit über 500 Ausstellern.",
    date: "27. November – 06. Dezember 2026",
    time: "09:00 – 18:00",
    location: "Messe Essen, Nordrhein-Westfalen",
    organizer: "Messe Essen",
    participants: 0,
    capacity: 350000,
    cover: "",
    createdAt: NOW + 13 * 60_000,
    lat: 51.4869,
    lng: 6.9836,
    website: "https://www.essen-motorshow.de/automobilmesse/",
  },
  {
    id: "20", startDate: "2026-07-09", title: "10. Havelberger Opeltreffen",
    category: "Meet & Greet", price: null,
    description: "Markenspezifisches Opel-Klassikertreffen.",
    date: "09.–12. Juli 2026", time: "ganztägig",
    location: "Elbstraße, Neuer Festplatz, 39529 Havelberg",
    organizer: "Oldtimerreporter", participants: 0, capacity: 2000, cover: "",
    createdAt: NOW + 14 * 60_000, lat: 52.8281, lng: 12.0761,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "21", startDate: "2026-07-10", title: "28. Oldtimertreffen mit Teilemarkt Perleberg",
    category: "Meet & Greet", price: null,
    description: "Klassikertreffen inklusive Ersatzteil- und Trödelmarkt.",
    date: "10.–11. Juli 2026", time: "ganztägig",
    location: "Motorsportplatz (Flugplatz) an der B189, 19348 Perleberg",
    organizer: "Oldtimerreporter", participants: 0, capacity: 2000, cover: "",
    createdAt: NOW + 15 * 60_000, lat: 53.0736, lng: 11.8578,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "22", startDate: "2026-07-26", title: "Oldtimertreffen am Olympiastadion Berlin (Juli)",
    category: "Meet & Greet", price: null,
    description: "Fester monatlicher Treffpunkt der Berliner Oldtimer-Szene auf dem großen Parkplatz, kostenlos.",
    date: "26. Juli 2026", time: "ab 11:00",
    location: "Olympischer Platz 3, 14053 Berlin",
    organizer: "Oldtimerreporter", participants: 0, capacity: 1500, cover: "",
    createdAt: NOW + 16 * 60_000, lat: 52.5145, lng: 13.2396,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "23", startDate: "2026-08-01", title: "21. Oldtimertreffen Salzmarkt Mittenwalde",
    category: "Meet & Greet", price: null,
    description: "Regionales Oldtimertreffen auf dem Salzmarkt.",
    date: "01. August 2026", time: "ganztägig",
    location: "Salzmarkt, 15749 Mittenwalde",
    organizer: "Oldtimerreporter", participants: 0, capacity: 800, cover: "",
    createdAt: NOW + 17 * 60_000, lat: 52.2600, lng: 13.5439,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "24", startDate: "2026-08-08", title: "Oldtimer- & Traktorentreffen Zehdenick",
    category: "Meet & Greet", price: null,
    description: "Treffen für historische Fahrzeuge und Traktoren im Ziegeleipark.",
    date: "08. August 2026", time: "ganztägig",
    location: "Ziegeleipark, Ziegel 10, 16792 Zehdenick OT Mildenberg",
    organizer: "Oldtimerreporter", participants: 0, capacity: 1500, cover: "",
    createdAt: NOW + 18 * 60_000, lat: 52.9636, lng: 13.3269,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "25", startDate: "2026-08-15", title: "18. Oldtimer Classics Berlin-Brandenburg",
    category: "Meet & Greet", price: null,
    description: "Großes zweitägiges Klassikertreffen, organisiert von Auto-Mobil Berlin e.V.",
    date: "15.–16. August 2026", time: "ganztägig",
    location: "Flugplatz 2, Niedergörsdorf (Flugschule Fläming)",
    organizer: "Auto-Mobil Berlin e.V.", participants: 0, capacity: 3000, cover: "",
    createdAt: NOW + 19 * 60_000, lat: 51.9603, lng: 12.9736,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "26", startDate: "2026-08-22", title: "DEKRA Oldtimertag — Ü-30-Party 4.0",
    category: "Meet & Greet", price: null,
    description: "Treffen für Fahrzeuge ab 30 Jahren mit Partyprogramm.",
    date: "22. August 2026", time: "ganztägig",
    location: "Walther-Bothe-Straße 75, 16515 Oranienburg",
    organizer: "DEKRA", participants: 0, capacity: 1500, cover: "",
    createdAt: NOW + 20 * 60_000, lat: 52.7550, lng: 13.2400,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "27", startDate: "2026-08-29", title: "DMC Wheels and Wings — US-Car-Oldtimertreffen",
    category: "Meet & Greet", price: null,
    description: "Treffen für US-Cars und Oldtimer auf dem Flugplatzgelände.",
    date: "29.–30. August 2026", time: "ganztägig",
    location: "Am Flugplatz 4, 15374 Müncheberg Eggersdorf",
    organizer: "DMC", participants: 0, capacity: 2000, cover: "",
    createdAt: NOW + 21 * 60_000, lat: 52.5178, lng: 14.0900,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "28", startDate: "2026-08-29", title: "9. Ostalgietreffen Germendorf",
    category: "Meet & Greet", price: null,
    description: "Treffen für Ostfahrzeuge und Ostalgie-Fans.",
    date: "29. August 2026", time: "ganztägig",
    location: "An den Waldseen 1, Parkplatz Tierpark, 16515 Germendorf",
    organizer: "Oldtimerreporter", participants: 0, capacity: 1500, cover: "",
    createdAt: NOW + 22 * 60_000, lat: 52.7683, lng: 13.1522,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "29", startDate: "2026-08-30", title: "Oldtimertreffen am Olympiastadion Berlin (August)",
    category: "Meet & Greet", price: null,
    description: "Fester monatlicher Treffpunkt der Berliner Oldtimer-Szene auf dem großen Parkplatz, kostenlos.",
    date: "30. August 2026", time: "ab 11:00",
    location: "Olympischer Platz 3, 14053 Berlin",
    organizer: "Oldtimerreporter", participants: 0, capacity: 1500, cover: "",
    createdAt: NOW + 23 * 60_000, lat: 52.5145, lng: 13.2396,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "30", startDate: "2026-08-30", title: "14. Oldtimermeeting Hohen Neuendorf",
    category: "Meet & Greet", price: null,
    description: "Jährliches Oldtimermeeting mit Ausstellung historischer Fahrzeuge.",
    date: "30. August 2026", time: "ganztägig",
    location: "Schönfließer Straße 25, 16540 Hohen Neuendorf",
    organizer: "Oldtimermeeting Hohen Neuendorf", participants: 0, capacity: 1200, cover: "",
    createdAt: NOW + 24 * 60_000, lat: 52.6683, lng: 13.2911,
    website: "https://www.oldtimermeeting-hohenneuendorf.de",
  },
  {
    id: "31", startDate: "2026-09-05", title: "The Gentle Meet Hoppegarten (September)",
    category: "Meet & Greet", price: null,
    description: "Regelmäßiges typenoffenes Treffen für Fahrzeuge ab 30 Jahren, kostenfrei.",
    date: "05. September 2026", time: "ab 11:00",
    location: "Friedhofstr. 20, 15366 Hoppegarten, The Gentle Garage",
    organizer: "The Gentle Garage", participants: 0, capacity: 500, cover: "",
    createdAt: NOW + 25 * 60_000, lat: 52.5211, lng: 13.6553,
    website: "https://www.facebook.com/events/friedhofstra%C3%9Fe-20-15366-hoppegarten-deutschland/the-gentle-meet-oldtimer-und-us-cars-typenoffen-mind-30-jahre-kostenfrei/1381377833622532/",
  },
  {
    id: "32", startDate: "2026-09-05", title: "Good old Times 2026",
    category: "Meet & Greet", price: null,
    description: "Oldtimertreffen im Museumspark Rüdersdorf.",
    date: "05. September 2026", time: "ganztägig",
    location: "Heinitzstraße 9, 15562 Rüdersdorf, Museumspark",
    organizer: "Oldtimerreporter", participants: 0, capacity: 1000, cover: "",
    createdAt: NOW + 26 * 60_000, lat: 52.4794, lng: 13.7853,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "33", startDate: "2026-09-11", title: "Quaxmeet 2026 — Oldtimer-Flugzeuge und -Fahrzeuge",
    category: "Meet & Greet", price: null,
    description: "Kombiniertes Treffen für historische Fahrzeuge und Flugzeuge.",
    date: "11.–13. September 2026", time: "ganztägig",
    location: "Flugplatz Bienenfarm, Lindholzfarm 3, 14641 Paulinenaue",
    organizer: "Flugplatz Bienenfarm", participants: 0, capacity: 2000, cover: "",
    createdAt: NOW + 27 * 60_000, lat: 52.6669, lng: 12.7169,
    website: "https://www.flugplatz-bienenfarm.de/veranstaltungen/quaxmeet-2026/anmeldung-fahrzeuge/",
  },
  {
    id: "34", startDate: "2026-09-18", title: "Airfield Club Race — Oldtimer bis 1959",
    category: "Track Day", price: null,
    description: "Rennveranstaltung für Oldtimer-Fahrzeuge bis Baujahr 1959.",
    date: "18.–19. September 2026", time: "ganztägig",
    location: "Luftfahrtmuseum Finowfurt, Museumsstraße 1, 16244 Schorfheide",
    organizer: "Luftfahrtmuseum Finowfurt", participants: 0, capacity: 1500, cover: "",
    createdAt: NOW + 28 * 60_000, lat: 52.8367, lng: 13.6969,
    website: "https://luftfahrtmuseum-finowfurt.de/veranstaltungen/airfield-club-race-2026/",
  },
  {
    id: "35", startDate: "2026-09-19", title: "DEKRA Klassik Tage 2026",
    category: "Meet & Greet", price: null,
    description: "Zweitägige Klassik-Veranstaltung auf dem Lausitzring.",
    date: "19.–20. September 2026", time: "ganztägig",
    location: "Lausitzring, 01998 Klettwitz",
    organizer: "DEKRA", participants: 0, capacity: 5000, cover: "",
    createdAt: NOW + 29 * 60_000, lat: 51.5353, lng: 14.1281,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "36", startDate: "2026-09-27", title: "Oldtimertreffen am Olympiastadion Berlin (September)",
    category: "Meet & Greet", price: null,
    description: "Fester monatlicher Treffpunkt der Berliner Oldtimer-Szene auf dem großen Parkplatz, kostenlos.",
    date: "27. September 2026", time: "ab 11:00",
    location: "Olympischer Platz 3, 14053 Berlin",
    organizer: "Oldtimerreporter", participants: 0, capacity: 1500, cover: "",
    createdAt: NOW + 30 * 60_000, lat: 52.5145, lng: 13.2396,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  {
    id: "37", startDate: "2026-10-03", title: "The Gentle Meet Hoppegarten (Oktober)",
    category: "Meet & Greet", price: null,
    description: "Regelmäßiges typenoffenes Treffen für Fahrzeuge ab 30 Jahren, kostenfrei.",
    date: "03. Oktober 2026", time: "ab 11:00",
    location: "Friedhofstr. 20, 15366 Hoppegarten, The Gentle Garage",
    organizer: "The Gentle Garage", participants: 0, capacity: 500, cover: "",
    createdAt: NOW + 31 * 60_000, lat: 52.5211, lng: 13.6553,
    website: "https://www.facebook.com/events/friedhofstra%C3%9Fe-20-15366-hoppegarten-deutschland/the-gentle-meet-oldtimer-und-us-cars-typenoffen-mind-30-jahre-kostenfrei/1381377833622532/",
  },
  {
    id: "38", startDate: "2026-10-03", title: "Tag der Offenen Tür / Oldtimertreffen Wustermark",
    category: "Meet & Greet", price: null,
    description: "Offener Tag mit Oldtimertreffen in der Historischen Kraftwagenhalle.",
    date: "03. Oktober 2026", time: "ganztägig",
    location: "Hauptstraße 10, 14641 Wustermark, Historische Kraftwagenhalle",
    organizer: "Historische Kraftwagenhalle", participants: 0, capacity: 800, cover: "",
    createdAt: NOW + 32 * 60_000, lat: 52.5497, lng: 12.9633,
    website: "https://www.oldtimerreporter.de/index.php/oldtimer-termine-in-der-region",
  },
  // === Autoszene & Motorsport Events Deutschland 2026 (Stand 16.07.2026) ===
  // Rennsport (Bergrennen, Dragracing, Drift)
  { id: "r1", startDate: "2026-07-16", title: "L8-Night Weekend 2026 | Das PS Event", category: "Track Day", price: null, description: "Drift, markenoffen, Rennen — großes PS-Wochenende auf dem Lausitzring.", date: "16.–18. Juli 2026", time: "ganztägig", location: "Lausitzring, Schipkau, Brandenburg", organizer: "L8-Night", participants: 0, capacity: 5000, cover: "", createdAt: NOW + 40 * 60_000, lat: 51.5353, lng: 14.1281, website: "https://www.treffeninfo.de/" },
  { id: "r2", startDate: "2026-07-17", title: "EFWD 1/4m Shootout Germany Mariensiel", category: "Track Day", price: null, description: "Viertelmeile-Shootout beim Jade-Race in Varel.", date: "17.–19. Juli 2026", time: "ganztägig", location: "Jade-Race, Varel, Niedersachsen", organizer: "EFWD / Jade-Race", participants: 0, capacity: 3000, cover: "", createdAt: NOW + 41 * 60_000, lat: 53.3961, lng: 8.1391, website: "https://www.treffeninfo.de/" },
  { id: "r3", startDate: "2026-07-17", title: "DMSB Jade-Race Junior Nats (Viertelmeile)", category: "Track Day", price: null, description: "Nachwuchs-Viertelmeile auf dem Flugplatz Mariensiel.", date: "17.–19. Juli 2026", time: "ganztägig", location: "Flugplatz Mariensiel, Niedersachsen", organizer: "DMSB", participants: 0, capacity: 3000, cover: "", createdAt: NOW + 42 * 60_000, lat: 53.5919, lng: 7.9917, website: "https://jade-race.de/" },
  { id: "r4", startDate: "2026-07-18", title: "13. ADAC Weser-Bergpreis Revival Höxter", category: "Track Day", price: null, description: "Historisches Bergrennen-Revival im Weserbergland.", date: "18.–19. Juli 2026", time: "ganztägig", location: "Ottbergen, Höxter, NRW", organizer: "ADAC", participants: 0, capacity: 2000, cover: "", createdAt: NOW + 43 * 60_000, lat: 51.7500, lng: 9.3167, website: "https://www.treffeninfo.de/" },
  { id: "r5", startDate: "2026-07-25", title: "ADAC Hauenstein Bergrennen", category: "Track Day", price: "ca. 10–15 €", description: "Traditionsreiches Bergrennen in der Pfalz.", date: "25.–26. Juli 2026", time: "ganztägig", location: "Hauenstein, Rheinland-Pfalz", organizer: "ADAC", participants: 0, capacity: 3000, cover: "", createdAt: NOW + 44 * 60_000, lat: 49.2000, lng: 7.8500, website: "https://www.berg-meisterschaft.de/" },
  { id: "r6", startDate: "2026-07-31", title: "AMC Dessau Pokal (Viertelmeile)", category: "Track Day", price: null, description: "Viertelmeilen-Rennen des AMC Dessau.", date: "31. Juli – 02. August 2026", time: "ganztägig", location: "Zerbst, Sachsen-Anhalt", organizer: "AMC Dessau", participants: 0, capacity: 2000, cover: "", createdAt: NOW + 45 * 60_000, lat: 51.9683, lng: 12.0864, website: "https://dm-dragracing.de/" },
  { id: "r7", startDate: "2026-08-08", title: "Osnabrücker ADAC Bergrennen", category: "Track Day", price: null, description: "Traditions-Bergrennen des ADAC Osnabrück.", date: "08.–09. August 2026", time: "ganztägig", location: "Osnabrück, Niedersachsen", organizer: "ADAC Osnabrück", participants: 0, capacity: 3000, cover: "", createdAt: NOW + 46 * 60_000, lat: 52.2799, lng: 8.0472, website: "https://www.berg-meisterschaft.de/" },
  { id: "r8", startDate: "2026-08-08", title: "Lückendorfer Bergrennen — Das Original", category: "Track Day", price: null, description: "Historisches Bergrennen im Zittauer Gebirge.", date: "08.–09. August 2026", time: "ganztägig", location: "Lückendorf, Zittauer Gebirge, Sachsen", organizer: "MC Lückendorf", participants: 0, capacity: 3000, cover: "", createdAt: NOW + 47 * 60_000, lat: 50.8333, lng: 14.7167, website: "https://bergrennen-lueckendorf.com/" },
  { id: "r9", startDate: "2026-08-21", title: "NitrOlympX (FIA/FIM Dragracing)", category: "Track Day", price: "Ticketshop", description: "Internationales FIA/FIM Dragracing-Highlight auf dem Hockenheimring.", date: "21.–23. August 2026", time: "ganztägig", location: "Hockenheimring, Baden-Württemberg", organizer: "NitrOlympX", participants: 0, capacity: 40000, cover: "", createdAt: NOW + 48 * 60_000, lat: 49.3278, lng: 8.5658, website: "https://dm-dragracing.de/" },
  { id: "r10", startDate: "2026-09-05", title: "Race at Airport (Viertelmeile)", category: "Track Day", price: "VVK", description: "Viertelmeile-Rennen auf dem Flugplatz Werneuchen.", date: "05.–06. September 2026", time: "ganztägig", location: "Flugplatz Werneuchen, Brandenburg", organizer: "Race at Airport", participants: 0, capacity: 5000, cover: "", createdAt: NOW + 49 * 60_000, lat: 52.6333, lng: 13.7333, website: "https://race-at-airport.de/" },
  { id: "r11", startDate: "2026-09-12", title: "AvD Bergrennen Eichenbühl", category: "Track Day", price: null, description: "AvD Bergrennen im bayerischen Spessart.", date: "12.–13. September 2026", time: "ganztägig", location: "Eichenbühl, Bayern", organizer: "AvD", participants: 0, capacity: 3000, cover: "", createdAt: NOW + 50 * 60_000, lat: 49.7500, lng: 9.3333, website: "https://www.berg-meisterschaft.de/" },

  // Tuning-, Marken- & Community-Treffen
  { id: "t1", startDate: "2026-07-16", title: "BergBlitzSee 2.0 (Opel)", category: "Meet & Greet", price: null, description: "Markenspezifisches Opel-Treffen am Freizeitzentrum Mügeln.", date: "16.–19. Juli 2026", time: "ganztägig", location: "Freizeitzentrum Mügeln, Jessen (Elster), Sachsen-Anhalt", organizer: "BergBlitzSee", participants: 0, capacity: 2000, cover: "", createdAt: NOW + 51 * 60_000, lat: 51.7833, lng: 12.9500, website: "https://www.treffeninfo.de/" },
  { id: "t2", startDate: "2026-07-17", title: "Junkers DAYS — Tage des Donners (US-Cars)", category: "Meet & Greet", price: null, description: "US-Car-Treffen in der historischen Junkers Hall in Aulendorf.", date: "17.–19. Juli 2026", time: "ganztägig", location: "Junkers Hall, Aulendorf, Baden-Württemberg", organizer: "Junkers Hall", participants: 0, capacity: 2000, cover: "", createdAt: NOW + 52 * 60_000, lat: 47.9528, lng: 9.6383, website: "https://www.treffeninfo.de/" },
  { id: "t3", startDate: "2026-07-17", title: "Mitsubishi Sachsentreffen 14.0", category: "Meet & Greet", price: null, description: "Jährliches markenspezifisches Mitsubishi-Treffen in Sachsen.", date: "17.–19. Juli 2026", time: "ganztägig", location: "Zethau, Sachsen", organizer: "Mitsubishi Sachsentreffen", participants: 0, capacity: 1500, cover: "", createdAt: NOW + 53 * 60_000, lat: 50.8000, lng: 13.4167, website: "https://www.treffeninfo.de/" },
  { id: "t4", startDate: "2026-07-18", title: "26. Original Golf1 Treffen", category: "Meet & Greet", price: null, description: "Kult-Treffen für Golf-1-Fans in Wolfsburg-Vorsfelde.", date: "18. Juli 2026", time: "ganztägig", location: "Wolfsburg-Vorsfelde, Niedersachsen", organizer: "Golf1 Community", participants: 0, capacity: 1500, cover: "", createdAt: NOW + 54 * 60_000, lat: 52.4667, lng: 10.8000, website: "https://www.treffeninfo.de/" },
  { id: "t5", startDate: "2026-07-18", title: "23. Jahrestreffen Mercedes-Benz W201/C-Klasse Club e.V.", category: "Meet & Greet", price: null, description: "Clubtreffen für W201- und C-Klasse-Fahrer bei Mo's Bikertreff.", date: "18. Juli 2026", time: "ganztägig", location: "Mo's Bikertreff, Krefeld, NRW", organizer: "Mercedes-Benz W201/C-Klasse Club e.V.", participants: 0, capacity: 500, cover: "", createdAt: NOW + 55 * 60_000, lat: 51.3388, lng: 6.5853, website: "https://www.treffeninfo.de/" },
  { id: "t6", startDate: "2026-07-18", title: "Ford RST Treffen 2026", category: "Meet & Greet", price: null, description: "Markenspezifisches Ford-RST-Treffen am Nürburgring-Camping.", date: "18. Juli 2026", time: "ganztägig", location: "Camping am Nürburgring, Müllenbach, Rheinland-Pfalz", organizer: "Ford RST Community", participants: 0, capacity: 800, cover: "", createdAt: NOW + 56 * 60_000, lat: 50.3356, lng: 6.9475, website: "https://www.treffeninfo.de/" },
  { id: "t7", startDate: "2026-07-18", title: "12. SuperCar-Treffen im JOSKA Glasparadies", category: "Meet & Greet", price: null, description: "Supercar-Show mit exklusiven Fahrzeugen im JOSKA Glasparadies.", date: "18.–19. Juli 2026", time: "ganztägig", location: "JOSKA Glasparadies, Bodenmais, Bayern", organizer: "JOSKA", participants: 0, capacity: 2000, cover: "", createdAt: NOW + 57 * 60_000, lat: 49.0700, lng: 13.1000, website: "https://www.treffeninfo.de/" },
  { id: "t8", startDate: "2026-07-18", title: "Custom on Wheels 2026", category: "Meet & Greet", price: null, description: "Familiäres Treffen für Custombikes und Oldtimer im Spessart.", date: "18. Juli 2026", time: "ganztägig", location: "Waldaschaff (Spessart), Bayern", organizer: "Custom on Wheels", participants: 0, capacity: 500, cover: "", createdAt: NOW + 58 * 60_000, lat: 49.9833, lng: 9.2833, website: "https://customonwheels.de/" },
  { id: "t9", startDate: "2026-09-13", title: "Faszination Tuning — VW vs. Opel (markenoffen)", category: "Meet & Greet", price: null, description: "Markenoffenes Tuning-Event mit Fokus VW und Opel in Sinsheim.", date: "13. September 2026", time: "ganztägig", location: "Sinsheim, Baden-Württemberg", organizer: "Faszination Tuning", participants: 0, capacity: 3000, cover: "", createdAt: NOW + 59 * 60_000, lat: 49.2517, lng: 8.8783, website: "https://www.tuningsuche.de/termin_uebersicht.html" },

  // Oldtimer / Youngtimer / Ostblock / Classic
  { id: "o1", startDate: "2026-07-16", title: "Bertha-Benz-Fahrt 2026 (Classic)", category: "Meet & Greet", price: null, description: "Classic-Ausfahrt vom Auto- und Technikmuseum Sinsheim.", date: "16.–19. Juli 2026", time: "ganztägig", location: "Auto- und Technikmuseum Sinsheim, Baden-Württemberg", organizer: "Technikmuseum Sinsheim", participants: 0, capacity: 1500, cover: "", createdAt: NOW + 60 * 60_000, lat: 49.2517, lng: 8.8783, website: "https://www.treffeninfo.de/" },
  { id: "o2", startDate: "2026-07-16", title: "2. Ostblock Simson Treffen Hammer", category: "Meet & Greet", price: null, description: "Treffen der Ostblock- und Simson-Szene am Forellenhof Hammer.", date: "16.–19. Juli 2026", time: "ganztägig", location: "Forellenhof Hammer, Mecklenburg-Vorpommern", organizer: "Ostblock Simson", participants: 0, capacity: 800, cover: "", createdAt: NOW + 61 * 60_000, lat: 53.4500, lng: 12.4500, website: "https://www.treffeninfo.de/" },
  { id: "o3", startDate: "2026-07-17", title: "9. IFA- und Oldtimertreffen Udersleben", category: "Meet & Greet", price: null, description: "IFA- und Oldtimertreffen am Kyffhäuser.", date: "17.–19. Juli 2026", time: "ganztägig", location: "Bad Frankenhausen/Kyffhäuser, Thüringen", organizer: "IFA Community", participants: 0, capacity: 1500, cover: "", createdAt: NOW + 62 * 60_000, lat: 51.3583, lng: 11.1000, website: "https://www.treffeninfo.de/" },
  { id: "o4", startDate: "2026-07-17", title: "Rattenfänger Klassik Rallye", category: "Meet & Greet", price: null, description: "Klassik-Rallye rund um Hameln.", date: "17.–19. Juli 2026", time: "ganztägig", location: "Hameln, Niedersachsen", organizer: "Rattenfänger Klassik", participants: 0, capacity: 500, cover: "", createdAt: NOW + 63 * 60_000, lat: 52.1039, lng: 9.3564, website: "https://www.treffeninfo.de/" },
  { id: "o5", startDate: "2026-07-18", title: "17. Oldtimertreffen Boppard", category: "Meet & Greet", price: null, description: "Oldtimertreffen direkt am Rhein in Boppard.", date: "18. Juli 2026", time: "ganztägig", location: "Boppard am Rhein, Rheinland-Pfalz", organizer: "Oldtimer Boppard", participants: 0, capacity: 800, cover: "", createdAt: NOW + 64 * 60_000, lat: 50.2317, lng: 7.5878, website: "https://www.treffeninfo.de/" },

  // Großevents & Messen
  { id: "m1", startDate: "2027-05-06", title: "Tuning World Bodensee 2027", category: "Meet & Greet", price: "Tages-/Kombi", description: "Europas größte Tuning-Messe an der Messe Friedrichshafen.", date: "06.–09. Mai 2027", time: "ganztägig", location: "Messe Friedrichshafen, Baden-Württemberg", organizer: "Messe Friedrichshafen", participants: 0, capacity: 100000, cover: "", createdAt: NOW + 65 * 60_000, lat: 47.6763, lng: 9.5119, website: "https://tuningworldbodensee.com/" },
];

const FILTERS: Array<{ key: "all" | EventCategory; label: string }> = [
  { key: "all", label: "Alle Events" },
  { key: "Track Day", label: "Track Day" },
  { key: "Meet & Greet", label: "Meet & Greet" },
  { key: "Workshop", label: "Workshop" },
];

const BUNDESLAENDER = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
] as const;

type Bundesland = (typeof BUNDESLAENDER)[number];

const STATE_KEYWORDS: Array<[Bundesland, string[]]> = [
  ["Baden-Württemberg", ["Baden-Württemberg", "BW", "Stuttgart", "Karlsruhe", "Mannheim", "Freiburg"]],
  ["Bayern", ["Bayern", "München", "Nürnberg", "Augsburg", "Regensburg"]],
  ["Berlin", ["Berlin"]],
  ["Brandenburg", ["Brandenburg", "Lausitzring", "Klettwitz", "Potsdam", "Cottbus", "Hoppegarten", "Oranienburg", "Zehdenick", "Germendorf", "Hohen Neuendorf", "Mittenwalde", "Müncheberg", "Wustermark", "Rüdersdorf", "Paulinenaue", "Schorfheide", "Niedergörsdorf"]],
  ["Bremen", ["Bremen"]],
  ["Hamburg", ["Hamburg"]],
  ["Hessen", ["Hessen", "HE", "Frankfurt", "Wiesbaden", "Kassel"]],
  ["Mecklenburg-Vorpommern", ["Mecklenburg-Vorpommern", "Rostock", "Schwerin"]],
  ["Niedersachsen", ["Niedersachsen", "Hannover", "Braunschweig"]],
  ["Nordrhein-Westfalen", ["Nordrhein-Westfalen", "NRW", "Köln", "Düsseldorf", "Essen", "Dortmund", "Korschenbroich"]],
  ["Rheinland-Pfalz", ["Rheinland-Pfalz", "Nürburgring", "Mendig", "Mainz", "Koblenz"]],
  ["Saarland", ["Saarland", "Saarbrücken"]],
  ["Sachsen", ["Sachsen ", "Dresden", "Leipzig", "Chemnitz"]],
  ["Sachsen-Anhalt", ["Sachsen-Anhalt", "Havelberg", "Oschersleben", "Magdeburg", "Halle"]],
  ["Schleswig-Holstein", ["Schleswig-Holstein", "Kiel", "Lübeck"]],
  ["Thüringen", ["Thüringen", "Obermehler", "Hörselberg", "Erfurt", "Jena"]],
];

function getBundesland(location: string): Bundesland | null {
  for (const [state, keywords] of STATE_KEYWORDS) {
    for (const kw of keywords) {
      if (location.includes(kw)) return state;
    }
  }
  return null;
}

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=70";

function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>(SEED_EVENTS);
  const [filter, setFilter] = useState<"all" | EventCategory>("all");
  const [stateFilter, setStateFilter] = useState<"all" | Bundesland>("all");
  const [sort, setSort] = useState<"newest" | "date" | "popular">("newest");
  const [open, setOpen] = useState(false);

  const availableStates = useMemo(() => {
    const set = new Set<Bundesland>();
    for (const e of events) {
      const s = getBundesland(e.location);
      if (s) set.add(s);
    }
    return BUNDESLAENDER.filter((s) => set.has(s));
  }, [events]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? events : events.filter((e) => e.category === filter);
    if (stateFilter !== "all") {
      list = list.filter((e) => getBundesland(e.location) === stateFilter);
    }
    const sorted = [...list];
    if (sort === "popular") sorted.sort((a, b) => b.participants - a.participants);
    else if (sort === "date") sorted.sort((a, b) => a.startDate.localeCompare(b.startDate));
    else sorted.sort((a, b) => a.startDate.localeCompare(b.startDate));
    return sorted;
  }, [events, filter, stateFilter, sort]);

  const popular = useMemo(
    () => [...events].sort((a, b) => b.participants - a.participants).slice(0, 5),
    [events],
  );

  const mapEvents = useMemo<MapEvent[]>(
    () =>
      filtered
        .filter((e) => typeof e.lat === "number" && typeof e.lng === "number")
        .map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          location: e.location,
          lat: e.lat as number,
          lng: e.lng as number,
          website: e.website,
        })),
    [filtered],
  );

  const handleCreate = (e: Omit<EventItem, "id" | "createdAt" | "participants">) => {
    setEvents((prev) => [
      {
        ...e,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        participants: 0,
        cover: e.cover || FALLBACK_COVER,
      },
      ...prev,
    ]);
    setOpen(false);
    setSort("newest");
    toast.success("Event erstellt");
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Events</h1>
          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
            <p>Track Days, Treffen und Workshops in ganz Deutschland</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Hinweis zu Terminen und Preisen"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#f5c518] hover:text-[#f5c518]/80"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed">
                  Alle Angaben ohne Gewähr — bitte Termine und Preise kurz vorher auf der jeweiligen Website prüfen.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              aria-label="Event erstellen"
              className="shrink-0 rounded-full bg-[#f5c518] text-black hover:bg-[#f5c518]/90"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Neues Event erstellen</DialogTitle>
            </DialogHeader>
            <EventForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </header>

      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#f5c518]" />
          <h2 className="text-base font-semibold">Events auf der Karte</h2>
        </div>
        <EventsMap events={mapEvents} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-[#f5c518] bg-[#f5c518] text-black"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={stateFilter}
            onValueChange={(v) => setStateFilter(v as typeof stateFilter)}
          >
            <SelectTrigger className="w-full rounded-full sm:w-56">
              <SelectValue placeholder="Alle Bundesländer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Bundesländer</SelectItem>
              {availableStates.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-full rounded-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Neueste zuerst</SelectItem>
              <SelectItem value="date">Nach Datum</SelectItem>
              <SelectItem value="popular">Nach Beliebtheit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">{filtered.length} Events gefunden</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-6 sm:grid-cols-2">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>

        <aside className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#f5c518]" />
            <h2 className="text-base font-semibold">Beliebteste Events</h2>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-2">
            {popular.map((e, i) => (
              <div
                key={e.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent/40",
                  i !== popular.length - 1 && "border-b border-border/40",
                )}
              >
                <span className="mt-1 text-sm font-bold text-[#f5c518]">#{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.category}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {e.participants} Teilnehmer
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

function EventCard({ event }: { event: EventItem }) {
  const pct = Math.min(100, Math.round((event.participants / event.capacity) * 100));
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40">
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
        <span className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs font-medium text-foreground">
          {event.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">

        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-tight">{event.title}</h3>
          {event.price ? (
            <span className="shrink-0 text-sm font-semibold text-[#f5c518]">{event.price}</span>
          ) : (
            <span className="shrink-0 rounded-full bg-[#f5c518]/15 px-2 py-0.5 text-xs font-bold text-[#f5c518]">
              KOSTENLOS
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{event.description}</p>

        <ul className="mt-1 space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#f5c518]" /> {event.date}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#f5c518]" /> {event.time}
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#f5c518]" /> {event.location}
          </li>
          <li className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-[#f5c518]" /> {event.organizer}
          </li>
        </ul>

        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> Teilnehmer
            </span>
            <span>
              {event.participants}/{event.capacity}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
            <div className="h-full bg-[#f5c518]" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <Button
          asChild={!!event.website}
          disabled={!event.website}
          className="mt-3 w-full rounded-full bg-[#f5c518] font-semibold text-black hover:bg-[#f5c518]/90"
        >
          {event.website ? (
            <a href={event.website} target="_blank" rel="noopener noreferrer">
              Jetzt anmelden
            </a>
          ) : (
            <span>Jetzt anmelden</span>
          )}
        </Button>

      </div>
    </article>
  );
}

function EventForm({
  onSubmit,
}: {
  onSubmit: (e: Omit<EventItem, "id" | "createdAt" | "participants">) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EventCategory>("Track Day");
  const [price, setPrice] = useState("");
  const [free, setFree] = useState(false);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [capacity, setCapacity] = useState("50");
  const [cover, setCover] = useState("");
  const [website, setWebsite] = useState("");

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!title || !date || !location) {
      toast.error("Bitte Titel, Datum und Ort ausfüllen");
      return;
    }
    onSubmit({
      title,
      category,
      price: free ? null : price || null,
      description,
      date,
      startDate: startDate || new Date().toISOString().slice(0, 10),
      time: time || "—",
      location,
      organizer: organizer || "Carforms Community",
      capacity: Math.max(1, Number(capacity) || 50),
      cover,
      website: website.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="ev-title">Titel</Label>
        <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Kategorie</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Track Day">Track Day</SelectItem>
              <SelectItem value="Meet & Greet">Meet & Greet</SelectItem>
              <SelectItem value="Workshop">Workshop</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ev-capacity">Plätze</Label>
          <Input
            id="ev-capacity"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ev-desc">Beschreibung</Label>
        <Textarea
          id="ev-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="ev-startdate">Startdatum</Label>
          <Input
            id="ev-startdate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ev-time">Uhrzeit</Label>
          <Input
            id="ev-time"
            placeholder="z.B. 10:00 – 18:00"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ev-date">Datum (Anzeige)</Label>
        <Input
          id="ev-date"
          placeholder="z.B. 15.–17. August 2026"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="ev-loc">Ort</Label>
          <Input
            id="ev-loc"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ev-org">Veranstalter</Label>
          <Input id="ev-org" value={organizer} onChange={(e) => setOrganizer(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ev-price">Preis</Label>
        <div className="flex items-center gap-3">
          <Input
            id="ev-price"
            placeholder="z.B. ab 49 €"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={free}
          />
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={free}
              onChange={(e) => setFree(e.target.checked)}
              className="h-4 w-4 accent-[#f5c518]"
            />
            Kostenlos
          </label>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ev-cover">Cover-Bild URL (optional)</Label>
        <Input
          id="ev-cover"
          placeholder="https://…"
          value={cover}
          onChange={(e) => setCover(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ev-website">Offizielle Website (optional)</Label>
        <Input
          id="ev-website"
          type="url"
          placeholder="https://…"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button
          type="submit"
          className="rounded-full bg-[#f5c518] font-semibold text-black hover:bg-[#f5c518]/90"
        >
          Event erstellen
        </Button>
      </DialogFooter>
    </form>
  );
}
