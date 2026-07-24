import {
  Gauge,
  Users,
  Trophy,
  UserPlus,
  Flag,
  BadgeCheck,
  Sparkles,
  Wrench,
  Award,
  type LucideIcon,
} from "lucide-react";

export type Badge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_name: string;
  image_url: string | null;
  category: string;
  threshold_type: string | null;
  threshold_value: number | null;
  sort_order: number;
};

export type UserBadge = {
  badge_id: string;
  earned_at: string;
};

const ICONS: Record<string, LucideIcon> = {
  Gauge,
  Users,
  Trophy,
  UserPlus,
  Flag,
  BadgeCheck,
  Sparkles,
  Wrench,
  Award,
};

export function getBadgeIcon(name: string): LucideIcon {
  return ICONS[name] ?? Award;
}

export const CATEGORY_LABEL: Record<string, string> = {
  posts: "Kilometerstand",
  followers: "Follower",
  activity: "Unterwegs",
  community: "Crew",
  events: "Events",
  profile: "Papiere",
  rare: "Prestige",
};

export const CATEGORY_ORDER = [
  "posts",
  "followers",
  "activity",
  "community",
  "events",
  "profile",
  "rare",
];

export const INTEREST_TAGS = [
  { slug: "jdm", label: "JDM" },
  { slug: "euro", label: "Euro-Tuning" },
  { slug: "stance", label: "Stance" },
  { slug: "drift", label: "Drift" },
  { slug: "track", label: "Trackday" },
  { slug: "offroad", label: "Offroad" },
  { slug: "youngtimer", label: "Youngtimer" },
  { slug: "oldtimer", label: "Oldtimer" },
  { slug: "muscle", label: "US-Muscle" },
  { slug: "supercar", label: "Supercars" },
] as const;
