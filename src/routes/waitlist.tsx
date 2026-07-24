import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ShieldCheck, BadgeCheck, MessagesSquare, Filter, Users, Car, Wrench, Building2, User, Check, X, Share2, Copy, CheckCircle2 } from "lucide-react";
import logoUrl from "@/assets/logo-carforms.jpg";
import heroBg from "@/assets/hero-jdm.jpeg";

export const Route = createFileRoute("/waitlist")({
  component: WaitlistPage,
  head: () => ({
    meta: [
      { title: "Carforms – Waitlist | Der Marktplatz für Tuning" },
      { name: "description", content: "Sichere dir früh Zugang zu Carforms – dem ersten spezialisierten Marktplatz für Tuning-Teile & Fahrzeuge. Verifizierte Profile, keine Anonymität, keine Kleinanzeigen-Chaos." },
      { property: "og:title", content: "Carforms – Der Marktplatz für Tuning" },
      { property: "og:description", content: "Trag dich in die Warteliste ein und sei beim Launch dabei." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://carforms.de/waitlist" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://carforms.de/waitlist" }],
  }),
});

type FormState = {
  full_name: string;
  email: string;
  role_buyer: boolean;
  role_seller: boolean;
  account_type: "private" | "business" | "";
  company_name: string;
  privacy_consent: boolean;
  marketing_consent: boolean;
};

const INITIAL: FormState = {
  full_name: "",
  email: "",
  role_buyer: false,
  role_seller: false,
  account_type: "",
  company_name: "",
  privacy_consent: false,
  marketing_consent: false,
};

function WaitlistPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = "E-Mail ist erforderlich";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Bitte gültige E-Mail eingeben";
    if (!form.role_buyer && !form.role_seller) e.role = "Bitte mindestens eine Option wählen";
    if (!form.account_type) e.account_type = "Bitte auswählen";
    if (form.account_type === "business" && !form.company_name.trim()) e.company_name = "Firmenname ist erforderlich";
    if (!form.privacy_consent) e.privacy_consent = "Bitte Datenschutz bestätigen";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const role: string[] = [];
    if (form.role_buyer) role.push("buyer");
    if (form.role_seller) role.push("seller");

    const { error } = await supabase.from("waitlist_signups").insert({
      full_name: form.full_name.trim() || null,
      email: form.email.trim().toLowerCase(),
      role,
      account_type: form.account_type as "private" | "business",
      company_name: form.account_type === "business" ? form.company_name.trim() : null,
      privacy_consent: form.privacy_consent,
      marketing_consent: form.marketing_consent,
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        setErrors({ email: "Diese E-Mail ist bereits registriert." });
      } else {
        setErrors({ submit: "Etwas ist schiefgelaufen. Bitte später erneut versuchen." });
      }
      return;
    }
    setSuccess(true);
    setTimeout(() => document.getElementById("success")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/waitlist` : "https://carforms.de/waitlist";
  const shareText = "Carforms – der Marktplatz für Tuning. Ich bin auf der Warteliste – sei dabei:";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-5 py-16 sm:py-24 text-center">
          <img src={logoUrl} alt="Carforms" className="mx-auto h-14 w-auto rounded-lg mb-8" />
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-300 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Pre-Launch · Warteliste offen
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
            Der Marktplatz für Tuning –<br />
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">gebaut auf Vertrauen.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Carforms ist der erste spezialisierte Marktplatz für Tuning-Teile, Zubehör und Fahrzeuge –
            mit verifizierten Profilen statt anonymer Kleinanzeigen.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Button
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold h-12 px-6 rounded-xl"
              onClick={() => document.getElementById("waitlist-form")?.scrollIntoView({ behavior: "smooth" })}
            >
              Auf die Warteliste
            </Button>
            <div className="text-xs text-muted-foreground">Kostenlos · 30 Sekunden</div>
          </div>
        </div>
      </section>

      {/* WARUM */}
      <section className="mx-auto max-w-4xl px-5 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">Warum Carforms?</h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">
          Der Tuning- und Autoteile-Handel findet heute verstreut auf Facebook-Gruppen, Instagram-Verkaufsaccounts und
          generischen Kleinanzeigen-Plattformen statt – <span className="text-foreground font-medium">unübersichtlich, unsicher, oft anonym</span>.
          Wir bauen den ersten Ort, der ausschließlich für die Szene gemacht ist.
        </p>
      </section>

      {/* TRUST BANNER */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-yellow-400/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-yellow-300" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold">Vertrauen statt Zufall</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { icon: BadgeCheck, title: "Verifizierte Profile", text: "Kein anonymer Handel – jeder Nutzer identifiziert sich." },
              { icon: Building2, title: "Privat oder Firma – klar erkennbar", text: "Käufer wissen immer, mit wem sie handeln." },
              { icon: Users, title: "Bewertungs- & Reputationssystem", text: "Vertrauen wächst sichtbar. (in Planung)" },
              { icon: MessagesSquare, title: "Sichere Kommunikation", text: "Nachrichten & Deals bleiben nachvollziehbar in der Plattform." },
            ].map((f) => (
              <div key={f.title} className="flex gap-3">
                <f.icon className="h-5 w-5 text-yellow-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{f.title}</div>
                  <div className="text-sm text-muted-foreground">{f.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VERGLEICH */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Was uns unterscheidet</h2>
        <p className="text-muted-foreground text-center mb-10">Facebook, Instagram, eBay Kleinanzeigen – vs. Carforms.</p>
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-3 bg-secondary/40 text-sm font-semibold">
            <div className="p-4 border-r border-border">&nbsp;</div>
            <div className="p-4 border-r border-border text-muted-foreground">Andere Plattformen</div>
            <div className="p-4 text-yellow-300">Carforms</div>
          </div>
          {[
            ["Verifizierte Nutzer", "Anonyme Accounts", "Echte, verifizierte Profile"],
            ["Fokus", "Alles gemischt, viel Rauschen", "Nur Tuning & Autoteile"],
            ["Inserate", "Freitext-Posts", "Strukturierte Fahrzeug- & Teil-Filter"],
            ["Community", "Endloses Scrollen in Gruppen", "Forum, Threads & Bewertungen"],
          ].map(([label, a, b], i) => (
            <div key={label} className={`grid grid-cols-3 text-sm ${i % 2 ? "bg-card/40" : ""}`}>
              <div className="p-4 border-t border-r border-border font-medium">{label}</div>
              <div className="p-4 border-t border-r border-border text-muted-foreground flex items-start gap-2">
                <X className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{a}</span>
              </div>
              <div className="p-4 border-t border-border flex items-start gap-2">
                <Check className="h-4 w-4 text-yellow-300 shrink-0 mt-0.5" />
                <span>{b}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Features (geplant)</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: BadgeCheck, title: "Verifizierte Profile", text: "Käufer & Verkäufer mit echter Identität." },
            { icon: Filter, title: "Spezialisierte Kategorien", text: "Passende Filter für Teile & Fahrzeuge." },
            { icon: MessagesSquare, title: "Sichere Nachrichten", text: "Direkter Chat zwischen Käufer und Verkäufer." },
            { icon: Building2, title: "Privat & Business", text: "Für Enthusiasten und Firmen gleichermaßen." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card/60 p-5 hover:border-yellow-500/40 transition">
              <div className="h-10 w-10 rounded-xl bg-yellow-400/15 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-yellow-300" />
              </div>
              <div className="font-semibold mb-1">{f.title}</div>
              <div className="text-sm text-muted-foreground">{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FORM */}
      <section id="waitlist-form" className="mx-auto max-w-3xl px-5 py-16">
        <div className="rounded-3xl border border-border bg-card/60 p-6 sm:p-10">
          {success ? (
            <div id="success" className="text-center py-6">
              <div className="mx-auto h-14 w-14 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-7 w-7 text-yellow-300" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Danke! Du stehst auf der Warteliste.</h3>
              <p className="text-muted-foreground mb-6">Wir melden uns, sobald es losgeht.</p>
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5 max-w-md mx-auto">
                <div className="text-sm font-medium mb-3">Hilf uns, unser Ziel zu erreichen – teile Carforms:</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black px-4 py-2 text-sm font-semibold"
                  >
                    <Share2 className="h-4 w-4" /> WhatsApp
                  </a>
                  <button
                    onClick={copyLink}
                    className="inline-flex items-center gap-2 rounded-xl border border-border hover:border-yellow-500/50 px-4 py-2 text-sm font-semibold"
                  >
                    <Copy className="h-4 w-4" /> {copied ? "Kopiert!" : "Link kopieren"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="mb-8 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold">Auf die Warteliste</h2>
                <p className="text-muted-foreground mt-2 text-sm">Sei einer der Ersten beim Launch dabei.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Name</Label>
                  <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Dein Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse <span className="text-yellow-400">*</span></Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="du@example.com" aria-invalid={!!errors.email} />
                  {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Ich bin... <span className="text-yellow-400">*</span></Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "role_buyer", label: "Käufer", icon: Car },
                      { key: "role_seller", label: "Verkäufer", icon: Wrench },
                    ].map((r) => {
                      const checked = form[r.key as "role_buyer" | "role_seller"];
                      return (
                        <label
                          key={r.key}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${checked ? "border-yellow-400 bg-yellow-400/10" : "border-border hover:border-yellow-500/40"}`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => setForm({ ...form, [r.key]: v === true })}
                          />
                          <r.icon className="h-4 w-4 text-yellow-300" />
                          <span className="text-sm font-medium">{r.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.role && <p className="text-xs text-red-400">{errors.role}</p>}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Ich registriere mich als <span className="text-yellow-400">*</span></Label>
                  <RadioGroup
                    value={form.account_type}
                    onValueChange={(v) => setForm({ ...form, account_type: v as "private" | "business" })}
                    className="grid grid-cols-2 gap-3"
                  >
                    {[
                      { v: "private", label: "Privatperson", icon: User },
                      { v: "business", label: "Unternehmen / Firma", icon: Building2 },
                    ].map((o) => (
                      <label
                        key={o.v}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${form.account_type === o.v ? "border-yellow-400 bg-yellow-400/10" : "border-border hover:border-yellow-500/40"}`}
                      >
                        <RadioGroupItem value={o.v} />
                        <o.icon className="h-4 w-4 text-yellow-300" />
                        <span className="text-sm font-medium">{o.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                  {errors.account_type && <p className="text-xs text-red-400">{errors.account_type}</p>}
                </div>

                {form.account_type === "business" && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company_name">Firmenname <span className="text-yellow-400">*</span></Label>
                    <Input id="company_name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Musterfirma GmbH" aria-invalid={!!errors.company_name} />
                    {errors.company_name && <p className="text-xs text-red-400">{errors.company_name}</p>}
                  </div>
                )}

                <div className="sm:col-span-2 space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={form.privacy_consent}
                      onCheckedChange={(v) => setForm({ ...form, privacy_consent: v === true })}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-muted-foreground">
                      Ich habe die <a href="/datenschutz" className="underline text-foreground">Datenschutzerklärung</a> gelesen und stimme der Verarbeitung meiner Daten gemäß DSGVO zu. <span className="text-yellow-400">*</span>
                    </span>
                  </label>
                  {errors.privacy_consent && <p className="text-xs text-red-400 ml-7">{errors.privacy_consent}</p>}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={form.marketing_consent}
                      onCheckedChange={(v) => setForm({ ...form, marketing_consent: v === true })}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-muted-foreground">
                      Ich möchte per E-Mail über den Launch und Neuigkeiten von Carforms informiert werden.
                    </span>
                  </label>
                </div>
              </div>

              {errors.submit && <p className="text-sm text-red-400 mt-4 text-center">{errors.submit}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-8 h-12 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold rounded-xl"
              >
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Wird gesendet...</> : "Jetzt eintragen"}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="Carforms" className="h-6 w-auto rounded" />
            <span>© {new Date().getFullYear()} Carforms</span>
          </div>
          <div className="flex gap-5">
            <a href="/datenschutz" className="hover:text-foreground">Datenschutz</a>
            <a href="/impressum" className="hover:text-foreground">Impressum</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
