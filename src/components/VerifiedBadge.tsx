import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <BadgeCheck
      aria-label="Verifizierter Account"
      className={cn("inline-block h-4 w-4 shrink-0 fill-sky-500 text-background", className)}
    />
  );
}
