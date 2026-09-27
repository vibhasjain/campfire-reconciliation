import {
  AtSign, Award, Box, Briefcase, Building2, Calendar, CalendarCheck, CalendarClock, CalendarPlus, ChartColumn, CircleDashed,
  CircleDollarSign, CircleDot, CircleUser, CircleX, Clock, DollarSign, FileText, Flag, Folder, Gauge, Gem, Globe, Handshake,
  Hash, Kanban, Layers, ListTodo, Mail, MapPin, Megaphone, Network, NotebookText, Package, Phone, Rocket, Shield, ShoppingCart,
  Sparkles, SquareCheck, Star, StickyNote, Store, Swords, Tag, Target, Ticket, Truck, User, Users, Wrench, ChartPie, Heart, House, Key, Landmark, Lightbulb, Link, Lock, Palette, Plane, Puzzle, Receipt, Server, Trophy, Wallet, Zap, type LucideIcon,
} from "lucide-react"

// ponytail: fixed set instead of lucide's dynamic loader (that emitted ~1,800 chunks). Add names here as needed.
/** Shared icon choices, keyed by lucide kebab-case name. */
export const OBJECT_ICONS: Record<string, LucideIcon> = {
  "at-sign": AtSign, award: Award, box: Box, briefcase: Briefcase, "building-2": Building2, calendar: Calendar,
  "calendar-check": CalendarCheck, "calendar-clock": CalendarClock, "calendar-plus": CalendarPlus, "chart-column": ChartColumn,
  "circle-dashed": CircleDashed, "circle-dollar-sign": CircleDollarSign, "circle-dot": CircleDot, "circle-user": CircleUser,
  "circle-x": CircleX, clock: Clock, "dollar-sign": DollarSign, "file-text": FileText, flag: Flag, folder: Folder, gauge: Gauge,
  gem: Gem, globe: Globe, handshake: Handshake, hash: Hash, kanban: Kanban, layers: Layers, "list-todo": ListTodo, mail: Mail,
  "map-pin": MapPin, megaphone: Megaphone, network: Network, "notebook-text": NotebookText, package: Package, phone: Phone,
  rocket: Rocket, shield: Shield, "shopping-cart": ShoppingCart, sparkles: Sparkles, "square-check": SquareCheck, star: Star,
  "sticky-note": StickyNote, store: Store, swords: Swords, tag: Tag, target: Target, ticket: Ticket, truck: Truck, user: User,
  users: Users, wrench: Wrench,
  "chart-pie": ChartPie, heart: Heart, house: House, key: Key, landmark: Landmark, lightbulb: Lightbulb, link: Link, lock: Lock, palette: Palette, plane: Plane, puzzle: Puzzle, receipt: Receipt, server: Server, trophy: Trophy, wallet: Wallet, zap: Zap,
}

/** Names for an icon picker. */
export const OBJECT_ICON_NAMES = Object.keys(OBJECT_ICONS)

/** Resolves a lucide name ("building-2" or "Building2") to a component; unknown → `Box`. */
export function objectIcon(name: string | undefined): LucideIcon {
  return OBJECT_ICONS[iconKey(name)] ?? Box
}

/** "Building2" | "building-2" → "building-2". */
export const iconKey = (name: string | undefined) => (name ?? "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
