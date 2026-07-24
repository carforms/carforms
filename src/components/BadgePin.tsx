import { getBadgeIcon } from "@/lib/badges";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  iconName: string;
  name: string;
  imageUrl?: string | null;
  className?: string;
};

/**
 * Small inline badge pin, sized/positioned like VerifiedBadge.
 * Renders next to the username without adding text.
 */
export function BadgePin({ iconName, name, imageUrl, className }: Props) {
  const Icon = getBadgeIcon(iconName);
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={`Abzeichen: ${name}`}
            className={cn(
              "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500",
              className,
            )}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <Icon className="h-3 w-3" strokeWidth={2.5} />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
