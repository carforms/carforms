import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";

const FEEDBACK_EMAIL = "mail.carforms@gmail.com";

export function FeedbackSection() {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Schreib uns kurz was auf dem Herzen liegt.");
      return;
    }
    if (trimmed.length > 4000) {
      toast.error("Bitte fasse dich etwas kürzer (max. 4000 Zeichen).");
      return;
    }
    const subject = encodeURIComponent("carforms Feedback");
    const body = encodeURIComponent(trimmed);
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    setMessage("");
    toast.success("Danke! Dein Mailprogramm öffnet sich jetzt.");
  };

  return (
    <section className="mt-16 rounded-3xl border border-border/60 bg-gradient-to-br from-amber-500/10 via-card to-transparent p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-full bg-amber-500/15 p-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold sm:text-xl">Du hast mehr Ideen? Gib uns Feedback!</h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Was fehlt dir, was nervt dich, was würde carforms noch besser machen?
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Deine Idee, dein Bug-Report, dein Wunsch…"
          rows={5}
          maxLength={4000}
          className="resize-none rounded-2xl bg-background/50"
        />
        <div className="flex justify-end">
          <Button type="submit" className="rounded-full px-6">
            Feedback abschicken
          </Button>
        </div>
      </form>
    </section>
  );
}
