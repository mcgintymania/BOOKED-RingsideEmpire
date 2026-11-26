import { useState, useEffect } from "react";
import {
  Zap, Wind, HeartPulse, Mic2, Shield, TrendingUp, RotateCcw,
  Wallet, Users, Ticket, Building2, Star, X, Plus, Trophy, UserPlus, Award, BarChart3, Newspaper,
  Calendar, ChevronDown, ListChecks, Landmark, Pencil, Globe2, Check, Sparkles, BatteryCharging,
  ArrowUpCircle, Swords, Layers, LineChart as LineChartIcon, NotebookPen, Lock, Tv, Flame, Skull, Users2, BookOpen, Menu, Flag,
  Wrench, Upload, Download, Trash2, HardHat, Medal
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
:root {
  --bg: #0A0A0C;
  --card: #17151C;
  --card-alt: #131117;
  --border: #2B2733;
  --accent: #5B3B8C;
  --accent-bright: #8B6BC0;
  --gold: #C9A227;
  --text: #F2ECDD;
  --text-dim: #8B8593;
  --text-body: #CFC9BB;
  --font-display: 'Anton', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
body {
  background:
    radial-gradient(ellipse 100% 65% at 20% -5%, rgba(91,59,140,0.65), transparent 65%),
    radial-gradient(ellipse 80% 60% at 100% 15%, rgba(139,107,192,0.45), transparent 65%),
    radial-gradient(ellipse 110% 75% at 50% 115%, rgba(91,59,140,0.55), transparent 70%),
    linear-gradient(180deg, rgba(58,34,101,0.35), rgba(10,10,12,0.1) 55%),
    var(--bg);
}
select, option { background-color: var(--card) !important; color: var(--text) !important; }
input, textarea { color: var(--text) !important; }
.booked-modal-backdrop { background-color: rgba(4,4,6,0.94) !important; }
.booked-modal-card { background-color: var(--card) !important; color: var(--text) !important; border-color: var(--border) !important; }
.booked-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.booked-bottom-nav-spacer { height: 72px; }
@media (min-width: 900px) { .booked-bottom-nav-spacer { display: none; } }`;

// Ten stats, 0-100 each, matching the request to extend beyond the original five.
const STAT_KEYS = ["str", "spd", "fit", "cha", "def", "ent", "eng", "jmp", "atk", "spec", "sub"];
// Energy is deliberately excluded from this list — it's a live, fluctuating
// resource (drains with use, recovers with rest), not a fixed ability. Someone
// tired after a hard match shouldn't have their permanent Overall rating,
// ranking, or title-contention status drop just because they need a rest.
const PERFORMANCE_STAT_KEYS = STAT_KEYS.filter((k) => k !== "eng");
const STAT_ICONS = { str: HeartPulse, spd: Wind, fit: Zap, cha: Mic2, def: Shield, ent: Sparkles, eng: BatteryCharging, jmp: ArrowUpCircle, atk: Swords, spec: Layers, sub: Lock };
const STAT_LABELS = { str: "STRENGTH", spd: "SPEED", fit: "FITNESS", cha: "CHARISMA", def: "DEFENCE", ent: "ENTERTAINMENT", eng: "ENERGY", jmp: "JUMPING", atk: "ATTACK", spec: "SPECIALTY", sub: "SUBMISSION" };
// How a wrestler is actually being booked right now — jobbers lose, main
// eventers headline. "Legend" is deliberately not on this list: that's a
// status a career earns over time (see the Legend trait in deriveTraits),
// not a push level a booker can just hand someone from a dropdown.
const TIER_ORDER = ["Jobber", "Lower Card", "Mid Card", "Upper Card", "Main Event"];
// Exclusive signing only — a tiny promotion shouldn't be able to permanently
// lock down a top-of-the-card star. Per-use is unrestricted; renting a big
// name for one night stays realistic regardless of your size.
// National was already effectively uncapped before Legend was removed as a
// push tier (it capped at the old top rung, same as Global's explicit
// null) — null here is that same behavior, just honest about it instead of
// quietly duplicating Regional's cap.
const HIRE_TIER_CAP = { Unknown: "Mid Card", Local: "Upper Card", Regional: "Main Event", National: null, Global: null };
// Merchandise unlocks once you're an established enough draw for a stall to
// be worth running. Stock persists — buy it upfront, sell it show after show
// until it runs out, and restock proactively or leave demand unmet.
const MERCH_UNLOCK_POPULARITY = 15;
// A champion who's crowned and never defends shouldn't just sit there forever
// — vacated after this many shows without a defense. Chose 8 over a tighter
// 5: with matches taking real ring time and a card that needs filling every
// week, 5 felt like it could punish a normal booking rhythm rather than
// genuine neglect. Easy to tighten if it still feels too loose in practice.
const TITLE_VACATE_WEEKS = 8;
const MERCH_QUALITY_TIERS = [
  { name: "Standard", unitCost: 15, unitPrice: 28, upgradeCost: 0 },
  { name: "Premium", unitCost: 22, unitPrice: 42, upgradeCost: 100000 },
  { name: "Deluxe", unitCost: 30, unitPrice: 60, upgradeCost: 500000 },
];

// Achievements are lifetime — they persist across retiring/starting a new
// promotion, and only a full progress wipe clears them. Checked once after
// every show, against both ongoing state and that week's specific card.
const ACHIEVEMENTS = [
  { id: "local-tier", name: "Local Hero", desc: "Reach Local company level", icon: Landmark, check: (c) => TIER_RANK[c.tier] >= TIER_RANK.Local },
  { id: "regional-tier", name: "Regional Player", desc: "Reach Regional company level", icon: Landmark, check: (c) => TIER_RANK[c.tier] >= TIER_RANK.Regional },
  { id: "national-tier", name: "National Name", desc: "Reach National company level", icon: Landmark, check: (c) => TIER_RANK[c.tier] >= TIER_RANK.National },
  { id: "global-tier", name: "Global Empire", desc: "Reach Global company level", icon: Landmark, check: (c) => TIER_RANK[c.tier] >= TIER_RANK.Global },
  { id: "roster-50", name: "Solid Roster", desc: "Average 50+ Overall across your exclusive roster", icon: Users, check: (c) => c.avgRosterOverall >= 50 },
  { id: "roster-70", name: "Star-Studded", desc: "Average 70+ Overall across your exclusive roster", icon: Users, check: (c) => c.avgRosterOverall >= 70 },
  { id: "sign-10", name: "Building a Roster", desc: "Sign 10 wrestlers exclusively", icon: UserPlus, check: (c) => c.rosterCount >= 10 },
  { id: "sign-20", name: "Full Locker Room", desc: "Sign 20 wrestlers exclusively", icon: UserPlus, check: (c) => c.rosterCount >= 20 },
  { id: "rename-promotion", name: "A Name of Your Own", desc: "Rename your promotion", icon: Pencil, check: (c) => c.companyName !== "Ringside Empire Wrestling" },
  { id: "name-yourself", name: "Behind the Curtain", desc: "Give yourself a promoter name", icon: Pencil, check: (c) => c.playerName.trim().length > 0 },
  { id: "rename-wrestler", name: "Creative Booking", desc: "Rename a wrestler", icon: Pencil, check: (c) => c.hasRenamedWrestler },
  { id: "first-champion", name: "First Gold", desc: "Crown your first champion", icon: Award, check: (c) => c.titles.some((t) => t.holders.length > 0) },
  { id: "max-titles", name: "Trophy Cabinet", desc: "Own the maximum 5 titles", icon: Award, check: (c) => c.titles.length >= 5 },
  { id: "bank-100k", name: "Six Figures", desc: "Reach £100,000 in the bank", icon: Wallet, check: (c) => c.bank >= 100000 },
  { id: "bank-1m", name: "Millionaire Promoter", desc: "Reach £1,000,000 in the bank", icon: Wallet, check: (c) => c.bank >= 1000000 },
  { id: "survive-52", name: "One Year In", desc: "Survive 52 weeks", icon: Calendar, check: (c) => c.weekCount > 52 },
  { id: "survive-260", name: "Five Years Strong", desc: "Survive 260 weeks", icon: Calendar, check: (c) => c.weekCount > 260 },
  { id: "legend-wrestler", name: "Bona Fide Legend", desc: "Have a wrestler earn Legend status on your roster", icon: Star, check: (c) => c.roster.some((w) => deriveTraits(w).some((t) => t.key === "legend")) },
  { id: "veteran-wrestler", name: "Old Timer", desc: "Sign a wrestler aged 40 or older", icon: Star, check: (c) => c.roster.some((w) => w.age >= 40) },
  { id: "create-stable", name: "Stable Genius", desc: "Form a tag team or stable yourself", icon: Users2, check: (c) => c.hasCreatedStableManually },
  { id: "create-rivalry", name: "Manufactured Beef", desc: "Manually create a rivalry", icon: Flame, check: (c) => c.hasCreatedRivalryManually },
  { id: "prestige-100", name: "Prestige Belt", desc: "Get a title to 100 prestige", icon: Award, check: (c) => c.titles.some((t) => (t.prestige || 0) >= 100) },
  { id: "defenses-10", name: "Defended Champion", desc: "A title reaches 10 total defenses", icon: Shield, check: (c) => c.titles.some((t) => (t.totalDefenses || 0) >= 10) },
  { id: "take-loan", name: "In The Red", desc: "Take out a loan", icon: LineChartIcon, check: (c) => c.hasEverTakenLoan },
  { id: "repay-loan", name: "Debt Free", desc: "Fully repay a loan", icon: LineChartIcon, check: (c) => c.hasEverRepaidLoanFully },
  { id: "survive-catastrophe", name: "Weathered The Storm", desc: "Survive a financial catastrophe", icon: Skull, check: (c) => c.hasSurvivedCatastrophe },
  { id: "get-fired", name: "Learning Experience", desc: "Get fired at least once", icon: Skull, check: (c) => c.hasBeenFired },
  { id: "retire-once", name: "Graceful Exit", desc: "Retire a promotion voluntarily", icon: Flag, check: (c) => c.hasRetiredOnce },
  { id: "legacy-debut", name: "Blood Runs Thick", desc: "See a second-generation wrestler make their debut", icon: Users, check: (c) => c.hasSeenLegacyDebut },
  { id: "fatal4", name: "Chaos Theory", desc: "Book a Fatal 4-Way match", icon: Swords, check: (c) => c.bookedFatal4Ever },
  { id: "cage-match", name: "Trapped Inside", desc: "Book a Cage match", icon: Lock, check: (c) => c.bookedCageEver },
  { id: "attendance-10k", name: "Packed House", desc: "Run a show with 10,000+ fans", icon: Ticket, check: (c) => c.maxAttendanceEver >= 10000 },
  { id: "sellout", name: "Sold Out", desc: "Sell out a show completely", icon: Ticket, check: (c) => c.hasSoldOutEver },
  { id: "show-90", name: "Match of the Year", desc: "Run a show rated 90 or higher", icon: Star, check: (c) => c.maxShowRatingEver >= 90 },
  { id: "all-cities", name: "Grand Tour", desc: "Unlock every city region, home and abroad", icon: Globe2, check: (c) => c.unlockedCitiesCount >= CITY_CLUSTERS.flat().length + FOREIGN_CITIES.length },
  { id: "first-merch-sale", name: "Merch Table", desc: "Sell your first piece of merchandise", icon: Ticket, check: (c) => c.totalMerchRevenue > 0 },
  { id: "merch-mogul", name: "Merch Mogul", desc: "Sell £50,000 of merchandise, all-time this promotion", icon: Ticket, check: (c) => c.totalMerchRevenue >= 50000 },
  { id: "merch-premium", name: "Premium Brand", desc: "Upgrade your merchandise quality", icon: Ticket, check: (c) => c.merchQualityTier > 0 },
];

// The average Overall of your exclusively-signed roster relative to what's
// expected for your company level nudges your growth rate — a strong roster
// for your size grows a bit faster, a weak one (relative to your size, not
// zero) grows slower. Never a hard block, just a soft nudge either way.
const EXPECTED_ROSTER_OVERALL = { Unknown: 20, Local: 35, Regional: 50, National: 65, Global: 80 };
const WEIGHT_CLASSES = ["Cruiserweight", "Light Heavyweight", "Heavyweight"];
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ALIGNMENTS = ["Face", "Heel"];

// Home nation: the UK cities your promotion grows through region by region.
const CITIES = ["Leeds", "Manchester", "Newcastle", "Cardiff", "London", "Glasgow", "Birmingham", "Liverpool", "Sheffield", "Edinburgh", "New York", "Mexico City", "Tokyo"];
// Touring abroad — three real wrestling territories, not a single vague
// "International" catch-all. These sit outside the home-nation cluster
// system entirely: they don't unlock from any UK city's local popularity,
// only from your promotion's overall size (see FOREIGN_CITY_MIN_TIER) —
// conquer your own country first, then go on tour. Each is also costlier
// to actually run a show in (see the travel surcharge in runShow).
const FOREIGN_CITIES = ["New York", "Mexico City", "Tokyo"];
const FOREIGN_CITY_COUNTRY = { "New York": "USA", "Mexico City": "Mexico", "Tokyo": "Japan" };
const FOREIGN_CITY_MIN_TIER = "National";
const FOREIGN_TRAVEL_SURCHARGE_FRAC = 0.5; // extra fraction of venue cost, booking abroad
// Progressive geography unlock — you choose your home city, and start there
// only. Once any city you can already book reaches this much local
// popularity, the next roughly-nearby cluster opens up. Keeps early
// promotions genuinely regional rather than touring the whole country from
// week one, regardless of which city you started in.
const CITY_UNLOCK_THRESHOLD = 70;
const CITY_CLUSTERS = [
  ["Leeds", "Sheffield", "Newcastle"],
  ["Manchester", "Liverpool"],
  ["Birmingham"],
  ["Glasgow", "Edinburgh"],
  ["London", "Cardiff"],
];
function buildCityTiers(startingCity) {
  if (!startingCity) return [[]];
  const homeIdx = CITY_CLUSTERS.findIndex((cluster) => cluster.includes(startingCity));
  const home = homeIdx >= 0 ? CITY_CLUSTERS[homeIdx] : [startingCity];
  const rest = CITY_CLUSTERS.filter((_, i) => i !== homeIdx);
  return [home, ...rest];
}
function computeUnlockedCities(cityPopularity, startingCity, tier) {
  const tiers = buildCityTiers(startingCity);
  let unlocked = [];
  for (let i = 0; i < tiers.length; i++) {
    if (i === 0) { unlocked = [...tiers[0]]; continue; }
    if (unlocked.some((c) => cityPopularity[c] >= CITY_UNLOCK_THRESHOLD)) unlocked = [...unlocked, ...tiers[i]];
    else break;
  }
  if (TIER_RANK[tier] >= TIER_RANK[FOREIGN_CITY_MIN_TIER]) unlocked = [...unlocked, ...FOREIGN_CITIES];
  return unlocked;
}

// Venue costs and capacities as specified — PPV renamed to Major Arena. Each is
// gated behind a minimum company tier so a brand-new promotion can't walk into a
// 15,000+ seat arena with a guaranteed crowd before it's earned any reputation.
const ARENAS = [
  { name: "Backyard", crowdMin: 5, crowdMax: 50, ticketMin: 5, ticketMax: 25, cost: 75, minTier: "Unknown", showMinutes: 30 },
  { name: "Small", crowdMin: 100, crowdMax: 500, ticketMin: 15, ticketMax: 35, cost: 750, minTier: "Local", showMinutes: 45 },
  { name: "Medium", crowdMin: 500, crowdMax: 2750, ticketMin: 30, ticketMax: 50, cost: 4000, minTier: "Regional", showMinutes: 60 },
  { name: "Large", crowdMin: 2750, crowdMax: 20000, ticketMin: 45, ticketMax: 65, cost: 12000, minTier: "National", showMinutes: 75 },
  { name: "Major Arena", crowdMin: 15000, crowdMax: 32000, ticketMin: 60, ticketMax: 80, cost: 20000, minTier: "Global", showMinutes: 90 },
];
// Bounds for the player-editable show-length slider — a venue's own
// showMinutes is just the default it suggests, not a hard cap.
const SHOW_MINUTES_MIN = 15;
const SHOW_MINUTES_MAX = 180;
const SHOW_MINUTES_STEP = 5;

// Booking is a time-budgeted running order (segments: matches or angles),
// not fixed slots — a segment's quality ceiling is set by where it sits in
// that order (later = bigger) and, secondarily, how many minutes it's
// given. This replaces the old fixed 5-slot SLOT_DEFS (Opener 60, Lower 75,
// Mid 80, Upper 95, Main 100) with a continuous equivalent: a show with
// exactly 5 segments produces caps of 64/73/82/91/100 — within a few
// points of the original curve at every position, since the existing
// match-rating spread (typically 20-75+) already dwarfs a swing that
// small. Minutes only scale a segment DOWN from its position-based
// ceiling, never above it — position stays the dominant factor, matching
// the decision to keep this a translation of the existing curve rather
// than a from-scratch rebalance.
const SEGMENT_CAP_MIN = 55;
const SEGMENT_CAP_MAX = 100;
const SEGMENT_FULL_CAP_MINUTES = 12;
function computeSegmentCap(index, total, minutes) {
  const positionFrac = (index + 1) / total;
  const positionCap = SEGMENT_CAP_MIN + (SEGMENT_CAP_MAX - SEGMENT_CAP_MIN) * positionFrac;
  const minutesFactor = clamp(0.8 + 0.2 * (minutes / SEGMENT_FULL_CAP_MINUTES), 0.8, 1);
  return Math.round(positionCap * minutesFactor);
}
// Cosmetic only (what the card calls itself in results/news) — quantizes
// the same position fraction the cap uses into the original five names, so
// the last segment is always literally "Main Event" regardless of how many
// segments the show has. That literal string is load-bearing: a wrestler's
// "wants a push" request checks for it directly.
function segmentLabel(index, total) {
  if (index === total - 1) return "Main Event";
  const frac = (index + 1) / total;
  if (frac >= 0.8) return "Upper Card";
  if (frac >= 0.6) return "Mid Card";
  if (frac >= 0.4) return "Lower Card";
  return "Opener";
}
// Three flavors of angle, same no-win/no-energy-cost shape as the original
// single "promo" format but each exercising a different stat and telling a
// different kind of story: a Promo is solo mic work (charisma), a
// Confrontation puts two people face to face and can boil over into a
// physical swerve, and a Vignette is solo atmosphere-building (entertainment
// stat instead of charisma) — a way for someone light on mic skill but
// strong on presentation to still contribute to a storyline.
const ANGLE_TYPES = [
  { key: "promo", label: "Promo", desc: "Solo mic work — rated on charisma, no win/loss. Aim it at a signed wrestler to nudge or spark a rivalry, or leave it general." },
  { key: "confrontation", label: "Confrontation", desc: "Two people face to face — rated on both performers' charisma, and carries a real chance of boiling over into a physical swerve. A bigger rivalry swing than a plain promo." },
  { key: "vignette", label: "Vignette", desc: "Solo atmosphere-building — rated on entertainment instead of charisma, no subject. A way for a strong-presentation, weak-mic performer to still pull weight on an angle. Point it at a real signee, injury return, or the upcoming show (see the Hype dropdown) for a rating bump — fans respond to actual news, not filler." },
];
// Flat rating bump a Vignette gets for being pointed at a real hypeTargets()
// entry instead of left as generic atmosphere-building.
const HYPE_TARGET_BONUS = 5;

// Fan trends — what the wrestling world wants right now rotates every
// FAN_TREND_ROTATION_WEEKS weeks, giving a flat rating bonus to anything
// booked that actually fits it. Not a stat-math optimization: three of the
// six key off weight class (an existing field, nothing new to track), one
// keys off booking a Speciality Match, one off any Angle, one off tag/multi-
// man formats. The point is to make "what style is hot" a real, visible
// booking decision instead of the rating formula always rewarding the same
// optimal card shape.
const FAN_TREND_ROTATION_WEEKS = 12;
const FAN_TREND_BONUS = 8;
const FAN_TRENDS = [
  { key: "hardcore", label: "Hardcore Wrestling", desc: "Fans want blood and chaos — any Speciality Match hits harder right now.", news: "eating up hardcore, no-holds-barred violence" },
  { key: "highflying", label: "High-Flying Action", desc: "Fans want speed and aerial offense — an all-Cruiserweight match hits harder right now.", news: "popping hardest for high-flying Cruiserweight action" },
  { key: "powerhouse", label: "Powerhouse Style", desc: "Fans want size and strength — an all-Heavyweight match hits harder right now.", news: "into raw Heavyweight power right now" },
  { key: "technical", label: "Technical Wrestling", desc: "Fans want mat-based psychology — an all-Light Heavyweight match hits harder right now.", news: "appreciating smart, technical Light Heavyweight wrestling" },
  { key: "storytelling", label: "Sports Entertainment", desc: "Fans want storylines — any Angle (Promo, Confrontation, or Vignette) hits harder right now.", news: "hooked on storyline-driven angles over straight wrestling" },
  { key: "tagteam", label: "Tag Team Wrestling", desc: "Fans want chemistry and teamwork — tag, Triple Threat, and Fatal 4-Way matches hit harder right now.", news: "buzzing for tag team and multi-man chaos" },
];
const FAN_TREND_WEIGHT_CLASS = { highflying: "Cruiserweight", powerhouse: "Heavyweight", technical: "Light Heavyweight" };
function fitsFanTrend(trendKey, seg) {
  if (trendKey === "hardcore") return seg.format === "match" && !!seg.specialtyId;
  if (trendKey === "storytelling") return seg.format === "segment";
  if (trendKey === "tagteam") return seg.format === "match" && seg.type !== "singles";
  const wantedClass = FAN_TREND_WEIGHT_CLASS[trendKey];
  if (!wantedClass || seg.format !== "match") return false;
  const participants = [...seg.team1, ...seg.team2].filter(Boolean);
  return participants.length > 0 && participants.every((w) => w.weightClass === wantedClass);
}
function isSegmentComplete(seg) {
  if (seg.format === "segment") {
    if (seg.angleType === "confrontation") return !!seg.team1[0] && !!seg.team2?.[0];
    return !!seg.team1[0];
  }
  if (seg.type === "triple") return seg.team1.filter(Boolean).length >= 3;
  if (seg.type === "fatal4") return seg.team1.filter(Boolean).length >= 4;
  return seg.team1.filter(Boolean).length > 0 && seg.team2.filter(Boolean).length > 0;
}
const SEGMENT_MIN_MINUTES = 3;
const SEGMENT_MAX_MINUTES = 30;
const SEGMENT_DEFAULT_MINUTES = 8;
// Module-level, not component state — segment ids just need to be unique
// for the lifetime of the page, same role a React list key plays, and
// don't need to survive a save/reload (the in-progress card isn't saved).
let nextSegmentId = 1;
function makeSegment(format) {
  return {
    id: nextSegmentId++,
    format, type: "singles", angleType: "promo",
    team1: [null, null, null, null], team2: [null, null],
    titleId: null, specialtyId: null,
    // Stakes stipulations — independent of the physical gimmick (specialtyId)
    // above. n1cTitleId: the winner earns a guaranteed shot at this title
    // (see number1Contenders). loserLeaves: the loser is released outright.
    // Mutually exclusive with titleId (a match can't simultaneously defend a
    // title and decide its own next challenger) — enforced in the UI.
    n1cTitleId: null, loserLeaves: false,
    // Only meaningful for a Vignette angle — which real, current thing (see
    // hypeTargets) it's packaged around, if any. null = general atmosphere.
    hypeTargetId: null,
    minutes: SEGMENT_DEFAULT_MINUTES,
    // null = let the booker's stats decide. Otherwise the name of a wrestler
    // on the winning side/the winning participant — works for 1v1, tag (any
    // name on that side), and multi-man alike without needing per-format
    // shapes. winMethodOverride is one of pickWinMethod's own return strings.
    winnerOverride: null, winMethodOverride: null,
    purposeId: "competitive",
    storyId: "standard",
    // Free-text roleplay/script fields — purely flavor, no mechanical effect.
    // Shown under the segment in the card builder, show results, and history.
    customName: "", script: "",
    result: null,
  };
}
// Shared across every result display (card builder, show results, Results
// tab history) so the flavor text can only drift out of sync with the
// mechanics in one place, not three.
function angleResultText(m) {
  if (m.angleType === "confrontation") {
    return `${m.performer.name} and ${m.subject.name} go face to face${m.brawl ? " — and it turns physical!" : "."}`;
  }
  if (m.angleType === "vignette") {
    if (m.hypeInfo?.kind === "signee") return m.performer.name === m.hypeInfo.name ? `${m.performer.name} cuts a hype package for their own arrival.` : `${m.performer.name} cuts a hype package for ${m.hypeInfo.name}'s arrival.`;
    if (m.hypeInfo?.kind === "return") return m.performer.name === m.hypeInfo.name ? `${m.performer.name} cuts a hype package for their own return from injury.` : `${m.performer.name} cuts a hype package for ${m.hypeInfo.name}'s return from injury.`;
    if (m.hypeInfo?.kind === "show") return `${m.performer.name} cuts a hype package for the upcoming show.`;
    return `${m.performer.name} delivers a vignette.`;
  }
  return `${m.performer.name} cuts a promo${m.subject ? ` aimed at ${m.subject.name}` : ""}.`;
}

// News items are built at the moment they happen from a single flat fact
// (a release, an injury, a title change) — true, but thin as a sentence on
// its own. Rather than rewriting every one of those call sites, a second
// line of flavor commentary is tacked on at display time, picked
// deterministically from a small per-type pool so a given story reads the
// same way every time it's shown, without ever touching the underlying fact.
const NEWS_FLAVOR = {
  title: [
    "The locker room's already talking about what it means for the rest of the card.",
    "It's the kind of moment that can define a wrestler's whole year.",
    "Cameras lingered on the reaction — this one's going to get talked about for a while.",
    "Fans online are already debating who's next in line.",
    "Whether it was the right call or not, it's made the whole roster sit up.",
    "Expect this to be the lead story on every wrestling podcast this week.",
  ],
  injury: [
    "The medical team is calling it a case of wait-and-see for now.",
    "It's a tough blow to absorb with the schedule as packed as it is.",
    "Nobody likes seeing a run interrupted like this.",
    "The locker room's sending well wishes for a full recovery.",
    "It leaves a real gap to fill until they're back.",
    "These things have a way of reshaping the next few months of booking.",
  ],
  rival: [
    "Keep an eye on how the rest of the wrestling world reacts to this one.",
    "It's a reminder that the competition for eyeballs never really stops.",
    "Whether it pays off remains to be seen.",
    "Industry watchers are split on whether it was the right move.",
    "It's the kind of story that ripples well beyond just one promotion.",
    "The rest of the business will be watching closely.",
  ],
  rumor: [
    "Take it with a grain of salt until it's confirmed either way.",
    "The dirt sheets have been buzzing about this one all week.",
    "Whether there's anything to it is anyone's guess right now.",
    "It's the kind of story that tends to take on a life of its own.",
    "Insiders say there's more to come on this one.",
    "For now, it's just talk — but talk has a way of becoming true in this business.",
  ],
};
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function flavorizeNews(item) {
  const pool = NEWS_FLAVOR[item.type] || NEWS_FLAVOR.rumor;
  return `${item.text} ${pool[hashStr(String(item.id)) % pool.length]}`;
}

// Dark matches: an optional, unrated 1v1 before or after the card proper —
// doesn't touch the time budget, the show rating, or win/loss records, just
// gets an off-card body some reps (a small shot at a stat/training bump and
// a little energy cost) the same way an untelevised dark match would in a
// real promotion. Same module-level id counter pattern as segments, for the
// same reason — not saved, doesn't need to survive a reload.
const DARK_MATCH_CAP_PER_TIMING = 3;
let nextDarkMatchId = 1;
function makeDarkMatch(timing) {
  return { id: nextDarkMatchId++, timing, a: null, b: null, result: null };
}


// Longer contracts cost proportionally more, but now that a signed wrestler costs
// nothing extra per show, the multiplier is steeper than before — you're buying
// unlimited use, not just a booking.
const CONTRACT_OPTIONS = [13, 26, 52, 78, 104, 156];
const STABLE_MIN_MEMBERS = 2;
const STABLE_MAX_MEMBERS = 5;
// Weekly wage tiers, keyed by overall rating (ATTR is 0-100 now). Signing costs
// nothing upfront — the wage is billed every week the wrestler is under contract,
// whether or not they're on that week's card.
function weeklyWage(w) {
  const r = Math.round(attrOf(w));
  let base;
  if (r <= 20) base = 500;
  else if (r <= 30) base = 1000;
  else if (r <= 45) base = 2500;
  else if (r <= 60) base = 5000;
  else if (r <= 75) base = 7500;
  else if (r <= 85) base = 10000;
  else base = 15000;
  return Math.round(base * (w.wageMultiplier || 1));
}
// A per-use appearance fee is its own, much lower scale — starting at £100 — since
// it's a single booking, not a standing wage. You negotiate one of three offers when
// signing someone per-use: cheaper offers are more likely to be turned down.
function baseFreelanceFee(w) {
  const r = Math.round(attrOf(w));
  if (r <= 20) return 150;
  if (r <= 30) return 300;
  if (r <= 45) return 600;
  if (r <= 60) return 1000;
  if (r <= 75) return 1700;
  if (r <= 85) return 2800;
  return 5000;
}
// A working agreement makes a partner's exclusive roster bookable as guest
// talent, but at a mate's-rate loan fee rather than genuinely free — the
// partner promotion still has to pay that wrestler's own wage regardless of
// who's using them this week.
const AGREEMENT_TALENT_FEE_MULT = 0.4;
function agreementTalentFee(w) {
  return Math.round(baseFreelanceFee(w) * AGREEMENT_TALENT_FEE_MULT);
}
const PER_USE_OFFERS = [
  { key: "low", label: "Low fee", mult: 0.6, refusalChance: 0.6 },
  { key: "medium", label: "Medium fee", mult: 1.0, refusalChance: 0.25 },
  { key: "high", label: "High fee", mult: 1.6, refusalChance: 0.05 },
];
function rollPerUseOffers(w) {
  const base = baseFreelanceFee(w);
  const variance = 0.9 + Math.random() * 0.2; // re-rolled fresh each negotiation
  return PER_USE_OFFERS.map((o) => ({ ...o, fee: Math.round(base * o.mult * variance) }));
}
// Exclusive-contract wage tiers — same spirit as PER_USE_OFFERS, applied to
// weeklyWage's multiplier instead of a one-off fee. An exclusive offer never
// resolves instantly (see pendingOffers below) — these just set how
// competitive yours is once the bidding war actually settles.
const HIRE_WAGE_OFFERS = [
  { key: "low", label: "Lowball", mult: 0.8 },
  { key: "standard", label: "Standard", mult: 1.0 },
  { key: "generous", label: "Generous", mult: 1.3 },
];
// A refused per-use offer has a coin-flip chance of coming back as a named
// counteroffer instead of a flat no — a real back-and-forth instead of one
// take-it-or-leave-it roll. (Exclusive offers don't use this — see below.)
const COUNTER_OFFER_CHANCE = 0.5;
const EXTENSION_REFUSAL_CHANCE = 0.25;
// Exclusive-contract bidding wars: an offer stays open this many weeks before
// it settles, giving rivals a real window to notice and jump in — and a deal
// within this many weeks of expiring is itself poachable, the same way real
// free agency works. Both resolve on the existing weekly clock rather than a
// separate day-level one — the game's heartbeat is already a week, and a
// days clock would mean re-deriving aging, injuries, every contract and title
// countdown, and the Calendar around it for no behavior this doesn't already
// get at week granularity.
const NEGOTIATION_WEEKS = 3;
const RENEWAL_WINDOW_WEEKS = 4;
const BIDDING_WAR_JOIN_CHANCE = 0.35;
const RENEWAL_POACH_CHANCE = 0.12;
const WALKAWAY_FLOOR = 15;
// How favorably a wrestler views ONE concrete offer on the table — money,
// how much room there is to actually grow there, the company's own
// standing, and whether the length fits their career stage. Every offer in
// a bidding war (plus a quiet retention offer from wherever they already
// are, if anyone) is scored with this same formula and the highest wins.
function offerAppeal(w, offer) {
  const wageScore = clamp(offer.wageMult, 0.5, 2) * 40;
  const capIdx = offer.companyTierKey && HIRE_TIER_CAP[offer.companyTierKey] ? TIER_ORDER.indexOf(HIRE_TIER_CAP[offer.companyTierKey]) : TIER_ORDER.length - 1;
  const headroom = clamp(capIdx - TIER_ORDER.indexOf(w.tier), 0, 5); // room left to be pushed up there
  const popScore = (offer.companyPopularity / 100) * 30;
  // A young up-and-comer is wary of locking into a long exclusive deal with
  // a company that can't do much for them yet; an established veteran
  // doesn't mind the security of a long one, especially somewhere big.
  let lengthScore = 0;
  if (w.age <= 24 && offer.contractWeeks > 26 && offer.companyPopularity < 45) lengthScore -= 25;
  else if (w.age >= 32 && offer.contractWeeks >= 52) lengthScore += 8;
  // Content where they already are gives real inertia toward staying;
  // unhappy makes them that much easier for someone else to pry loose.
  const happinessBias = offer.companyId === w.contractedTo ? (w.happiness - 50) * 0.3 : 0;
  return wageScore + headroom * 4 + popScore + lengthScore + happinessBias;
}
const WEEKS_PER_YEAR = 52;
const SCOUT_BASE_REFUSAL = 0.45;
const SCOUT_CONTRACT_WEEKS = 52;

const RIVAL_COMPANIES = [
  { id: "apex", name: "Apex Wrestling Federation", popularity: 88, titleName: "Apex World Championship", bookerName: "Vernon Macauley" },
  { id: "steelcity", name: "Steel City Wrestling", popularity: 55, titleName: "Steel City Championship", bookerName: "Terry Korn" },
  { id: "ironclad", name: "Ironclad Wrestling Alliance", popularity: 45, titleName: "Ironclad Championship", bookerName: "Diana Cooper" },
  { id: "northerngrit", name: "Northern Grit Wrestling", popularity: 28, titleName: "Northern Grit Championship", bookerName: "Jason Richards" },
  { id: "coastal", name: "Coastal Combat Wrestling", popularity: 20, titleName: "Coastal Championship", bookerName: "Devon Sharpe" },
  { id: "redline", name: "Redline Wrestling Co.", popularity: 12, titleName: "Redline Championship", bookerName: "Xadan Fae" },
  { id: "undergroundbrawl", name: "Underground Brawl Society", popularity: 8, titleName: "Underground Championship", bookerName: "Tobias Oswald" },
  { id: "backlot", name: "Backlot Wrestling Collective", popularity: 3, titleName: "Backlot Championship", bookerName: "Kai Tamlin" },
];
// Starting funds scale with reputation, roughly halving each rank down — the
// #1 Global promotion opens with £1m, the smallest with £25k.
const RIVAL_STARTING_FUNDS = [1000000, 600000, 400000, 250000, 150000, 90000, 50000, 25000];
const BOOKER_FIRST = [
  "Morgan", "Casey", "Reese", "Jordan", "Avery", "Devon", "Quinn", "Harper",
  "Riley", "Dakota", "Sawyer", "Emerson", "Rowan", "Shay", "Teagan", "Blair",
  "Marlowe", "Sloane", "Kieran", "Ellison",
];
const BOOKER_LAST = [
  "Whitfield", "Doyle", "Blackburn", "Sharpe", "Callahan", "Mercer", "Ashby", "Konig",
  "Harlow", "Bellamy", "Crowther", "Delacroix", "Fairweather", "Granger", "Holloway", "Insley",
  "Kirkland", "Lassiter", "Monroe", "Prescott",
];
function randomBookerName() {
  return `${BOOKER_FIRST[rand(0, BOOKER_FIRST.length - 1)]} ${BOOKER_LAST[rand(0, BOOKER_LAST.length - 1)]}`;
}

// Staff — a simpler hiring pool than wrestlers: no rival bidding, just a
// standing roster of candidates per role you can hire or release directly.
// Each role's skill feeds a specific gameplay effect (see where staffRatingBonus,
// medicalFactor, and ringCrewFactor are computed and used).
const STAFF_POOL_SIZE_PER_ROLE = 10;
const STAFF_ROLES = [
  { key: "agent", label: "Agent", desc: "Works matches with your talent on structure and psychology — the better the agent, the higher your matches can realistically grade." },
  { key: "referee", label: "Referee", desc: "Keeps matches under control in the ring — a sharp referee protects a match's floor and keeps a bad night from becoming a disaster." },
  { key: "medical", label: "Medical Staff", desc: "Reduces how often wrestlers get hurt on your shows, and shortens recovery time when they do." },
  { key: "ringcrew", label: "Ring Crew", desc: "Handles setup, safety, and show presentation — a sharp crew cuts down on costly on-site mishaps." },
  { key: "security", label: "Security", desc: "Keeps the crowd and backstage area under control — a strong team cuts down on the costly incidents and lawsuits that come from a security lapse." },
  { key: "booker", label: "Assistant Booker", desc: "A second set of eyes across the whole card — a strong assistant nudges every show's overall rating up a little." },
  { key: "trainer", label: "Trainer", desc: "Coaches your Developmental prospects directly — the better the trainer, the faster they close the gap to their potential." },
];
// A retiring wrestler's in-ring résumé is exactly the pedigree a locker room
// wants from one of these three roles — referee/medical/ring crew are
// different career tracks, so a retiree never rolls into those.
const STAFF_CAREER_ROLES = ["agent", "booker", "trainer"];
const RETIRE_TO_STAFF_CHANCE = 0.3;
// A real legacy: some retirees have a kid who grows up around the business
// and debuts 15-20 years later carrying the family name. Rarer than a staff
// career (this is flavor for the decades-long playthroughs the game is built
// for, not a bulk system) — the kid's Potential is pulled toward how good
// the parent actually was, not their current (likely declined) stats, so a
// legendary career pays off generations later even if the parent limped to
// retirement well past their prime.
const LEGACY_CHANCE = 0.1;
const LEGACY_DEBUT_DELAY_MIN = WEEKS_PER_YEAR * 15;
const LEGACY_DEBUT_DELAY_MAX = WEEKS_PER_YEAR * 20;
function staffWeeklyWage(skill) {
  if (skill <= 20) return 200;
  if (skill <= 35) return 400;
  if (skill <= 50) return 800;
  if (skill <= 65) return 1500;
  if (skill <= 80) return 2500;
  return 4000;
}
// usedNames lets callers avoid landing two candidates with the same name —
// pass the names already in the pool (or already picked this batch). Retries
// a bounded number of times, then falls back to a numbered variant so this
// can never loop forever even if the whole 400-combination pool is taken.
function generateStaffCandidate(role, usedNames = new Set()) {
  let name = randomBookerName();
  let guard = 0;
  while (usedNames.has(name) && guard < 30) { name = randomBookerName(); guard++; }
  if (usedNames.has(name)) name = `${name} ${toRomanNumeral(guard + 1)}`;
  const skill = rand(20, 85);
  return { id: `staff-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, role, skill, contractedTo: null, contractExpiresWeek: null };
}
function buildStaffPool() {
  const usedNames = new Set();
  return STAFF_ROLES.flatMap((r) => Array.from({ length: STAFF_POOL_SIZE_PER_ROLE }, () => {
    const candidate = generateStaffCandidate(r.key, usedNames);
    usedNames.add(candidate.name);
    return candidate;
  }));
}

// World Editor — lightweight CSV in/out, no external library. Handles quoted
// fields (commas, quotes, newlines inside a value) well enough for simple
// name/stat spreadsheets; not a general-purpose CSV parser.
function csvEscape(val) {
  const s = String(val ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCSV(rows, headers) {
  const lines = [headers.join(",")];
  rows.forEach((r) => lines.push(headers.map((h) => csvEscape(r[h])).join(",")));
  return lines.join("\r\n");
}
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); if (row.some((f) => f !== "")) rows.push(row); }
  return rows;
}
function downloadTextFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType || "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
const WRESTLER_CSV_HEADERS = ["name", "age", "sex", "weightClass", "alignment", "overall"];
const COMPANY_CSV_HEADERS = ["name", "bookerName", "titleName", "popularity", "funds"];
function slugifyCompanyId(name, existingIds) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "company";
  let id = base, n = 2;
  while (existingIds.includes(id)) { id = `${base}-${n}`; n++; }
  return id;
}

// Fictional TV networks — placeholder names until you send a real list. Pay is
// per-viewer, viewers estimated from your popularity, gated by a minimum popularity
// so bigger networks won't look twice until you're established.
const NETWORKS = [
  { id: "backlot", name: "Backlot Broadcast", minPopularity: 11, viewerMult: 20, payPerViewer: 0.05 },
  { id: "localaccess", name: "Local Access Wrestling", minPopularity: 16, viewerMult: 30, payPerViewer: 0.06 },
  { id: "grapplestream", name: "Grapple Stream", minPopularity: 19, viewerMult: 60, payPerViewer: 0.08 },
  { id: "ringsidenet", name: "RingSide Network", minPopularity: 21, viewerMult: 90, payPerViewer: 0.10 },
  { id: "combatplus", name: "CombatSports+", minPopularity: 28, viewerMult: 150, payPerViewer: 0.15 },
  { id: "matwatch", name: "MatWatch TV", minPopularity: 39, viewerMult: 220, payPerViewer: 0.29 },
  { id: "turnbuckletv", name: "Turnbuckle Television", minPopularity: 48, viewerMult: 300, payPerViewer: 0.45 },
  { id: "ironrope", name: "IronRope TV", minPopularity: 60, viewerMult: 400, payPerViewer: 0.60 },
  { id: "primewrestling", name: "PrimeWrestling Network", minPopularity: 70, viewerMult: 550, payPerViewer: 0.70 },
  { id: "globalslam", name: "Global SlamStream", minPopularity: 85, viewerMult: 800, payPerViewer: 1.00 },
];
// The Ratings leaderboard needs a network + viewer estimate for every show
// ever run, player and rival alike — not just the one deal the player
// might actually have signed. Reuses the exact same popularity*viewerMult
// math as a real network deal, picking whichever network a company's
// popularity at the time would have actually qualified for.
function networkFor(popularity) {
  const eligible = NETWORKS.filter((n) => popularity >= n.minPopularity);
  return eligible.length > 0 ? eligible[eligible.length - 1] : NETWORKS[0];
}
function estimatedViewers(popularity, wasPPV) {
  const net = networkFor(popularity);
  const base = Math.round(popularity * net.viewerMult);
  return wasPPV ? Math.round(base * 1.4) : base;
}
// Fictional sponsors — same idea, flat weekly pay instead of per-viewer.
const SPONSORS = [
  { id: "ironclad", name: "Ironclad Energy Drinks", minPopularity: 10, payMin: 200, payMax: 500 },
  { id: "apexfitness", name: "Apex Fitness Gear", minPopularity: 11, payMin: 250, payMax: 600 },
  { id: "thunderbolt", name: "ThunderBolt Insurance", minPopularity: 12, payMin: 400, payMax: 900 },
  { id: "grapplerschoice", name: "Grappler's Choice Nutrition", minPopularity: 15, payMin: 500, payMax: 1100 },
  { id: "titanauto", name: "Titan Auto Parts", minPopularity: 20, payMin: 600, payMax: 1300 },
  { id: "frostbite", name: "Frostbite Beverages", minPopularity: 30, payMin: 800, payMax: 1800 },
  { id: "vanguard", name: "Vanguard Financial", minPopularity: 40, payMin: 1200, payMax: 2500 },
  { id: "blackwood", name: "Blackwood Apparel", minPopularity: 55, payMin: 1800, payMax: 3500 },
  { id: "cresthill", name: "Cresthill Realty", minPopularity: 70, payMin: 2500, payMax: 5000 },
  { id: "novatech", name: "Nova Tech Solutions", minPopularity: 85, payMin: 4000, payMax: 8000 },
];
// A network deal (not sponsors — sponsors are just money) gives a small weekly
// exposure boost to whichever city you play that week, since it's genuinely more
// people seeing your product.
const NETWORK_POPULARITY_BOOST = 0.3;
const DEAL_OFFER_CHANCE = 0.35;
const DEAL_LENGTH_MIN = 8;
const DEAL_LENGTH_MAX = 30;

// Fully generated fictional ring names — no real wrestlers, no trademark risk.
const FIRST_NAMES = ["Dex", "Cass", "Rory", "Bryce", "Talon", "Ezra", "Knox", "Silas", "Roan", "Jax"];
const SURNAMES = ["Steele", "Vane", "Kestrel", "Grimm", "Rourke", "Cage", "Blackwood", "Thorne", "Frost", "Sinclair"];
const FIRST_NAMES_RESERVE = [
  "Cain", "Dash", "Gunnar", "Hex", "Ivo", "Jett", "Lex", "Mace", "Nash", "Orin",
  "Brock", "Cole", "Drex", "Finn", "Gage", "Huxley", "Ira", "Jace", "Kade", "Leon",
  "Mack", "Nico", "Otto", "Pryce", "Quinn", "Rex", "Stone", "Tate", "Vance", "Wyatt",
  "Axel", "Blaze", "Cruz", "Dane", "Enzo", "Gunner", "Hollis", "Jonah", "Kian", "Lyle",
];
const SURNAMES_RESERVE = [
  "Ashford", "Briar", "Cross", "Duskwood", "Ember", "Fenwick", "Gale", "Havoc", "Iron", "Justice",
  "Knight", "Lennox", "Marsh", "Onyx", "Pike", "Quade", "Raine", "Storm", "Talbot", "Vale",
  "Wraith", "Axton", "Brecker", "Colt", "Draven", "Fox", "Grimsby", "Hawke", "Ironwood", "Jericho",
  "Kincaid", "Lockhart", "Mercer", "Nightshade", "Obsidian", "Parrish", "Quintrell", "Ravenscroft", "Slate", "Torrance",
];
function buildNamePool(firsts, surnames) {
  const names = [];
  firsts.forEach((f) => surnames.forEach((s) => names.push(`${f} ${s}`.toUpperCase())));
  return names;
}
const RESERVE_NAMES = buildNamePool(FIRST_NAMES_RESERVE, SURNAMES_RESERVE);
// Debuts draw from RESERVE_NAMES (with any accidental collision against a
// hand-authored ROSTER_DATA/STAGGERED_DEBUT_DATA name filtered out — built
// lazily since those arrays are declared later in the file) and never
// actually run out — once every combination has been used once, the cycle
// repeats with a Roman-numeral suffix (same trick real-world dynasties
// use), so a multi-decade save never stops seeing new faces.
let _debutNamePoolCache = null;
function debutNamePool() {
  if (!_debutNamePoolCache) {
    const authored = new Set([...ROSTER_DATA, ...STAGGERED_DEBUT_DATA].map((d) => d.name.toUpperCase()));
    _debutNamePoolCache = RESERVE_NAMES.filter((n) => !authored.has(n));
  }
  return _debutNamePoolCache;
}
function reserveNameAt(index) {
  const pool = debutNamePool();
  const cycle = Math.floor(index / pool.length);
  const base = pool[index % pool.length];
  return cycle === 0 ? base : `${base} ${toRomanNumeral(cycle + 1)}`;
}
function toRomanNumeral(n) {
  const table = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let remaining = n, out = "";
  for (const [value, symbol] of table) {
    while (remaining >= value) { out += symbol; remaining -= value; }
  }
  return out;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function tierFromAvg(avg) {
  if (avg >= 68) return "Main Event";
  if (avg >= 55) return "Upper Card";
  if (avg >= 40) return "Mid Card";
  if (avg >= 25) return "Lower Card";
  return "Jobber";
}
// tier (from tierFromAvg) is raw in-ring ability — used for the hiring cap,
// since that's about whether a wrestler is genuinely out of a small
// promotion's league. pushOverride is how the booker actually presents them
// once signed — a "Jobber" can be a highly skilled worker who's just booked
// to lose, and great stats alone don't make someone a Main Eventer either.
// Once set, it's what displays everywhere except the hiring cap check.
function effectiveTier(w) {
  return w.pushOverride || w.tier;
}
// Roster Color Coder — a quick-glance status accent for a wrestler's card:
// gold for a champion, red for a fresh injury, orange for one close enough
// to a return that it reads more like rehab than a real absence. Checked in
// that order since a champion who's hurt is still worth flagging as hurt.
function rosterStatusColor(w) {
  if (w.injuryWeeksRemaining) return w.injuryWeeksRemaining <= 2 ? "#F59E0B" : "#EF4444";
  if ((w.holdsTitles || []).length > 0) return "#C9A227";
  return null;
}
// The intensity number already existed — this just names what it means, so a
// feud reads as a story with a shape instead of a bar filling up.
function feudStage(intensity) {
  if (intensity >= 70) return { label: "Ready to Blow Off", hint: "Book the decider — a stipulation match settles this." };
  if (intensity >= 40) return { label: "Escalating", hint: "Keep it hot — a match or a pointed promo." };
  return { label: "Just Introduced", hint: "Early days — a promo works well here." };
}
function avgStats(w) {
  return PERFORMANCE_STAT_KEYS.reduce((s, k) => s + w[k], 0) / PERFORMANCE_STAT_KEYS.length;
}
// A hidden ceiling rolled once at creation — how far a wrestler's average can
// realistically climb with training. Younger wrestlers get more headroom;
// by the mid-30s there's little to no room left, same as real careers.
function rollPotential(avg, age) {
  const youthBonus = clamp(35 - age, 0, 20);
  return clamp(Math.round(avg + rand(0, 10) + youthBonus), Math.round(avg), 100);
}
// Older saves/pools predate the potential field — fall back to a value
// derived from current stats/age rather than requiring a save migration.
function potentialOf(w) {
  return w.potential ?? rollPotential(avgStats(w), w.age);
}
// Traits are never stored — purely derived, every time, from fields the
// wrestler already carries. That means they read correctly on any save
// (old or new) with zero migration, and they can never drift out of sync
// with the stats that actually produced them. Most are flavor — a read on
// who this person has become from their career so far — but Fan Favorite
// and Clutch Performer feed back into the rating/draw formulas (see where
// each is actually used).
const TRAIT_DEFS = {
  fanfavorite: { label: "Fan Favorite", desc: "A genuine crowd-puller. Draw power snowballs a little faster for them — stars get more popular, not less." },
  workhorse: { label: "Workhorse", desc: "A durable veteran who's logged serious ring time." },
  flightrisk: { label: "Flight Risk", desc: "Unhappy right now — a broken promise or a bad night could push them to ask out." },
  leader: { label: "Locker Room Leader", desc: "Content, experienced, and well-regarded backstage." },
  clutch: { label: "Clutch Performer", desc: "Delivers when it matters — gets a small rating bump in title matches and the Main Event." },
  risingstar: { label: "Rising Star", desc: "Young, with real room left to grow against their Potential — worth developing." },
  legacy: { label: "Second Generation", desc: `Follows a parent into the business.` },
  legend: { label: "Legend", desc: "A career, not a push — real sustained ability, multiple title reigns, and real ring time behind them. Can't be assigned, only earned." },
};
function deriveTraits(w) {
  const keys = [];
  if ((w.drawPower ?? 50) >= 75) keys.push("fanfavorite");
  if (w.matches >= 100) keys.push("workhorse");
  if (w.happiness <= 30) keys.push("flightrisk");
  if (w.happiness >= 85 && w.matches >= 30) keys.push("leader");
  if (w.titleReigns >= 1 && w.wins + w.losses >= 20 && w.wins / (w.wins + w.losses) >= 0.65) keys.push("clutch");
  if (w.age <= 23 && potentialOf(w) - avgStats(w) >= 15) keys.push("risingstar");
  if (w.legacyParent) keys.push("legacy");
  if (avgStats(w) >= 78 && w.titleReigns >= 2 && w.matches >= 50) keys.push("legend");
  return keys.map((key) => ({ key, ...TRAIT_DEFS[key] }));
}
function makeWrestler(name) {
  const stats = {};
  PERFORMANCE_STAT_KEYS.forEach((k) => { stats[k] = rand(20, 95); });
  const avg = PERFORMANCE_STAT_KEYS.reduce((s, k) => s + stats[k], 0) / PERFORMANCE_STAT_KEYS.length;
  const age = rand(19, 45);
  return {
    name, age, sex: Math.random() < 0.5 ? "Male" : "Female",
    tier: tierFromAvg(avg), ...stats, eng: rand(70, 100), potential: rollPotential(avg, age),
    weightClass: WEIGHT_CLASSES[rand(0, WEIGHT_CLASSES.length - 1)],
    alignment: ALIGNMENTS[rand(0, ALIGNMENTS.length - 1)],
    matches: 0, wins: 0, losses: 0, rankingPts: 0, titleReigns: 0, holdsTitles: [],
    contractedTo: null, contractExpiresWeek: null, hireCooldownUntil: null, perUseFee: null, injuryWeeksRemaining: null, injuryType: null, perUsedByRival: null, happiness: 70, wageMultiplier: 1,
    partner: null, friends: [], rivals: [], pushOverride: null, drawPower: Math.round(20 + stats.cha * 0.5),
  };
}
// For the custom roster list: given just one overall rating (0-100), spread it
// across the 11 individual stats with natural variation rather than a flat line —
// some stats land higher, some lower, but the average lands close to the target.
function makeWrestlerFromOverall(name, overall, opts = {}) {
  const target = clamp(Math.round(overall), 0, 100);
  const stats = {};
  let runningTotal = 0;
  PERFORMANCE_STAT_KEYS.forEach((k, i) => {
    if (i === PERFORMANCE_STAT_KEYS.length - 1) {
      stats[k] = clamp(target * PERFORMANCE_STAT_KEYS.length - runningTotal, 0, 100);
    } else {
      const spread = rand(-18, 18);
      stats[k] = clamp(target + spread, 0, 100);
      runningTotal += stats[k];
    }
  });
  const avg = PERFORMANCE_STAT_KEYS.reduce((s, k) => s + stats[k], 0) / PERFORMANCE_STAT_KEYS.length;
  const age = opts.age ?? rand(19, 45);
  return {
    name, age, sex: opts.sex || (Math.random() < 0.5 ? "Male" : "Female"),
    tier: tierFromAvg(avg), ...stats, eng: rand(70, 100), potential: rollPotential(avg, age),
    weightClass: opts.weightClass || WEIGHT_CLASSES[rand(0, WEIGHT_CLASSES.length - 1)],
    alignment: opts.alignment || ALIGNMENTS[rand(0, ALIGNMENTS.length - 1)],
    matches: 0, wins: 0, losses: 0, rankingPts: 0, titleReigns: 0, holdsTitles: [],
    contractedTo: opts.contractedTo ?? null, contractExpiresWeek: opts.contractExpiresWeek ?? null,
    hireCooldownUntil: null, perUseFee: null, injuryWeeksRemaining: null, injuryType: null, perUsedByRival: null, happiness: 70, wageMultiplier: 1,
    partner: null, friends: [], rivals: [], pushOverride: null, drawPower: Math.round(20 + stats.cha * 0.5),
  };
}
// Custom roster data — 185 active starters plus 30 held back for a staggered
// debut (one joins Freelance every 4 in-game weeks). Names, promotions, and
// stats were supplied by the designer; a handful of names were altered from
// the original submission for trademark/publicity-right safety (parody names
// that read as too close to specific real, currently active performers).
const ROSTER_DATA = [
  {name:"Vance Blackthorn",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Heel",age:21,overall:21},
  {name:"Rex Havoc",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:22,overall:18},
  {name:"Damon Vexley",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:23,overall:19},
  {name:"Silas Crowe",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Heel",age:24,overall:24},
  {name:"Axel Graves",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:25,overall:22},
  {name:"Jett Mercer",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:26,overall:26},
  {name:"Colt Maddox",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Face",age:21,overall:21},
  {name:"DEX THORNE",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:22,overall:18},
  {name:"Ronan Steele",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:23,overall:19},
  {name:"Mason Fury",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Heel",age:24,overall:24},
  {name:"Ryder Kox",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:25,overall:22},
  {name:"Damien Wolfe",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:26,overall:26},
  {name:"Briggs Dalton",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Heel",age:23,overall:19},
  {name:"CASS SINCLAIR",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:24,overall:24},
  {name:"Hunter Graves",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:25,overall:22},
  {name:"Caleb Storm",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Face",age:26,overall:26},
  {name:"Jaxon Steele",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:21,overall:21},
  {name:"RORY GRIMM",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:22,overall:18},
  {name:"Rocco Valentine",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:23,overall:19},
  {name:"Malachi Voss",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:21,overall:25},
  {name:"Kane Mercer",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:22,overall:27},
  {name:"Sterling Crow",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:22,overall:29},
  {name:"Blaine Maddox",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:27,overall:31},
  {name:"Gideon Frost",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:25,overall:33},
  {name:"Nash Wilder",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:30,overall:35},
  {name:"Cyrus Black",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:31,overall:37},
  {name:"Duke Hollow",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:29,overall:39},
  {name:"Rafe Kingsley",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:28,overall:41},
  {name:"Talon Creed",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:20,overall:16},
  {name:"BRYCE CAGE",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:20,overall:16},
  {name:"Axel Beaumont",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Face",age:20,overall:14},
  {name:"Marlowe Kane",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:21,overall:12},
  {name:"Jasper Flint",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:22,overall:22},
  {name:"Roman Vale",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:23,overall:25},
  {name:"Soren Blackwood",promo:null,gender:"Female",weightClass:"Cruiserweight",alignment:"Heel",age:27,overall:54},
  {name:"Griffin Knox",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:18,overall:9},
  {name:"Darius Steel",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:19,overall:8},
  {name:"Brock Vandal",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:19,overall:7},
  {name:"Cruz Maddison",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Face",age:19,overall:11},
  {name:"Elias Thorn",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:19,overall:20},
  {name:"Zane Mercer",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:19,overall:22},
  {name:"TALON THORNE",promo:null,gender:"Female",weightClass:"Heavyweight",alignment:"Face",age:19,overall:20},
  {name:"Magnus Cole",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Heel",age:18,overall:29},
  {name:"Ronan Drake",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:20,overall:39},
  {name:"Cassius Wolfe",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:33,overall:49},
  {name:"EZRA VANE",promo:null,gender:"Female",weightClass:"Heavyweight",alignment:"Heel",age:34,overall:59},
  {name:"Jude Savage",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:39,overall:79},
  {name:"The Midnight Reaper",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:38,overall:50},
  {name:"The Yorkshire Executioner",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:38,overall:50},
  {name:"Benny Alpha",promo:"steelcity",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:42,overall:80,contractWeeks:67,champion:true},
  {name:"Don Tina",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:49,overall:81,contractWeeks:31},
  {name:"Over Lord",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:61,overall:81,contractWeeks:52},
  {name:"JP Skunk",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:47,overall:81,contractWeeks:76},
  {name:"Joe Marshal",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:41,overall:82,contractWeeks:84,champion:true},
  {name:"Seth Ransom",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:40,overall:80,contractWeeks:45},
  {name:"Solo Barrett",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:41,overall:81,contractWeeks:63},
  {name:"Wade Comet",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:46,overall:81,contractWeeks:38},
  {name:"Paul Blueblood",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:57,overall:81,contractWeeks:72},
  {name:"Chris Lion",promo:"steelcity",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:55,overall:77,contractWeeks:54},
  {name:"Ridge",promo:"steelcity",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:52,overall:75,contractWeeks:41},
  {name:"Christian Father",promo:"steelcity",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:52,overall:74,contractWeeks:68},
  {name:"Deadbeat Ray",promo:"coastal",gender:"Male",weightClass:"Cruiserweight",alignment:"Face",age:51,overall:79,contractWeeks:29,champion:true},
  {name:"Rick Lense",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:49,overall:82,contractWeeks:88},
  {name:"Big Display",promo:"steelcity",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:54,overall:70,contractWeeks:22},
  {name:"Mark Energy",promo:"steelcity",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:55,overall:72,contractWeeks:61},
  {name:"Jace Bro",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:40,overall:73,contractWeeks:47},
  {name:"Jim Bro",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:39,overall:72,contractWeeks:73},
  {name:"Lonely Bro",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:31,overall:70,contractWeeks:91},
  {name:"Nicky Z",promo:"ironclad",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:45,overall:68,contractWeeks:26,champion:true},
  {name:"ROAN STEELE",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:20,overall:0},
  {name:"Robert Lash",promo:"steelcity",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:50,overall:77,contractWeeks:58},
  {name:"Angus Claymore",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:41,overall:79},
  {name:"The Colossal Sven",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:38,overall:84},
  {name:"Sky Innovator",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:49,overall:81},
  {name:"Samoan Johnny",promo:"ironclad",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:47,overall:76,contractWeeks:64},
  {name:"Josh Heart",promo:"ironclad",gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:48,overall:71,contractWeeks:23},
  {name:"Mick Heart",promo:"ironclad",gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:51,overall:69,contractWeeks:51},
  {name:"Jon Ricter",promo:"steelcity",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:40,overall:80,contractWeeks:79},
  {name:"Dominik Voss",promo:"steelcity",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:41,overall:74,contractWeeks:43},
  {name:"Owen Serpent",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:45,overall:81},
  {name:"D Fallon",promo:"steelcity",gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:33,overall:72,contractWeeks:21},
  {name:"JAX BLACKWOOD",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:33,overall:27},
  {name:"Maximum Jackman",promo:"steelcity",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:30,overall:79,contractWeeks:101},
  {name:"Billy blade",promo:"steelcity",gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:33,overall:80,contractWeeks:57},
  {name:"Adz Boom",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:36,overall:75},
  {name:"Kale O'Malley",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:38,overall:67},
  {name:"Roddy Strengh",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:42,overall:67},
  {name:"Lemon Chill",promo:"steelcity",gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:37,overall:63,contractWeeks:62},
  {name:"Pinto",promo:"northerngrit",gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:39,overall:76,contractWeeks:28,champion:true},
  {name:"Phoenix",promo:"northerngrit",gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:35,overall:75,contractWeeks:75},
  {name:"Hanging Rage",promo:"undergroundbrawl",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:44,overall:71,contractWeeks:37,champion:true},
  {name:"Swindle Strickmass",promo:"backlot",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:35,overall:71,contractWeeks:83,champion:true},
  {name:"Warlock",promo:"redline",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:38,overall:63,contractWeeks:24},
  {name:"Jeff Double",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:58,overall:65},
  {name:"Matt Ride",promo:"ironclad",gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:41,overall:61,contractWeeks:66},
  {name:"Quinn Elk",promo:"ironclad",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:36,overall:57,contractWeeks:59},
  {name:"Old Eric",promo:"ironclad",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:45,overall:58,contractWeeks:20},
  {name:"Freddie Kazoo",promo:"ironclad",gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:48,overall:57,contractWeeks:48},
  {name:"Chasm",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:52,overall:60},
  {name:"Bully Stutter",promo:"coastal",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:54,overall:69,contractWeeks:92},
  {name:"Mick Love",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:61,overall:72},
  {name:"Keith Corner",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:57,overall:69},
  {name:"Theodore Bookman",promo:"coastal",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:61,overall:73,contractWeeks:35},
  {name:"Rick O'Tee",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:37,overall:66},
  {name:"Mustafa Ninja",promo:"northerngrit",gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:39,overall:62,contractWeeks:16},
  {name:"Sheldon Benson",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:50,overall:63},
  {name:"Chase Academy",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:40,overall:74},
  {name:"Peter Funn",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:32,overall:68},
  {name:"Ty Dape",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:29,overall:65},
  {name:"Brent Eleven",promo:"northerngrit",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:43,overall:61,contractWeeks:32},
  {name:"Tyger Freeze",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:38,overall:59},
  {name:"Jimmy True",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:54,overall:66},
  {name:"Koffee Prince",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:44,overall:74},
  {name:"Creed Forest",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:39,overall:72},
  {name:"Big Voice Eric",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:40,overall:75},
  {name:"Dirty Dan Masters",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:29,overall:72},
  {name:"El Vikinson",promo:"northerngrit",gender:"Male",weightClass:"Cruiserweight",alignment:"Face",age:27,overall:71,contractWeeks:77},
  {name:"Ren Platinum",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:44,overall:78},
  {name:"NEKAT",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:45,overall:77},
  {name:"Zane Sand Jr",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:38,overall:78},
  {name:"Shota Uno",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:29,overall:70},
  {name:"Jin Black",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:33,overall:66},
  {name:"Juicy Bob",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:37,overall:66},
  {name:"Dave Finkles",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:32,overall:63},
  {name:"Timmy Teel",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:33,overall:66},
  {name:"Teel Low",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:34,overall:60},
  {name:"Good Luck Fate",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:43,overall:61},
  {name:"The Fantastico",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:39,overall:60},
  {name:"Mark Jamison",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:36,overall:76},
  {name:"Neil Jamison",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:36,overall:76},
  {name:"Wheeler Rider",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:27,overall:72},
  {name:"Miss Fortune Vale",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Heel",age:34,overall:61},
  {name:"Sariah Turner",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:33,overall:73},
  {name:"Roni Rain",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Heel",age:40,overall:72},
  {name:"May June",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:33,overall:73},
  {name:"Lightning Reby",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:39,overall:72},
  {name:"Jordanne Mercy",promo:null,gender:"Female",weightClass:"Heavyweight",alignment:"Face",age:28,overall:75},
  {name:"Chels Brown",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Heel",age:34,overall:68},
  {name:"Piper Seven",promo:null,gender:"Female",weightClass:"Heavyweight",alignment:"Heel",age:34,overall:71},
  {name:"Nia Groove",promo:null,gender:"Female",weightClass:"Heavyweight",alignment:"Heel",age:42,overall:72},
  {name:"Trin Bro",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:38,overall:69},
  {name:"Karen",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:37,overall:79},
  {name:"Reagan Wilde",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:39,overall:79},
  {name:"Charlie Vantage",promo:null,gender:"Female",weightClass:"Heavyweight",alignment:"Heel",age:40,overall:79},
  {name:"Nova Ryder",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:37,overall:79},
  {name:"Mommy Riptide",promo:null,gender:"Female",weightClass:"Heavyweight",alignment:"Heel",age:37,overall:80},
  {name:"Lively Morrison",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:32,overall:76},
  {name:"Alexis Bloom",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:34,overall:75},
  {name:"Akira",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Heel",age:44,overall:80},
  {name:"Yumi Tempest",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:37,overall:74},
  {name:"Naomi Mist",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Heel",age:30,overall:75},
  {name:"Nicola Betty",promo:"coastal",gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:42,overall:67,contractWeeks:15},
  {name:"Brenna Betty",promo:"coastal",gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:41,overall:66,contractWeeks:21},
  {name:"Charles Haze",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:31,overall:66},
  {name:"Slick Billy",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:31,overall:66},
  {name:"King Ota ",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:27,overall:76},
  {name:"Joel Coffee",promo:"redline",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:35,overall:61,contractWeeks:36},
  {name:"Mick Coffee",promo:"redline",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:33,overall:61,contractWeeks:52},
  {name:"Wolfman Scot",promo:"redline",gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:34,overall:60,contractWeeks:60,champion:true},
  {name:"Joel Appears",promo:"apex",gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:37,overall:69,contractWeeks:91},
  {name:"Jay Mortal",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:41,overall:63},
  {name:"Highway Hound",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:56,overall:63},
  {name:"Bill Rifle",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:62,overall:64},
  {name:"Sean Exman",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:54,overall:62},
  {name:"Owen Steen",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:42,overall:75},
  {name:"Sam Ains",promo:"apex",gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:41,overall:75,contractWeeks:53},
  {name:"NY Morn",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:43,overall:75},
  {name:"William Mansman",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:57,overall:74},
  {name:"The Reckoning",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:33,overall:25},
  {name:"Bex Loulou",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:37,overall:25},
  {name:"Amina The Dreamer",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:44,overall:25},
  {name:"Kriss Mac",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:39,overall:25},
  {name:"Ged Mac",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:41,overall:25},
  {name:"Howard Graeme",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:39,overall:25},
  {name:"Emma Louise",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:35,overall:25},
  {name:"Jessica Red",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:34,overall:25},
  {name:"Willow Matilda",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:20,overall:25},
  {name:"River Jane",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Heel",age:18,overall:25},
  {name:"Evelyn Jane",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Heel",age:18,overall:25},
  {name:"Arthur Howardson",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:18,overall:25},
  {name:"Seth Andrews",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:18,overall:25},
  {name:"Norah Rose",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Face",age:18,overall:25},
  {name:"Theodore Ali",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:18,overall:25},
  {name:"Chris DC",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:23,overall:25},
  {name:"Big D ",promo:null,gender:"Female",weightClass:"Light Heavyweight",alignment:"Heel",age:23,overall:25}
];
const STAGGERED_DEBUT_DATA = [
  {name:"The Colossus",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:54,overall:81},
  {name:"Shane Mitchell",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:60,overall:80},
  {name:"Dentist Cain",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:58,overall:73},
  {name:"Real Mike",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:45,overall:71},
  {name:"Prince Day",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:44,overall:78},
  {name:"Damon The Pastor",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:44,overall:76},
  {name:"King Farrelly",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:48,overall:74},
  {name:"Ren Kaido",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:46,overall:78},
  {name:"The Badman PAX",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:39,overall:73},
  {name:"Drago Lou",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:31,overall:61},
  {name:"Ryo Hayashi",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:31,overall:78},
  {name:"Kenji Rival",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:44,overall:78},
  {name:"Kenta Ishida",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:38,overall:78},
  {name:"Scott Revive",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:41,overall:72},
  {name:"Dash Revive",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:39,overall:63},
  {name:"Rick Devils",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:35,overall:69},
  {name:"Big Teach",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:39,overall:69},
  {name:"Line",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:25,overall:64},
  {name:"Hobson Lion Power",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:34,overall:63},
  {name:"Austin Factory",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:29,overall:66},
  {name:"Lex Shellfish",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:41,overall:63},
  {name:"Chris Motor",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:43,overall:63},
  {name:"Christopher Angel",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:51,overall:63},
  {name:"Victor Vane",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Heel",age:25,overall:22},
  {name:"Dante Cross",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Heel",age:26,overall:26},
  {name:"Marcus Creed",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Face",age:21,overall:21},
  {name:"Cade Holloway",promo:null,gender:"Male",weightClass:"Light Heavyweight",alignment:"Face",age:22,overall:18},
  {name:"Lance Valor",promo:null,gender:"Male",weightClass:"Heavyweight",alignment:"Face",age:23,overall:19},
  {name:"Nico Vendetta",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Face",age:24,overall:24},
  {name:"Lennox King",promo:null,gender:"Male",weightClass:"Cruiserweight",alignment:"Face",age:35,overall:69}
];
// Preset tag teams/stables — can span any promotion or freelance, not just the
// player's roster. Each member name must exactly match a name in ROSTER_DATA
// or STAGGERED_DEBUT_DATA. First two members listed become the core tag team.
// Waiting on the designer's list — empty for now, ready to receive it.
const PRESET_STABLES = [
  { name: "Familia", members: ["Jace Bro", "Jim Bro", "Joe Marshal"] },
  { name: "Heart Boyz", members: ["Josh Heart", "Mick Heart"] },
  { name: "Enlightened Flighters", members: ["Jon Ricter", "Dominik Voss", "The Badman PAX"] },
  { name: "Mexibros", members: ["Pinto", "Phoenix"] },
  { name: "English Strengh", members: ["Peter Funn", "Ty Dape", "Brent Eleven"] },
  { name: "Previous Night", members: ["Koffee Prince", "Creed Forest", "Big Voice Eric"] },
  { name: "Monkey Future", members: ["Timmy Teel", "Teel Low"] }, // "Toma Teel" in the source list doesn't match anyone — used "Timmy Teel" instead, please confirm
  { name: "The Older Lariats", members: ["Mark Jamison", "Neil Jamison"] },
  { name: "GTFO", members: ["Scott Revive", "Dash Revive"] },
  { name: "Betty Twins", members: ["Nicola Betty", "Brenna Betty"] },
  { name: "Scot Men", members: ["Joel Coffee", "Mick Coffee", "Wolfman Scot"] },
  { name: "Pistol Bikes", members: ["Lex Shellfish", "Chris Motor"] },
  { name: "By The Rules", members: ["Highway Hound", "Bill Rifle", "Paul Blueblood", "Sean Exman"] },
];

// A one-time bulk infusion of extra talent at world creation — half
// freelance free agents, half young prospects already signed to a rival
// (so Scouting has real day-one targets instead of only after years of
// simulated rival signings). Consumes reserveNameAt(0..BULK_DEBUT_COUNT-1);
// the ongoing debut generator's starting index is set past this range (see
// where nextReserveIndex is initialized) so nobody ends up with a duplicate
// name down the line.
const BULK_DEBUT_COUNT = 300;
const BULK_FREELANCE_COUNT = 150;
function buildBulkWorldTalent() {
  const extras = [];
  for (let i = 0; i < BULK_FREELANCE_COUNT; i++) {
    extras.push(makeWrestler(reserveNameAt(i)));
  }
  for (let i = BULK_FREELANCE_COUNT; i < BULK_DEBUT_COUNT; i++) {
    const rival = RIVAL_COMPANIES[(i - BULK_FREELANCE_COUNT) % RIVAL_COMPANIES.length];
    extras.push(makeWrestlerFromOverall(reserveNameAt(i), rand(15, 45), {
      age: rand(18, 24),
      contractedTo: rival.id,
      contractExpiresWeek: 1 + rand(40, 90),
    }));
  }
  return extras;
}

let _initialChampions = {}; // company id -> wrestler name, set by buildInitialPool, read once by rivalTitles init
function buildInitialPool() {
  _initialChampions = {};
  const pool = ROSTER_DATA.map((d) => {
    const w = makeWrestlerFromOverall(d.name, d.overall, {
      age: d.age, sex: d.gender, weightClass: d.weightClass, alignment: d.alignment,
      contractedTo: d.promo || null,
      contractExpiresWeek: d.promo ? 1 + (d.contractWeeks || 52) : null,
    });
    if (d.champion && d.promo) _initialChampions[d.promo] = w.name;
    return w;
  });
  return [...pool, ...buildBulkWorldTalent()];
}

const NEWS_EVENTS = [
  { type: "GREAT NEWS!", text: "You got a new sponsor", amount: 5000 },
  { type: "GREAT NEWS!", text: "Your fans want to make sure you succeed, they paid into your Gofund.", amount: 3000 },
  { type: "GREAT NEWS!", text: "Your sponsors gave you a bonus!", amount: 2500 },
  { type: "GREAT NEWS!", text: "All your merch sold out!", amount: 0 },
  { type: "GREAT NEWS!", text: "The fans loved the show", amount: 0 },
  { type: "GREAT NEWS!", text: "The fans loved the show", amount: 0 },
  { type: "GREAT NEWS!", text: "The fans loved the show", amount: 0 },
  { type: "BAD NEWS!", text: "A fan was injured during the show! You have been fined", amount: -5000 },
  { type: "BAD NEWS!", text: "A fan was injured during the show! You have been fined", amount: -18000 },
  { type: "BAD NEWS!", text: "Your wrestlers' bus broke down, you had to pay for alternative travel", amount: -2500 },
  { type: "BAD NEWS!", text: "The fans did not like the show!", amount: 0 },
  { type: "BAD NEWS!", text: "There was a power outage in the middle of the show", amount: -1000 },
  { type: "BAD NEWS!", text: "Someone stole your merch!", amount: -850 },
  { type: "BAD NEWS!", text: "The ring needs repairing", amount: -250 },
  { type: "BAD NEWS!", text: "The ring needs repairing", amount: -500 },
  { type: "BAD NEWS!", text: "The fans did not like the show!", amount: 0 },
  { type: "BAD NEWS!", text: "The fans did not like the show!", amount: 0 },
  { type: "NEWS UPDATE!", text: "No news from this show", amount: 0 },
  { type: "NEWS UPDATE!", text: "No news from this show", amount: 0 },
  { type: "NEWS UPDATE!", text: "No news from this show", amount: 0 },
  { type: "NEWS UPDATE!", text: "The fans were generally impressed with the show", amount: 0 },
  { type: "NEWS UPDATE!", text: "The fans were generally impressed with the show", amount: 0 },
  { type: "NEWS UPDATE!", text: "The fans were generally displeased with the show", amount: 0 },
  { type: "NEWS UPDATE!", text: "The fans were generally displeased with the show", amount: 0 },
  { type: "NEWS UPDATE!", text: "The fans want a new title!", amount: 0 },
  { type: "NEWS UPDATE!", text: "The fans want to see a new wrestler debut", amount: 0 },
  { type: "NEWS UPDATE!", text: "A brawl broke out backstage during the show", amount: 0 },
  { type: "NEWS UPDATE!", text: "A brawl broke out in the fans during the show & damaged the arena", amount: -1000 },
  { type: "NEWS UPDATE!", text: "No news from this show", amount: 0 },
  { type: "NEWS UPDATE!", text: "No news from this show", amount: 0 },
  { type: "NEWS UPDATE!", text: "No news from this show", amount: 0 },
  { type: "NEWS UPDATE!", text: "No news from this show", amount: 0 },
  { type: "NEWS UPDATE!", text: "No news from this show", amount: 0 },
  { type: "NEWS UPDATE!", text: "No news from this show", amount: 0 },
  { type: "NEWS UPDATE!", text: "No news from this show", amount: 0 },
  { type: "GREAT NEWS!", text: "Your latest promotional video went viral! Huge buzz online!", amount: 0 },
  { type: "GREAT NEWS!", text: "A major sports network just offered to show replays from your event!", amount: 7500 },
  { type: "GREAT NEWS!", text: "Merchandise sales are through the roof after tonight's show!", amount: 1500 },
  { type: "GREAT NEWS!", text: "A local business offered to sponsor your next big event!", amount: 4000 },
  { type: "BAD NEWS!", text: "The arena had unexpected structural issues; you're liable for repairs.", amount: -3000 },
  { type: "BAD NEWS!", text: "Your primary sound system malfunctioned mid-show, ruining a segment.", amount: -750 },
  { type: "BAD NEWS!", text: "A backstage catering error led to several wrestlers feeling ill.", amount: -500 },
  { type: "BAD NEWS!", text: "Counterfeit merchandise was sold outside the venue, damaging your brand.", amount: -1200 },
  { type: "NEWS UPDATE!", text: "The wrestling media is buzzing about your promotion's innovative booking.", amount: 0 },
  { type: "NEWS UPDATE!", text: "A rival promotion is trying to poach some of your talent!", amount: 0 },
  { type: "GREAT NEWS!", text: "Your latest promotional video went viral! Huge buzz online!", amount: 0 },
  { type: "GREAT NEWS!", text: "A major sports network just offered to show replays from your event!", amount: 7500 },
  { type: "GREAT NEWS!", text: "Merchandise sales are through the roof after tonight's show!", amount: 1500 },
  { type: "GREAT NEWS!", text: "A local business offered to sponsor your next big event!", amount: 4000 },
  { type: "BAD NEWS!", text: "The arena had unexpected structural issues; you're liable for repairs.", amount: -3000 },
  { type: "BAD NEWS!", text: "Your primary sound system malfunctioned mid-show, ruining a segment.", amount: -750 },
  { type: "BAD NEWS!", text: "A backstage catering error led to several wrestlers feeling ill.", amount: -500 },
  { type: "BAD NEWS!", text: "Counterfeit merchandise was sold outside the venue, damaging your brand.", amount: -1200 },
  { type: "NEWS UPDATE!", text: "The wrestling media is buzzing about your promotion's innovative booking.", amount: 0 },
  { type: "NEWS UPDATE!", text: "A rival promotion is trying to poach some of your talent!", amount: 0 },
];

// Locker-room flavor events now also update structured relationships.
const UNIVERSE_EVENT_TEMPLATES = [
  // Friendship
  { text: "{A} and {B} were seen getting suspiciously close backstage after the show.", effect: "friend" },
  { text: "Fans spotted {A} and {B} out together at a restaurant.", effect: "friend" },
  { text: "{A} and {B} were seen training together at 5am — a new alliance brewing?", effect: "friend" },
  { text: "{B} showed up to support {A} at a public appearance this week.", effect: "friend" },
  { text: "{A} and {B} posted a workout video together, fans loved the chemistry.", effect: "friend" },
  { text: "{A} credited {B} as a mentor in a recent interview.", effect: "friend" },
  { text: "{A} and {B} were seen carpooling to the show together.", effect: "friend" },
  { text: "{B} helped {A} move house this week, according to social media.", effect: "friend" },
  { text: "{A} and {B} have started a podcast together.", effect: "friend" },
  // Rivalry
  { text: "{A} was caught badmouthing {B} to a wrestling podcast.", effect: "rival" },
  { text: "{A} and {B} were spotted arguing in the car park after the show.", effect: "rival" },
  { text: "{A} unfollowed {B} on social media, and the internet noticed immediately.", effect: "rival" },
  { text: "{A} called out {B} by name during a promo, unprompted.", effect: "rival" },
  { text: "{B} refused to shake {A}'s hand backstage after their last match.", effect: "rival" },
  { text: "{A} and {B} had to be separated backstage after a heated confrontation.", effect: "rival" },
  { text: "{A} took a shot at {B} in a since-deleted social media post.", effect: "rival" },
  { text: "Sources say {A} and {B} haven't spoken since a disputed finish months ago.", effect: "rival" },
  // Romance (male/female pairings only, per design)
  { text: "Rumours are swirling that {A} and {B} are secretly dating.", effect: "partner" },
  { text: "{A} and {B} announced their engagement, shocking fans.", effect: "partner" },
  { text: "{A} and {B} were spotted holding hands at a fan event.", effect: "partner" },
  { text: "{A} posted a cryptic couple's photo with {B} over the weekend.", effect: "partner" },
  { text: "{A} and {B} confirmed their relationship in a joint interview.", effect: "partner" },
  // Neutral flavor — no relationship change, just texture
  { text: "{A} debuted a new look this week, and fans have opinions.", effect: null },
  { text: "{A} was spotted signing autographs outside the arena for hours after the show.", effect: null },
  { text: "{A} launched a new merch line to mixed reviews.", effect: null },
  { text: "{A} gave a shoutout to the local fans during their entrance.", effect: null },
  { text: "{A} tweaked their entrance music, and it's already trending.", effect: null },
  { text: "{A} was interviewed by a national newspaper about their career.", effect: null },
  { text: "{A} revealed a new tattoo this week, dedicated to their hometown.", effect: null },
  { text: "{A} thanked the fans for their support after a tough stretch.", effect: null },
  { text: "{A} appeared on a rival podcast to talk about the business.", effect: null },
  { text: "{A} is rumoured to be working on a new finishing move.", effect: null },
];
// No probability gate — a handful of these fire every single week, drawn from
// across the whole wrestling world (not just wrestlers on this week's card).
const ROSTER_EVENTS_MIN = 2;
const ROSTER_EVENTS_MAX = 4;

// Energy drains with use and recovers with rest. Drop low enough after a
// gruelling outing and there's a real chance of injury — sidelined anywhere
// from 3 to 52 weeks, regardless of who they're signed to.
const ENERGY_LOSS_SPECIALTY = [8, 15];
const ENERGY_LOSS_MATCH = [3, 6];
const ENERGY_CHANGE_SEGMENT = [-1, 1];
const ENERGY_RECOVERY_RESTING = [2, 5];
const ENERGY_RECOVERY_INJURED = 3;
const INJURY_ENERGY_THRESHOLD = 20;
const INJURY_CHANCE = 0.25;
const INJURY_WEEKS_MIN = 3;
const INJURY_WEEKS_MAX = 52;
const INJURY_RETURN_ENERGY = 55;
// Just flavor and a modest duration swing per type — deliberately not gating
// specialty matches or anything else off this, keeping it simple.
const INJURY_TYPES = [
  { name: "Knee", weeksMult: 1.2 },
  { name: "Shoulder", weeksMult: 1.0 },
  { name: "Back", weeksMult: 1.3 },
  { name: "Concussion", weeksMult: 0.8 },
  { name: "Ankle", weeksMult: 0.9 },
  { name: "Rib", weeksMult: 1.0 },
  { name: "Elbow", weeksMult: 0.9 },
];
function pickInjuryType() {
  return INJURY_TYPES[rand(0, INJURY_TYPES.length - 1)];
}
const RIVAL_SHOW_CHANCE = 0.7;

// Loans: flat 20% interest baked into the weekly repayment, spread over the chosen
// term. Bigger loans require more reputation — a bank won't hand a brand-new,
// unknown promotion £100k any more than it would book them the biggest arena.
const LOAN_OPTIONS = [
  { amount: 10000, weeks: 26, minTier: "Unknown" },
  { amount: 25000, weeks: 26, minTier: "Local" },
  { amount: 25000, weeks: 52, minTier: "Local" },
  { amount: 50000, weeks: 52, minTier: "Regional" },
  { amount: 50000, weeks: 78, minTier: "Regional" },
  { amount: 100000, weeks: 104, minTier: "National" },
];
const LOAN_INTEREST_RATE = 0.2;

// Rare but real: roughly once every couple of years of in-game time, something
// genuinely bad happens to the business — a lawsuit, an audit, a scandal — and
// takes a real bite out of the bank. Severity is random each time it fires.
const CATASTROPHE_CHANCE = 0.012;
const CATASTROPHE_SEVERITIES = [0.2, 0.4, 0.6];
const CATASTROPHE_REASONS = [
  "A former wrestler is suing {company} over an in-ring injury, and you've settled out of court",
  "A surprise tax audit has landed {company} with a hefty back-payment bill",
  "A sponsor pulled out mid-contract and is suing {company} for breach of terms",
  "An embezzlement scandal within the front office has cost {company} dearly",
  "A data breach exposed customer payment details, and {company} is footing the compensation bill",
];
// A separate roll from the general catastrophe above — specifically about
// crowd and venue security, so it's the Security staff role (not Ring Crew)
// that cuts it down, and it only fires on a week a show actually ran (no
// crowd, no security incident). Reuses the exact same plumbing (severity
// tiers, profit hit, the DISASTER! banner) rather than a parallel system.
const SECURITY_INCIDENT_CHANCE = 0.012;
const SECURITY_INCIDENT_REASONS = [
  "A fight broke out in the crowd and {company} is covering the resulting medical and legal costs",
  "A fan jumped the barrier and got hurt before security could step in — {company} is on the hook for it",
  "An unauthorized person talked their way backstage and caused a scene, costing {company} in damages and goodwill",
  "Overcrowding at the venue led to a safety violation fine for {company}",
];

// Goals & requests: wrestlers occasionally ask for something. Promise it and
// follow through, happiness rises; break the promise or decline, it falls.
const REQUEST_CHANCE = 0.08; // per eligible wrestler per week
const REQUEST_DEADLINE_WEEKS = 8;
const REQUEST_TYPES = [
  { type: "title-shot", text: (w) => `${w.name} wants a shot at a title.` },
  { type: "raise", text: (w) => `${w.name} is asking for better pay.` },
  { type: "push", text: (w) => `${w.name} wants to be pushed to the Main Event.` },
  { type: "time-off", text: (w) => `${w.name} is asking for some time off.` },
  { type: "match", text: null }, // target picked at generation time, text built specially
  { type: "role-change", text: null, minAge: 33 }, // target role picked at generation time, text built specially — only raised by wrestlers old enough to be eyeing a second act
];
const HAPPINESS_DECLINE_PENALTY = -15;
const HAPPINESS_BROKEN_PENALTY = -25;
const HAPPINESS_FULFILLED_BONUS = 20;

function attrOf(w) {
  const heldNow = (w.holdsTitles || []).length;
  // A big enough ranking-points penalty (down to -50) can push this below
  // zero — every other stat in the game is floored, this one wasn't, and an
  // overall of 0 or less silently drops a wrestler out of the roster list's
  // default "Min Overall Rating" filter as if they didn't exist.
  return Math.max(1, avgStats(w) + Math.round(w.rankingPts / 4) + heldNow * 2 + Math.round(w.titleReigns * 0.5));
}
// Consistent, comparable option label for match-booking wrestler dropdowns —
// name in caps (matching the display convention used everywhere else in the
// game), plus alignment and overall so two options can be told apart at a
// glance without opening each one up.
function wrestlerOptionLabel(w) {
  return `${w.name.toUpperCase()} — ${w.alignment} · OVR ${Math.round(attrOf(w))}`;
}
function teamAttr(team) {
  const members = team.filter(Boolean);
  if (members.length === 0) return 0;
  return members.reduce((s, w) => s + attrOf(w), 0) / members.length;
}
function popularityTier(p) {
  if (p >= 81) return "Global";
  if (p >= 41) return "National";
  if (p >= 16) return "Regional";
  if (p >= 6) return "Local";
  return "Unknown";
}
const TIER_RANK = { Unknown: 0, Local: 1, Regional: 2, National: 3, Global: 4 };
// Rival promotions don't have a visible Staff roster panel of their own —
// listing names would be a lot of UI for something the player never directly
// touches — but they DO actually compete for the same shared staff candidate
// pool the player hires from, hiring and occasionally losing people over
// time (see the weekly tick). Their backstage quality is a popularity floor
// (so a company that hasn't landed anyone yet still isn't totally hopeless)
// plus a real bonus from whoever they've actually got signed — so two
// equally popular rivals can have visibly different production depending on
// whether they've actually won the hiring race.
function rivalStaffBonus(popularity, hiredSkills = []) {
  const base = Math.round((clamp(popularity, 0, 100) / 100) * 6);
  const avgSkill = hiredSkills.length > 0 ? hiredSkills.reduce((s, v) => s + v, 0) / hiredSkills.length : 0;
  const staffBonus = Math.round((avgSkill / 100) * 6);
  return base + staffBonus;
}
function rivalProductionLabel(bonusPoints) {
  if (bonusPoints >= 10) return "Elite";
  if (bonusPoints >= 7) return "Polished";
  if (bonusPoints >= 4) return "Solid";
  if (bonusPoints >= 1) return "Basic";
  return "Minimal";
}
// Every rival's own typical show length — a base template, same idea as the
// player's own venue-suggested default, derived straight from popularity so
// it automatically applies to any custom/imported company too (nothing to
// fill in on upload). Feeds both their detail-page flavor and how many
// matches they simulate on a given week (a longer show has more room).
const RIVAL_SHOW_MINUTES = { Unknown: 30, Local: 45, Regional: 60, National: 90, Global: 120 };
function rivalShowMinutes(popularity) {
  return RIVAL_SHOW_MINUTES[popularityTier(popularity)];
}
// Named recurring shows for every rival, same spirit as the player's own
// Calendar event templates — derived, not separately tracked: how many a
// company has, and whether they're weekly TV-style shows or a once-a-month
// PPV-style special, scales with their CURRENT tier (so growing into a
// bigger tier genuinely adds a show, live). The actual names are
// deterministic from the company's own id so they don't reshuffle every
// render. A brand new company doesn't run weekly at all yet — just the
// occasional small show, the same cadence as the shared monthly PPV week.
const RIVAL_SHOW_WORDS = ["Mayhem", "Rampage", "Uproar", "Collision", "Fury", "Showdown", "Revolution", "Primetime", "Payback", "Overdrive", "Warzone", "Fallout", "Reckoning", "Ignition", "Backlash"];
const PPV_SHOW_WORDS = ["Supremacy", "Apocalypse", "Reign", "Legacy", "Ascension", "Vendetta", "Dynasty", "Conquest"];
// { weekly: how many distinct weekly-rotating shows, ppv: whether there's
// also a separately-branded monthly special on top of those }.
const RIVAL_SHOW_STRUCTURE = { Unknown: { weekly: 0, ppv: false }, Local: { weekly: 1, ppv: false }, Regional: { weekly: 2, ppv: false }, National: { weekly: 2, ppv: true }, Global: { weekly: 3, ppv: true } };
function rivalCompanyAbbrev(name) {
  const initials = name.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase();
  return initials.length >= 2 ? initials.slice(0, 4) : name.slice(0, 3).toUpperCase();
}
// Returns { weekly: [names...], ppv: name|null } — a brand new (Unknown)
// company has no weekly show, just an occasional small one, modeled as a
// single-entry "weekly" list that only actually fires on the shared PPV
// cadence (see rivalShowDueThisWeek) rather than inventing a second cadence.
function rivalEventTemplates(co) {
  const abbr = rivalCompanyAbbrev(co.name);
  const seed = hashStr(co.id);
  const structure = RIVAL_SHOW_STRUCTURE[popularityTier(co.popularity)];
  const weeklyCount = structure.weekly || 1; // Unknown still gets one named show, just a rare one
  const weekly = Array.from({ length: weeklyCount }, (_, i) => `${abbr} ${RIVAL_SHOW_WORDS[(seed + i) % RIVAL_SHOW_WORDS.length]}`);
  const ppv = structure.ppv ? `${abbr} ${PPV_SHOW_WORDS[seed % PPV_SHOW_WORDS.length]}` : null;
  return { weekly, ppv, runsWeekly: structure.weekly > 0 };
}
// Decides whether this company even attempts a show this week, and under
// which name — the one place both the sim and the display agree on cadence.
function rivalShowDueThisWeek(co, weekNumber, isPPVWeek) {
  const { weekly, ppv, runsWeekly } = rivalEventTemplates(co);
  if (isPPVWeek && ppv) return { eventName: ppv, guaranteed: true };
  if (runsWeekly) return { eventName: weekly[weekNumber % weekly.length], guaranteed: false };
  // Unknown tier: no weekly show at all — just their one small show, on the
  // same once-a-month cadence as everyone else's PPV week.
  if (isPPVWeek) return { eventName: weekly[0], guaranteed: false };
  return null;
}
// Region popularity bars — derived, not separately simulated: no per-region
// history is tracked, so this is worked out fresh each render from the one
// popularity number every rival already has plus a fixed home region. A
// bigger promotion's reach bleeds further outside its home turf; a small
// one barely registers anywhere else, same as the player's own city-by-city
// growth is capped by overall reputation.
const REGIONS = ["North America", "Latin America", "Europe", "Asia", "Oceania", "Africa"];
const RIVAL_HOME_REGION = {
  apex: "North America", steelcity: "North America", coastal: "North America",
  ironclad: "Europe", northerngrit: "Europe",
  redline: "Asia", undergroundbrawl: "Oceania", backlot: "Latin America",
};
function regionPopularity(co) {
  const home = RIVAL_HOME_REGION[co.id] || "North America";
  const tier = popularityTier(co.popularity);
  const bleedFrac = tier === "Global" ? 0.6 : tier === "National" ? 0.3 : tier === "Regional" ? 0.1 : 0;
  return Object.fromEntries(REGIONS.map((r) => [r, Math.round(r === home ? co.popularity : (co.popularity * bleedFrac) / (REGIONS.length - 1))]));
}
// Founding a developmental feeder promotion is a real investment, not a free
// toggle — building out a training facility and a second roster costs more
// the bigger you already are.
const FEEDER_SETUP_COSTS = { Unknown: 50000, Local: 75000, Regional: 125000, National: 250000, Global: 500000 };

// Production value — pyro, titantron, lighting rig, camera/broadcast quality
// — bundled into one spectacle tier rather than four separate sliders nobody
// would touch individually. A one-time capital upgrade (Back Office), plus
// a weekly upkeep once past Basic, same shape as Staff: it raises the match
// rating ceiling (ratingBonus, stacked with staffRatingBonus) and makes your
// broadcast worth more to a TV network (tvMult, applied to network income).
const PRODUCTION_TIERS = [
  { name: "Minimal", cost: 0, upkeep: 0, ratingBonus: 0, tvMult: 1 },
  { name: "Basic", cost: 15000, upkeep: 0, ratingBonus: 2, tvMult: 1.1 },
  { name: "Enhanced", cost: 60000, upkeep: 300, ratingBonus: 5, tvMult: 1.25 },
  { name: "Spectacle", cost: 200000, upkeep: 900, ratingBonus: 9, tvMult: 1.45 },
];

// Advertising — a proactive, per-show spend rather than a passive growth
// stat. Unlike Staff/Production (what happens once you're in the building),
// this is about getting people to actually show up and hear about you in
// the first place: posters/flyers, a local TV spot, or a social media
// push. Chosen fresh per show (same lifecycle as ticket price — resets to
// "None" whenever a new scheduled show comes due), it boosts both this
// show's attendance and how much this show grows the city's popularity.
const AD_CAMPAIGNS = [
  { key: "none", label: "None", cost: 0, attendanceMult: 1, popularityMult: 1 },
  { key: "posters", label: "Posters & Flyers", cost: 150, attendanceMult: 1.06, popularityMult: 1.1 },
  { key: "tv", label: "TV Spot", cost: 600, attendanceMult: 1.15, popularityMult: 1.25 },
  { key: "social", label: "Social Media Blitz", cost: 1200, attendanceMult: 1.25, popularityMult: 1.4 },
];

// Speciality Matches — gated by company level, cost extra to book, and boost the
// rating ceiling. Each type is driven by whichever stat fits it best, blended into
// the win probability alongside overall ATTR — so a specialist can upset a bigger
// name in the right kind of match, and different stipulations reward different builds.
// Gating loosened from the original mobile-sized curve: a No DQ or Hardcore
// brawl needs nothing but a lenient referee, and plenty of real indie
// promotions run tables/ladder/submission stipulations on a shoestring
// budget — none of that calls for arena-level production. Only the
// genuinely structural gimmicks (a literal cage or chamber has to be built
// and trucked in) stay reserved for the biggest shows.
const SPECIALTY_MATCHES = [
  { id: "nodq", name: "No DQ", minTier: "Unknown", cost: 100, ratingBonus: 3, statKey: "atk" },
  { id: "hardcore", name: "Hardcore Match", minTier: "Unknown", cost: 150, ratingBonus: 4, statKey: "atk" },
  { id: "tables", name: "Tables Match", minTier: "Local", cost: 250, ratingBonus: 5, statKey: "spec" },
  { id: "submission", name: "Submission Match", minTier: "Local", cost: 350, ratingBonus: 6, statKey: "sub" },
  { id: "fca", name: "Falls Count Anywhere", minTier: "Regional", cost: 300, ratingBonus: 5, statKey: "spec" },
  { id: "ladder", name: "Ladder Match", minTier: "Regional", cost: 750, ratingBonus: 8, statKey: "jmp" },
  { id: "tlc", name: "TLC Match", minTier: "National", cost: 1000, ratingBonus: 10, statKey: "jmp" },
  { id: "lastmanstanding", name: "Last Man Standing", minTier: "National", cost: 600, ratingBonus: 7, statKey: "eng" },
  { id: "ironman", name: "Iron Man Match", minTier: "National", cost: 900, ratingBonus: 9, statKey: "eng" },
  { id: "cage", name: "Cage Match", minTier: "Global", cost: 1500, ratingBonus: 12, statKey: "atk" },
  { id: "chamber", name: "Elimination Chamber", minTier: "Global", cost: 2500, ratingBonus: 15, statKey: "spec" },
];
// Why this match is actually happening — separate from the specialty
// stipulation above, this is about the BOOKING intent, not the match type.
// Mirrors the "what's this match for" idea from booking sims like Pro
// Wrestling Sim: a Competitive match is just a fair fight, but a booker
// sometimes wants something else out of it (a classic, an endorsement, a
// fast squash) and should pay a real cost or get a real payoff for it.
const MATCH_PURPOSES = [
  { id: "competitive", label: "Competitive", desc: "A straight, fair fight — nothing riding on it beyond the result itself.", capBonus: 0, energyMult: 1 },
  { id: "showcase", label: "Steal the Show", desc: "Both workers go all out for the best match they can have — harder on their energy, but a real shot at the night's best rating.", capBonus: 8, energyMult: 1.4 },
  { id: "putover", label: "Put Over", desc: "Booked to make the winner look like a million bucks at the loser's expense — a real draw power bump for the winner, scaled to who they just beat.", capBonus: -3, energyMult: 0.9 },
  { id: "squash", label: "Squash", desc: "A dominant, one-sided win to get someone over fast — short, never a classic, but a big credibility injection if the loser is any kind of name.", capBonus: -18, energyMult: 0.5 },
];
const MATCH_PURPOSE_BY_ID = Object.fromEntries(MATCH_PURPOSES.map((p) => [p.id, p]));
// The narrative hook, independent of Purpose above — Purpose is why you're
// booking it (a fair fight, an endorsement, a squash), Match Story is what
// kind of match it reads as to the crowd. Matches Pro Wrestling Sim's split
// between the two (its Match Story field shows things like "Comedy Match").
// capBonus/floorBoostFrac work exactly like MATCH_PURPOSES' — "classic" and
// "underdog" compute their own bonus at the point they're applied instead,
// since both depend on how the two sides actually compare once a winner's
// picked, not a flat number.
const MATCH_STORIES = [
  { id: "standard", label: "Standard", desc: "No particular narrative hook — whatever the stats and Purpose produce." },
  { id: "comedy", label: "Comedy Match", desc: "Played for laughs — safer and more consistent with the crowd, but it's never going down as a classic.", capBonus: -8, floorBoostFrac: 0.35 },
  { id: "classic", label: "Back-and-Forth Classic", desc: "Both sides trade momentum all the way — a real shot at the night's best rating when they're closely matched on paper, flat if they're not." },
  { id: "underdog", label: "Underdog Story", desc: "Framed around the lesser-rated side fighting from behind — an actual upset pays off in both rating and the winner's draw power." },
];
const MATCH_STORY_BY_ID = Object.fromEntries(MATCH_STORIES.map((s) => [s.id, s]));
const SPECIALTY_WEIGHT = 0.5; // how much of the win probability the driving stat controls, vs overall ATTR
function specialtyUnlocked(type, popularity) {
  return TIER_RANK[popularityTier(popularity)] >= TIER_RANK[type.minTier];
}
function teamStat(team, key) {
  const members = team.filter(Boolean);
  if (members.length === 0) return 0;
  return members.reduce((s, w) => s + w[key], 0) / members.length;
}
// How the match actually ended — weighted by the winning side's stats, with
// DQ/Countout as rarer outcomes that aren't really about skill.
function pickWinMethod(winnerTeam) {
  const pinWeight = teamStat(winnerTeam, "atk") + 20;
  const subWeight = teamStat(winnerTeam, "sub") + 10;
  const dqWeight = 8;
  const countoutWeight = 10;
  const total = pinWeight + subWeight + dqWeight + countoutWeight;
  let roll = Math.random() * total;
  if ((roll -= pinWeight) <= 0) return "Pinfall";
  if ((roll -= subWeight) <= 0) return "Submission";
  if ((roll -= dqWeight) <= 0) return "Disqualification";
  return "Countout";
}

const START_DATE = new Date(2026, 0, 5);
function addWeeks(date, weeks) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}
function formatDate(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
// Compact money for tight header space — £20,000 becomes £20K, £1,500,000 becomes £1.5M.
function formatMoneyShort(n) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 1)}M`;
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}K`;
  return `${sign}${abs.toLocaleString()}`;
}
const PPV_EVERY = 4;
function yearOf(weekNum) {
  return Math.floor((weekNum - 1) / WEEKS_PER_YEAR) + 1;
}
function weekOfYear(weekNum) {
  return ((weekNum - 1) % WEEKS_PER_YEAR) + 1;
}

function StatRow({ w }) {
  return (
    <div className="flex gap-2.5 flex-wrap">
      {STAT_KEYS.map((k) => {
        const Icon = STAT_ICONS[k];
        return (
          <div key={k} className="flex items-center gap-1 text-[10px] text-[#8B8593]">
            <Icon size={11} className="text-[#8B6BC0]" />
            <span>{STAT_LABELS[k].slice(0, 3)} {w[k]}</span>
          </div>
        );
      })}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-bold tracking-widest rounded-t-md transition-colors border-b-2 ${
        active ? "text-[#F2ECDD] border-[#8B6BC0] bg-[#17151C]" : "text-[#8B8593] border-transparent hover:text-[#CFC9BB]"
      }`}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function SubTabButton({ active, onClick, icon: Icon, label, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${
        disabled
          ? "border-[#2B2733] text-[#5A5660] cursor-not-allowed"
          : active
          ? "bg-[#5B3B8C] border-[#5B3B8C] text-[#F2ECDD]"
          : "border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]"
      }`}
      style={active && !disabled ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C", color: "#F2ECDD" } : undefined}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function WrestlerDetailModal({ wrestler, pool, titles, weekNumber, perUseRoster, companyName, onRename, onSetAlignment, onSetPush, onClose }) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  if (!wrestler) return null;
  const ranked = [...pool].sort((a, b) => b.rankingPts - a.rankingPts);
  const position = ranked.findIndex((w) => w.name === wrestler.name) + 1;
  const winPct = wrestler.matches > 0 ? Math.round((wrestler.wins / wrestler.matches) * 100) : 0;
  const isYourPerUse = perUseRoster.includes(wrestler.name);

  const currentHoldings = [];
  let combinedWeeks = 0;
  titles.forEach((t) => {
    if (t.holders.includes(wrestler.name)) {
      const weeks = weekNumber - t.reignStartWeek;
      currentHoldings.push({ id: t.id, name: t.name, weeks });
      combinedWeeks += weeks;
    }
    t.history.forEach((h) => { if (h.holderNames.includes(wrestler.name)) combinedWeeks += h.reignWeeks; });
  });

  const employer =
    wrestler.contractedTo === "player" ? "Exclusively signed to your promotion" :
    wrestler.contractedTo ? `Exclusively signed to ${RIVAL_COMPANIES.find((c) => c.id === wrestler.contractedTo)?.name || "a rival promotion"}` :
    "Freelance";
  const contractWeeksLeft = wrestler.contractedTo && wrestler.contractExpiresWeek != null ? Math.max(0, wrestler.contractExpiresWeek - weekNumber) : null;

  const startEdit = () => { setNameInput(wrestler.name); setEditing(true); };
  const confirmEdit = () => { if (nameInput.trim()) { onRename(wrestler.name, nameInput.trim()); setEditing(false); } };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }}>
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <button onClick={onClose} className="flex items-center gap-1 text-xs text-[#8B8593] hover:text-[#F2ECDD] mb-4">
          <ChevronDown size={14} className="rotate-90" /> Back
        </button>
        <div className="flex items-start justify-between mb-1 gap-2">
          {editing ? (
            <div className="flex-1 flex items-center gap-1.5">
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="flex-1 border border-[#5B3B8C] rounded px-2 py-1 text-lg font-bold" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} autoFocus />
              <button onClick={confirmEdit} className="text-[#8B6BC0] hover:text-[#F2ECDD]"><Check size={18} /></button>
              <button onClick={() => setEditing(false)} className="text-[#8B8593] hover:text-[#F2ECDD]"><X size={18} /></button>
            </div>
          ) : (
            <>
              <div className="text-2xl font-black flex items-center gap-2" style={{ fontFamily: "Anton, sans-serif" }}>
                {wrestler.name.toUpperCase()}
                {!(wrestler.contractedTo && wrestler.contractedTo !== "player") && (
                  <button onClick={startEdit} className="text-[#8B8593] hover:text-[#F2ECDD]"><Pencil size={14} /></button>
                )}
              </div>
              <button onClick={onClose} className="text-[#8B8593] hover:text-[#F2ECDD]"><X size={18} /></button>
            </>
          )}
        </div>
        <div className="text-[11px] text-[#8B6BC0] font-bold tracking-wide mb-1">
          {effectiveTier(wrestler).toUpperCase()} &middot; ATTR {Math.round(attrOf(wrestler))} &middot; DRAW {Math.round(wrestler.drawPower ?? 50)} &middot; #{position} RANKED
          {wrestler.contractedTo === "player" && (wrestler.rosterLevel || "main") === "developmental" && <> &middot; POTENTIAL {Math.round(potentialOf(wrestler))}</>}
        </div>
        <div className="text-[10px] text-[#8B8593] mb-1">
          {wrestler.age} yrs &middot; {wrestler.sex} &middot; {wrestler.weightClass} &middot; {employer}
          {contractWeeksLeft !== null && <> &middot; {contractWeeksLeft} week{contractWeeksLeft === 1 ? "" : "s"} left on contract</>}
        </div>
        {deriveTraits(wrestler).length > 0 && (
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            {deriveTraits(wrestler).map((t) => (
              <span key={t.key} title={t.desc} className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#5B3B8C] text-[#8B6BC0]">{t.label}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] text-[#8B8593]">Alignment:</span>
          {(wrestler.contractedTo === "player" || isYourPerUse) ? (
            ALIGNMENTS.map((a) => (
              <button key={a} onClick={() => onSetAlignment(wrestler.name, a)} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${wrestler.alignment === a ? (a === "Face" ? "bg-green-700 border-green-700" : "bg-red-900 border-red-900") : "border-[#2B2733] text-[#8B8593]"}`}>
                {a}
              </button>
            ))
          ) : (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${wrestler.alignment === "Face" ? "text-green-400" : "text-red-400"}`}>{wrestler.alignment}</span>
          )}
        </div>
        {(wrestler.contractedTo === "player" || isYourPerUse) && (
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-[10px] text-[#8B8593]">Push:</span>
            <select value={wrestler.pushOverride || ""} onChange={(e) => onSetPush(wrestler.name, e.target.value || null)} className="bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-0.5 text-[10px]">
              <option value="">Default ({wrestler.tier}, from ability)</option>
              {TIER_ORDER.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-[9px] text-[#8B8593] italic">Your call as booker — doesn't change their actual ability, but a promotion or demotion is a real happiness swing.</span>
          </div>
        )}
        {isYourPerUse && <div className="text-[10px] text-[#8B6BC0] font-semibold mb-1">Also on your Per-Use roster — bookable per show, not exclusive.</div>}
        {wrestler.perUsedByRival && (
          <div className="text-[10px] text-[#8B6BC0] font-semibold mb-1">
            Booked per-use by {RIVAL_COMPANIES.find((c) => c.id === wrestler.perUsedByRival)?.name || "a rival promotion"} this week.
          </div>
        )}
        <div className="mb-2" />
        {wrestler.injuryWeeksRemaining && (
          <div className="flex items-center gap-2 bg-[#2A1414] border border-red-500 rounded-lg px-3 py-2 mb-3">
            <Skull size={14} className="text-red-400" />
            <span className="text-xs text-red-300 font-bold">INJURED{wrestler.injuryType ? ` — ${wrestler.injuryType}` : ""} — {wrestler.injuryWeeksRemaining} week{wrestler.injuryWeeksRemaining === 1 ? "" : "s"} remaining</span>
          </div>
        )}

        {currentHoldings.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {currentHoldings.map((h) => (
              <span key={h.id} className="flex items-center gap-1 bg-[#241B33] border border-[#5B3B8C] rounded-full px-2 py-0.5 text-[10px] font-bold text-[#8B6BC0]">
                <Award size={10} /> {h.name} &middot; {h.weeks} wk{h.weeks === 1 ? "" : "s"}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          {STAT_KEYS.filter((k) => k !== "eng").map((k) => {
            const Icon = STAT_ICONS[k];
            return (
              <div key={k}>
                <div className="flex items-center gap-1.5 text-[10px] text-[#8B8593] mb-1">
                  <Icon size={11} className="text-[#8B6BC0]" /> {STAT_LABELS[k]}
                  <span className="ml-auto text-[#CFC9BB]">{wrestler[k]}/100</span>
                </div>
                <div className="h-1.5 bg-[#232029] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#5B3B8C] to-[#8B6BC0]" style={{ width: `${wrestler[k]}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[#131117] rounded-lg p-2.5 text-center">
            <div className="text-lg font-black">{wrestler.matches}</div>
            <div className="text-[9px] text-[#8B8593] tracking-wide">MATCHES</div>
          </div>
          <div className="bg-[#131117] rounded-lg p-2.5 text-center">
            <div className="text-lg font-black">{wrestler.wins}-{wrestler.losses}</div>
            <div className="text-[9px] text-[#8B8593] tracking-wide">W-L ({winPct}%)</div>
          </div>
          <div className="bg-[#131117] rounded-lg p-2.5 text-center">
            <div className="text-lg font-black">{wrestler.rankingPts}</div>
            <div className="text-[9px] text-[#8B8593] tracking-wide">RANK PTS</div>
          </div>
        </div>

        <div className="mb-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-[9px] text-[#8B8593] mb-1"><span>ENERGY</span><span className="text-[#F2ECDD] font-bold">{wrestler.eng}/100</span></div>
              <div className="h-1.5 bg-[#232029] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#5B3B8C] to-[#8B6BC0]" style={{ width: `${wrestler.eng}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] text-[#8B8593] mb-1"><span>HAPPINESS</span><span className="text-[#F2ECDD] font-bold">{wrestler.happiness}/100</span></div>
              <div className="h-1.5 bg-[#232029] rounded-full overflow-hidden"><div className={`h-full bg-gradient-to-r ${wrestler.happiness < 35 ? "from-red-600 to-red-400" : "from-[#5B3B8C] to-[#8B6BC0]"}`} style={{ width: `${wrestler.happiness}%` }} /></div>
            </div>
          </div>
        </div>

        <div className="bg-[#131117] rounded-lg p-3 mb-3 text-xs space-y-1">
          <div><span className="text-[#8B8593]">Partner: </span><span className="font-semibold">{wrestler.partner || "None"}</span></div>
          <div><span className="text-[#8B8593]">Friends: </span><span className="font-semibold">{wrestler.friends.length ? wrestler.friends.join(", ") : "None"}</span></div>
          <div><span className="text-[#8B8593]">Rivals: </span><span className="font-semibold">{wrestler.rivals.length ? wrestler.rivals.join(", ") : "None"}</span></div>
        </div>

        <div className="flex items-center gap-2 bg-[#131117] rounded-lg p-3 mb-3">
          <Award size={16} className="text-[#8B6BC0]" />
          <span className="text-xs">
            <span className="font-bold">{wrestler.titleReigns}</span>{" "}
            <span className="text-[#8B8593]">title reign{wrestler.titleReigns === 1 ? "" : "s"}</span>
            {combinedWeeks > 0 && (
              <>
                <span className="text-[#8B8593]"> &middot; </span>
                <span className="font-bold">{combinedWeeks}</span>{" "}
                <span className="text-[#8B8593]">week{combinedWeeks === 1 ? "" : "s"} combined</span>
              </>
            )}
          </span>
        </div>

        <div className="pt-3 border-t border-[#2B2733] flex justify-between text-[11px] text-[#8B8593]">
          <span>Weekly wage <span className="font-bold booked-mono" style={{ color: "var(--gold)" }}>£{weeklyWage(wrestler).toLocaleString()}</span></span>
          <span>Freelance fee <span className="font-bold booked-mono" style={{ color: "var(--gold)" }}>£{(wrestler.perUseFee ?? baseFreelanceFee(wrestler)).toLocaleString()}</span></span>
        </div>
      </div>
    </div>
  );
}

function PopularityModal({ open, cityPopularity, cityVisits, popularity, onClose }) {
  if (!open) return null;
  const ranked = [...CITIES].sort((a, b) => cityPopularity[b] - cityPopularity[a]);
  const visitedCount = CITIES.filter((c) => cityVisits[c] > 0).length;
  const cap = Math.min(100, 15 + (visitedCount - 1) * 14);
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={onClose}>
      <div className="booked-modal-card border rounded-lg p-5 sm:p-6 max-w-sm w-full overflow-y-auto" style={{ backgroundColor: "#17151C", color: "#F2ECDD", maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-lg font-black" style={{ fontFamily: "Anton, sans-serif" }}>POPULARITY BY CITY</div>
            <div className="text-[10px] text-[#8B8593]">Better-rated shows grow that city's fanbase</div>
          </div>
          <button onClick={onClose} className="text-[#8B8593] hover:text-[#F2ECDD]"><X size={18} /></button>
        </div>
        {visitedCount > 0 && visitedCount < 7 && (
          <div className="bg-[#131117] rounded-lg p-3 mb-4 text-[10px] text-[#8B8593]">
            Touring {visitedCount} cit{visitedCount === 1 ? "y" : "ies"} caps your overall score at <span className="text-[#F2ECDD] font-bold">{cap}</span> (currently {popularity}). Play more cities to raise the ceiling — 7+ removes the cap entirely.
          </div>
        )}
        <div className="space-y-2.5">
          {ranked.map((c) => {
            const p = Math.round(cityPopularity[c]);
            return (
              <div key={c}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-semibold">{c}{FOREIGN_CITY_COUNTRY[c] ? <span className="text-[#8B8593] font-normal"> ({FOREIGN_CITY_COUNTRY[c]})</span> : ""}</span>
                  <span className="text-[#8B8593]">{p}</span>
                </div>
                <div className="h-1.5 bg-[#232029] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#5B3B8C] to-[#8B6BC0]" style={{ width: `${p}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const GUIDE_SECTIONS = [
  {
    key: "gettingstarted", title: "Getting Started", icon: Ticket,
    body: [
      "The basic loop: sign or shortlist wrestlers, book a show, run it, repeat. Every show advances one week.",
      "You start small — an Unknown-tier promotion with £20,000 and no reputation, based in one city you choose yourself. Venues, loans, and everything else scale up as your company grows through Local, Regional, National, and finally Global.",
      "There's no single win condition — this is a long-term management sim. The closest thing to a fail state is going bankrupt for 4 weeks straight, which gets you fired and ends that playthrough (it's archived under Menu > Saves > Previous Games, alongside any promotion you retire on your own terms).",
    ],
  },
  {
    key: "company", title: "Company Tab", icon: Landmark,
    body: [
      "Overview: your company name and booker name (read-only here — edit both under Menu > Back Office), plus key totals — funds, roster size, average roster ability, shows run, titles owned.",
      "Finance: a graph of your bank balance across the current in-game year, with a year selector once you've played long enough to have more than one, and your loan status right underneath it.",
      "Company Level (shown top-right, tap it for a city breakdown) is your overall reputation — Unknown, Local, Regional, National, Global. It's driven by how well your shows go in each city you actually tour, and it gets harder to keep climbing the higher it gets.",
    ],
  },
  {
    key: "roster", title: "Roster, Wrestlers & Contracts", icon: Users,
    body: [
      "There are two ways to use a wrestler: sign them Exclusive (a standing weekly wage, guaranteed available, no per-appearance fee) or add them to your Per-Use list (free to add, but you negotiate a fee — Low/Medium/High offer, cheaper offers are more likely refused, and a refusal sometimes comes back as a counteroffer to accept or walk away from — then pay it each time you actually book them). Per-use settles on the spot. An Exclusive offer doesn't — it posts to the News and opens a bidding war that settles in a few weeks, giving a rival time to notice and counter-bid with their own money, length, and reputation. The wrestler weighs every offer on the table themselves: money, how much room there is to actually grow at that company, its popularity, and whether the length fits their career stage — a young up-and-comer is wary of a long exclusive deal with a small promotion, a veteran doesn't mind the security.",
      "A contract within its last few weeks is poachable the same way — if you don't extend it, a rival might already be circling, and whoever makes the better overall case wins them when it actually lapses. Extend early from the Roster tab to settle it outright and shut any brewing interest down.",
      "Star a wrestler from the Wrestlers list to add them to your Shortlist (filter for \"Shortlisted only\" to see just them, whoever they're signed to right now) — a running watchlist for names you're building toward, not just who's available this week. The Wrestlers tab also surfaces a \"Who To Chase Next\" panel of the best free agents currently within your reach.",
      "A wrestler's Overall stat is fixed ability — it never changes from booking decisions. Push (their card status, from Jobber up to Main Event) is separate and yours to set for anyone signed to you, exclusive or per-use — a skilled worker can be booked as a jobber, and nobody becomes a Main Eventer just from good stats alone. You can set their starting Push right in the SIGN offer too, not just afterward. Either way, a real promotion or demotion is a genuine happiness swing, up or down, scaled to how many rungs it actually was. Legend status sits above all of that and isn't something you assign — it's a Trait a career earns (real ability, multiple title reigns, real ring time), the same way Fan Favorite or Clutch Performer are. Same goes for Alignment and renaming: editable for your own people, read-only for anyone signed elsewhere.",
      "Wrestlers age in real time — every 52 weeks, everyone gets a year older. Past 35 there's a real chance of small permanent dips to their physical stats; past 30, experience can show up as a charisma or mic-skill bump instead. A win also has a small chance of a tiny permanent boost tied to how it was won.",
      "Every wrestler also has Draw Power — how much they actually pull a crowd, separate from in-ring ability. It grows from winning, good matches, and title moments, and fades slowly if they're never booked anywhere. Who you put in the Main Event can swing a show's attendance up to ±25%.",
      "A Per-Use offer might get turned down — if refused outright, they're off-limits to you for 1-3 weeks before you can try again. Releasing an Exclusive wrestler mid-contract also costs a buyout, 50% of their remaining contract wage, shown before you confirm.",
      "Wrestlers have Energy (drains with use, recovers when rested — low energy hurts both their win chance and the match rating, but never permanently affects their Overall) and Happiness (affected by requests you promise and then fulfil, break, or decline, plus wins, losses, injuries, and title changes). Watch the Requests tab under Roster for what your talent is asking for. A wrestler 33 or older occasionally asks for a Role Change instead — granting it retires them from in-ring competition straight into your Staff candidate pool as an Agent, Assistant Booker, or Trainer, the same destination some retirees land in on their own.",
      "Injuries can happen after a draining match, sidelining someone 3-52 weeks with a specific injury type (knee, back, concussion, and others) — including champions, who are forced to vacate their title if it happens to them.",
      "Some retirees leave a legacy — a kid who grows up around the business and debuts as a free agent 15-20 years later, carrying the family name. You won't see it happen when it's rolled, only when the kid actually shows up in the News — their Potential is pulled toward how good the parent really was at their peak, not whatever they'd declined to by retirement, so a legendary career can genuinely pay off a generation later.",
      "A wrestler's detail screen can show Traits — tags earned from who they've actually become over their career, not rolled at creation: Fan Favorite (high draw power, and it keeps snowballing), Workhorse (serious ring-time logged), Flight Risk (unhappy right now), Locker Room Leader (happy and experienced), Clutch Performer (a strong win rate plus a title reign — gets a small rating bump specifically in title matches and the Main Event), Rising Star (young with real room left against their Potential), Second Generation (a legacy debut), and Legend (real sustained ability, multiple title reigns, and real ring time — the one status that's genuinely earned rather than pushed). Nothing to manage here — they just read as a snapshot of the career so far.",
      "Roster cards (Roster, Per-Use, and the world Wrestlers browser) carry a colored left edge at a glance: red for a fresh injury, orange once they're down to their last couple weeks out (nearly recovered), gold for a reigning champion.",
    ],
  },
  {
    key: "staff", title: "Staff", icon: HardHat,
    body: [
      "Staff (Menu) covers seven behind-the-scenes roles, each hired straight from a standing candidate pool — no bidding against yourself, just pick a candidate and offer a contract. Agent, Referee, and Assistant Booker all raise the ceiling your matches can realistically hit; Medical Staff cuts injury odds and shortens recovery; Ring Crew reduces the odds of a general company catastrophe (lawsuits, tax audits, scandals); Security does the same for crowd and venue incidents specifically (fights, barrier jumps, backstage breaches); Trainer speeds up how fast Developmental prospects close the gap to their potential. Only your single best hire per role counts — a second Agent doesn't stack with the first.",
      "Rivals aren't just sitting there — every non-acquired rival company competes for the exact same candidate pool, hiring and occasionally losing staff of their own over time. Anyone a rival's already snapped up shows up greyed out in your Candidates list rather than just vanishing, so you can see the competition for talent happening.",
      "Once you've founded a Developmental feeder promotion (Back Office), its Promotions screen entry becomes a full Training Facility profile: your hired Trainer(s) by name, every current trainee's progress bar toward their potential, and an Alumni list of everyone who's actually graduated to your main roster.",
    ],
  },
  {
    key: "booking", title: "Booking a Show", icon: Building2,
    body: [
      "Level, venue, city, length, and cadence are all set up once on Calendar · Show Events — Book just shows what's due and lets you set the ticket price, build the card, and run it. Higher prices mean fewer fans, and your reputation in that specific city sets the ceiling.",
      "More than one show can be due the same week — a weekly Raw and SmackDown on different days, plus a monthly or quarterly PPV-style show on top. They're worked through one at a time, in day-of-week order; after running one, Book moves straight on to whichever's next, and the calendar week itself only turns over once nothing else is left due. Weekly-recurring costs (roster/staff payroll, production upkeep, loan payment) are only billed once that week, on the last show, not once per show — the Show Costs panel tells you when that's not this one.",
      "You start in one city of your choosing and nowhere else. Get any city you can already book to 70% local popularity and the next roughly-nearby group of cities unlocks. Touring abroad (New York, Mexico City, Tokyo) is gated separately, behind reaching National company tier — a venue is also locked by company tier on top of that (Backyard is always open, Major Arena needs Global).",
      "Build your card as a running order of matches and segments against a time budget set by your venue (Backyard gives you 30 minutes, Major Arena 90). Position matters more than anything else — later on the card means a higher rating ceiling, so a top star wasted in an early segment still can't out-rate your Main Event — and minutes allocated matter too, within that ceiling. Each segment resolves the moment it's fully booked, so you'll see the result right away rather than waiting for the whole show. Once you're National tier or above, leaving a big chunk of your time budget unused costs you real rating and money — fans at that level expect a full card.",
      "Match types: 1v1, 2v2 tag (tag teams from a stable get their opponent list filtered to stablemates automatically), Triple Threat, or Fatal 4-Way — plus three kinds of Angle, none of which have a winner/loser or cost energy: a Promo (solo mic work, rated on charisma, aim it at someone to nudge or spark a rivalry), a Confrontation (two people face to face, rated on both their charisma, with a real chance of boiling over into a physical swerve — a much bigger rivalry swing than a plain promo), or a Vignette (solo atmosphere-building rated on entertainment instead of charisma, no subject).",
      "A Vignette can be pointed at something real — a signee who hasn't debuted yet, a wrestler due back from injury within a few weeks, or the upcoming show — for a flat rating bonus. It's a genuine hype package, not just atmosphere, so it reads as real news rather than filler.",
      "Every match resolves with a method — Pinfall, Submission, Disqualification, or Countout — weighted by the winning side's stats. Both the winner and the method default to Auto but can be set by hand once the match is fully booked.",
      "Every match also has a Purpose and a Match Story — two separate dials. Purpose is why it's happening: Competitive is a straight fair fight, Steal the Show chases the best possible rating at the cost of more energy for both sides, Put Over books the winner to look like a star at the loser's expense (a real draw power bump for the winner, scaled to who they just beat, and a small happiness hit for the one taking the loss), and Squash is a fast, one-sided win purely to get someone over — never a great match, but a bigger credibility injection than Put Over if the loser is any kind of name. Match Story is what kind of match it reads as: Comedy Match trades ceiling for consistency, Back-and-Forth Classic only pays off when the two sides are genuinely close on paper (and falls flat if they're not), and Underdog Story only pays off — in both rating and the winner's draw power — if the lower-rated side actually pulls off the upset.",
      "Booking the exact same matchup over and over gets a real, escalating rating penalty as fans get tired of seeing it — shown as a warning before you run the show. An active rivalry gets that penalty halved, since building toward a blowoff is a real reason to run it back.",
      "Speciality Matches (No DQ, Cage, Ladder, and more) are gated by your company level and cost extra, but boost the rating ceiling and let a wrestler's Specialty-type stat swing the outcome, not just their overall rating.",
      "A Face vs Heel matchup gets a small rating bump for the contrast — booking two of the same alignment against each other is a flatter match.",
      "Pre-show and post-show dark matches (up to 3 each, also on the Book page) sit entirely outside the card — no time budget, no effect on the show rating, no wins/losses on anyone's record. They're just reps: a small chance of a permanent stat bump, and ring time that counts toward Developmental training for anyone not otherwise on the card.",
      "Advertising (Book page, picked fresh for each scheduled show) spends money up front for a real boost to that show's attendance and how much it grows the city's popularity — Posters & Flyers, a TV Spot, or a Social Media Blitz, each pricier and stronger than the last.",
      "What the wrestling world wants shifts every few months — shown on the Book page and your Company tab. Anything that actually fits the current trend (a Speciality Match during a Hardcore phase, an all-Cruiserweight match during High-Flying, an Angle during Sports Entertainment, and so on) gets a flat rating bonus, so the same card shape isn't always the optimal one to book.",
    ],
  },
  {
    key: "titles", title: "Titles & Rankings", icon: Award,
    body: [
      "You start with one title and can buy up to 5 more (£25,000 each) as Singles or Tag Team, optionally locked to a weight class or gender.",
      "Once a title has a champion, only a top-3 ranked contender (from your own roster, exclusive or per-use) can challenge for it — vacant titles are open to anyone. Multi-man matches are exempt from the contender rule, since a scramble is a scramble.",
      "A #1 Contender Match (set on any non-title match in the card builder, singles or multi-man) skips the ranked queue entirely — its winner is guaranteed a title shot regardless of where they'd otherwise rank, shown as (earned) on the Titles tab, until they actually get (and cash in) a real match for that title.",
      "Loser Leaves — a toggle on any match in the card builder — releases the losing side from your roster outright the moment the show runs. No buyout, no negotiation: it's a storyline write-off, so think it through before booking it on anyone you don't actually want gone.",
      "A champion who goes 8 shows without defending gets automatically vacated, with a small prestige hit — the Titles tab warns you once you're within 3 weeks of that happening.",
      "Prestige builds from defenses and match quality, but a reign that ends with zero defenses takes a real hit — win it and immediately drop it, and it counts as a fluke, not a real reign.",
      "Rankings (its own tab) shows the top 10 by ranking points, singles or tag, filterable by promotion. Ranking points decay slowly if a wrestler sits out or is injured, and are capped so a long unbeaten streak can't snowball forever.",
    ],
  },
  {
    key: "tagteams", title: "Tag Teams & Rivalries", icon: Users2,
    body: [
      "Build a stable of up to 5 wrestlers under Roster — the first two you add become the core tag team, tracking their own win-loss record and eligible for tag titles. The same page under Menu > Wrestlers shows every stable in the game, not just yours.",
      "Rivalries form naturally from locker-room news, or you can create one manually (singles or tag), or spark one with a promo aimed at someone. Every rivalry has a visible stage — Just Introduced, Escalating, or Ready to Blow Off — with a hint on what to book next. Booking two rivals against each other boosts the match rating, and a long enough feud can blow off into a bigger payoff.",
    ],
  },
  {
    key: "promotions", title: "Promotions (Rivals)", icon: Globe2,
    body: [
      "Eight fictional rival companies compete alongside you — they hire, fire, crown champions, run their own simulated shows with the same ability-driven match ratings you get, and their popularity rises and falls independently. Each one runs its own named recurring shows, same idea as your Calendar event templates, scaled to their current tier: a brand new (Unknown) company doesn't run weekly at all yet, just one small show roughly once a month; Local runs one weekly show; Regional runs two; National and Global run two or three weekly shows plus a separately-branded monthly special, a bigger, guaranteed show on the same cadence as the shared PPV week. Growing (or shrinking) a tier genuinely changes their lineup, live. Tap any of them for a closer look at their roster (broken down by card position), champion, tag teams, a popularity-by-region breakdown (worked out from their one overall popularity number and a fixed home region, not separately simulated), a funds/popularity trend chart once a few weeks of data exist, and their own Training Facility — every rival occasionally brings in a prospect of their own and, if they've hired a Trainer, trains them up the same way your Developmental system works. No manual promote step for them, though — a graduate moves to their main roster automatically.",
      "Freelancers aren't exclusive to anyone — the same wrestler could realistically get booked by a rival the same week you're eyeing them, so they're not always guaranteed available.",
      "A Working Agreement (available once a rival's within one tier of you) opens up their signed roster as guest talent on your own shows — not free, but a discounted loan fee well below a normal per-use rate. Either side can end it at any time.",
      "Ratings (Menu > Ratings) ranks every show still on file — yours and every rival's — by estimated TV/PPV viewers. Nobody (rival or you, without a network deal) tracks real individual viewer counts, so it's worked out fresh from each company's popularity at the time and whichever network tier that would have actually qualified for.",
    ],
  },
  {
    key: "merch", title: "Merchandise", icon: Ticket,
    body: [
      "Unlocks once your company score hits 15 — its own page under Menu. Buy stock in bulk upfront; it persists between shows and sells down over time rather than being a fresh spend every week.",
      "How much sells at any given show depends on attendance, how established you are in that city, and how good the show is. Run out of stock and you'll miss sales — check back and restock rather than treating it as fire-and-forget. There's also a small chance of theft eating into whatever's left unsold overnight.",
      "A one-time, permanent quality upgrade (Premium, then Deluxe) raises both the cost and the sale price per unit — a genuine milestone purchase, not a small tweak.",
      "Revenue gets attributed to the wrestlers who were actually on the card, weighted by their Draw Power, so you can see who's actually moving merchandise on the Merchandise page itself.",
    ],
  },
  {
    key: "deals", title: "TV Networks & Sponsors", icon: Tv,
    body: [
      "Once you're reputable enough (nothing is available at Unknown), networks and sponsors will start making offers. A network deal pays per estimated viewer and also gives a small ongoing popularity boost; a sponsor is money only.",
      "A bigger Production tier (Back Office) makes your broadcast itself worth more — it multiplies what a network actually pays per viewer, on top of whatever the raw viewer count already is.",
      "Offers refresh periodically when you don't have an active deal — check the Deals tab regularly.",
    ],
  },
  {
    key: "finance", title: "Finance & Loans", icon: LineChartIcon,
    body: [
      "A loan is flat 20% interest, repaid automatically out of profit every week for the term you choose. Bigger loans need more reputation to qualify for, same as venues. Found under Company > Finance, right below your bank balance chart.",
      "Rarely, a random financial disaster can hit — 20-60% of your funds gone in one week. It's uncommon by design, but it's there, and it gets more likely to matter the more you've built up.",
      "Having no exclusive roster at all is its own quiet penalty once you're past Unknown tier — growth slows until you sign someone. Once you've got 5+ exclusive signings, their average ability relative to what's expected at your company level speeds up or slows down growth from there.",
    ],
  },
  {
    key: "news", title: "News", icon: Newspaper,
    body: [
      "Everything happening across the wrestling world — your title changes, rival hires and crownings, injuries, and locker-room rumours (friendships, rivalries, relationships) — lands here. The most recent item also shows as a small icon in the header with a red dot, so you don't have to go looking for it. Every item also gets a line of color commentary tacked on — flavor only, picked from a small pool per story type, not a separate fact.",
      "Filter by promotion, year, or week to cut through the noise once you've been playing a while.",
    ],
  },
  {
    key: "achievements", title: "Achievements & Hall of Fame", icon: Trophy,
    body: [
      "Achievements (Menu > Achievements) are lifetime — 37 of them, covering company growth, roster building, finance, titles, merchandise, and more. They persist even if you retire and start a fresh promotion; only a full progress wipe clears them.",
      "Hall of Fame (Menu > Hall of Fame) tracks your best-ever match, biggest-ever show, and longest-ever title reign — and shows the best any rival has ever managed in each, side by side, so you can see if anyone's actually beaten you.",
      "Awards (Menu > Awards) hands out seven categories for whichever year you pick — Match, Angle, Wrestler, Men's Wrestler, Women's Wrestler, Promotion, and Show of the Year — worked out fresh from your Results history, rival show activity, and weekly popularity snapshots rather than tracked as a running record, so it only covers shows and weeks still on file. Every category spans the whole wrestling world, you and every rival alike, except Angle of the Year — only your own promotion ever runs angles, so that one stays yours alone.",
    ],
  },
  {
    key: "backoffice", title: "Back Office & Saving", icon: NotebookPen,
    body: [
      "Back Office (Menu) is where your company name and your own promoter name, age, and sex are edited — kept separate from the day-to-day screens since they're not something you're changing often. It's also where you found a Developmental feeder promotion and upgrade Production (pyro, titantron, lighting, cameras) — both one-time capital investments.",
      "Saves (Menu) has one manual save button plus an automatic save that updates after every show as a safety net — no more juggling numbered slots.",
      "Retire (under Saves) ends your current run on your own terms, files it under Previous Games same as getting fired, and starts you fresh with a new home city to choose. Reset Full Progress, in the same place, wipes everything — including lifetime Achievements and Hall of Fame — and can't be undone.",
    ],
  },
];

// Desktop sidebar nav (>=900px, see tailwind's "dt" breakpoint). Same 15
// destinations as the mobile bottom-tab bar + its Menu screen, just grouped
// for a wider layout — no new screens, no tab key not already reachable.
const SIDEBAR_SECTIONS = [
  {
    title: "Your Promotion",
    items: [
      { key: "roster", label: "Roster", icon: Users },
      { key: "staff", label: "Staff", icon: HardHat },
      { key: "storylines", label: "Storylines", icon: Flame },
      { key: "book", label: "Book", icon: Ticket },
      { key: "calendar", label: "Calendar", icon: Calendar },
      { key: "titles", label: "Titles", icon: Award },
      { key: "deals", label: "Deals", icon: Tv },
      { key: "merch", label: "Merchandise", icon: Ticket },
      { key: "achievements", label: "Achievements", icon: Trophy },
      { key: "halloffame", label: "Hall of Fame", icon: Star },
      { key: "awards", label: "Awards", icon: Medal },
      { key: "backoffice", label: "Back Office", icon: Landmark },
      { key: "saves", label: "Saves", icon: NotebookPen },
    ],
  },
  {
    title: "World",
    items: [
      { key: "promotions", label: "Promotions", icon: Globe2 },
      { key: "rankings", label: "Rankings", icon: TrendingUp },
      { key: "wrestlers", label: "Wrestlers", icon: UserPlus },
      { key: "ratings", label: "Ratings", icon: BarChart3 },
    ],
  },
  {
    title: "General",
    items: [
      { key: "company", label: "Office", icon: Landmark },
      { key: "news", label: "News", icon: Newspaper },
      { key: "guide", label: "Guide", icon: BookOpen },
    ],
  },
];

export default function BookedRingsideEmpire() {
  const [bank, setBank] = useState(20000);
  const [networkDeal, setNetworkDeal] = useState(null);
  const [networkOffers, setNetworkOffers] = useState([]);
  const [sponsorDeal, setSponsorDeal] = useState(null);
  const [sponsorOffers, setSponsorOffers] = useState([]);
  const [bankruptWeeks, setBankruptWeeks] = useState(0);
  const [loan, setLoan] = useState(null); // { principal, weeklyPayment, weeksRemaining, totalOwed }
  const [requests, setRequests] = useState([]); // { id, wrestlerName, type, text, weekMade, deadlineWeek, status }
  const [saveInfo, setSaveInfo] = useState(undefined);
  const [autoSaveInfo, setAutoSaveInfo] = useState(undefined);
  const [retiring, setRetiring] = useState(false);
  // Landing screen shown before any save is actually loaded into live state —
  // "menu" so Continue/Load/New Game/World Editor/Settings all start from the
  // same blank slate rather than racing an auto-resume on every page load.
  const [view, setView] = useState("menu");
  const [menuLoadOpen, setMenuLoadOpen] = useState(false);
  const [menuSettingsOpen, setMenuSettingsOpen] = useState(false);
  const [menuNewGameOpen, setMenuNewGameOpen] = useState(false);
  // Achievement tracking — lifetime flags for events that don't leave a lasting
  // trace in ongoing state (a loan gets repaid, a catastrophe happens once, etc).
  const [unlockedAchievements, setUnlockedAchievements] = useState([]); // [{id, unlockedAtWeek}]
  const [hallOfFame, setHallOfFame] = useState({ bestMatch: null, biggestShow: null, longestReign: null, bestMatchRival: null, biggestShowRival: null, longestReignRival: null });
  const [wrestlerReignCounts, setWrestlerReignCounts] = useState({}); // {name: count}, lifetime
  const [hasEverTakenLoan, setHasEverTakenLoan] = useState(false);
  const [hasEverRepaidLoanFully, setHasEverRepaidLoanFully] = useState(false);
  const [hasSurvivedCatastrophe, setHasSurvivedCatastrophe] = useState(false);
  const [hasBeenFired, setHasBeenFired] = useState(false);
  const [hasRetiredOnce, setHasRetiredOnce] = useState(false);
  const [hasCreatedStableManually, setHasCreatedStableManually] = useState(false);
  const [hasCreatedRivalryManually, setHasCreatedRivalryManually] = useState(false);
  const [hasRenamedWrestler, setHasRenamedWrestler] = useState(false);
  const [bookedFatal4Ever, setBookedFatal4Ever] = useState(false);
  const [bookedCageEver, setBookedCageEver] = useState(false);
  const [maxAttendanceEver, setMaxAttendanceEver] = useState(0);
  const [hasSoldOutEver, setHasSoldOutEver] = useState(false);
  const [maxShowRatingEver, setMaxShowRatingEver] = useState(0);
  const [confirmingRetire, setConfirmingRetire] = useState(false);
  const [confirmingWipe, setConfirmingWipe] = useState(false);
  const [previousGames, setPreviousGames] = useState(undefined);
  const [saveActionMsg, setSaveActionMsg] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [peakPopularity, setPeakPopularity] = useState(0);
  const FIRED_THRESHOLD = 4;
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [companyName, setCompanyName] = useState("Ringside Empire Wrestling");
  const [playerName, setPlayerName] = useState("");
  const [playerAge, setPlayerAge] = useState("");
  const [playerSex, setPlayerSex] = useState("");

  const [cityPopularity, setCityPopularity] = useState(() => Object.fromEntries(CITIES.map((c) => [c, 0])));
  const [showPopularityModal, setShowPopularityModal] = useState(false);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [viewingTitleHistory, setViewingTitleHistory] = useState(null);

  const [pool, setPool] = useState(buildInitialPool);
  const [rivalCompanies, setRivalCompanies] = useState(() => RIVAL_COMPANIES.map((c, i) => ({ ...c, funds: RIVAL_STARTING_FUNDS[i] ?? 25000, showsRun: 0, lastTier: popularityTier(c.popularity) })));
  // Inter-promotion M&A — working agreements (ids of rivals you've struck a deal
  // with; their signed talent becomes bookable alongside your own, at a
  // discounted loan fee rather than free — see agreementTalentFee) and
  // outright acquisitions (co.acquired: true — AI simulation stops for them,
  // their roster frees up, and they're shown as owned rather than active).
  const [workingAgreements, setWorkingAgreements] = useState([]); // rival company ids
  const [feederCompany, setFeederCompany] = useState(null); // { name, foundedWeek }
  const [developmentalAlumni, setDevelopmentalAlumni] = useState([]); // [{name, overall, tier, graduatedWeek, year, weekOfYear}] — graduates of the Training School
  const [newFeederName, setNewFeederName] = useState("");
  const [productionTier, setProductionTier] = useState(0); // index into PRODUCTION_TIERS
  const [staffPool, setStaffPool] = useState(() => buildStaffPool());
  const [staffSubTab, setStaffSubTab] = useState("agent");
  const [hiringStaffTarget, setHiringStaffTarget] = useState(null);
  const [staffHireWeeks, setStaffHireWeeks] = useState(26);
  const [playerLastTier, setPlayerLastTier] = useState("Unknown");
  const [rivalTitles, setRivalTitles] = useState(() => RIVAL_COMPANIES.map((c) => ({ id: `${c.id}-title`, name: c.titleName, companyId: c.id, holder: _initialChampions[c.id] || null, reignStartWeek: _initialChampions[c.id] ? 1 : null })));
  const [nextReserveIndex, setNextReserveIndex] = useState(BULK_DEBUT_COUNT);
  const [nextStaggeredDebutIndex, setNextStaggeredDebutIndex] = useState(0);
  const [fanTrendKey, setFanTrendKey] = useState(() => FAN_TRENDS[rand(0, FAN_TRENDS.length - 1)].key);
  const fanTrend = FAN_TRENDS.find((t) => t.key === fanTrendKey) || FAN_TRENDS[0];
  const [pendingLegacies, setPendingLegacies] = useState([]);
  const [hasSeenLegacyDebut, setHasSeenLegacyDebut] = useState(false);

  const [tab, setTab] = useState("guide");
  const [companySubTab, setCompanySubTab] = useState("overview");
  const [guideOpenSections, setGuideOpenSections] = useState(() => new Set(["gettingstarted"]));
  const [rosterSubTab, setRosterSubTab] = useState("roster");
  const [wrestlersSubTab, setWrestlersSubTab] = useState("list");

  // World Editor — direct editing of wrestlers/companies, plus CSV bulk import.
  const [worldEditorSubTab, setWorldEditorSubTab] = useState("wrestlers");
  const [backOfficeSubTab, setBackOfficeSubTab] = useState("general");
  const [editorWrestlerSearch, setEditorWrestlerSearch] = useState("");
  const [editingWrestlerDraft, setEditingWrestlerDraft] = useState(null); // a full editable copy of a pool wrestler, or a fresh blank one
  const [editingCompanyDraft, setEditingCompanyDraft] = useState(null); // same idea for a rivalCompanies entry
  const [wrestlerImportSummary, setWrestlerImportSummary] = useState(null); // { added, skipped: [{row, reason}] }
  const [companyImportSummary, setCompanyImportSummary] = useState(null);
  const [bookSubTab, setBookSubTab] = useState("book");
  const [resultsYearFilter, setResultsYearFilter] = useState("all");
  const [awardsYear, setAwardsYear] = useState(null);
  const [awardsCategory, setAwardsCategory] = useState("match");
  const [resultsCompanyFilter, setResultsCompanyFilter] = useState("player");
  const [detailWrestler, setDetailWrestler] = useState(null);
  const [expandedResults, setExpandedResults] = useState(() => new Set());
  const [hiringTarget, setHiringTarget] = useState(null);
  const [hireWeeks, setHireWeeks] = useState(26);
  const [hireLevel, setHireLevel] = useState("main");
  const [hireWageKey, setHireWageKey] = useState("standard");
  const [hirePushLevel, setHirePushLevel] = useState(null);
  const [scoutingTarget, setScoutingTarget] = useState(null);
  const [scoutResult, setScoutResult] = useState(null);
  const [extendingTarget, setExtendingTarget] = useState(null);
  const [firingTarget, setFiringTarget] = useState(null);
  const [acquiringTarget, setAcquiringTarget] = useState(null);
  const [extendWeeks, setExtendWeeks] = useState(26);
  const [extendResult, setExtendResult] = useState(null);
  const [financeYear, setFinanceYear] = useState(1);
  const [perUseRoster, setPerUseRoster] = useState([]);
  const [shortlist, setShortlist] = useState([]);
  // Open exclusive-contract bidding wars: { id, wrestlerName, resolveWeek,
  // offers: [{ companyId, wageMult, contractWeeks, level? }] }. See
  // NEGOTIATION_WEEKS/RENEWAL_WINDOW_WEEKS and offerAppeal above.
  const [pendingOffers, setPendingOffers] = useState([]);
  const [sortField, setSortField] = useState("overall");
  const [rankingsFilter, setRankingsFilter] = useState("all");
  const [rankingsMode, setRankingsMode] = useState("singles");
  const [newsFilter, setNewsFilter] = useState("all");
  const [dismissedNewsId, setDismissedNewsId] = useState(null);
  const [newsYearFilter, setNewsYearFilter] = useState("all");
  const [newsWeekFilter, setNewsWeekFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [wrestlerSearch, setWrestlerSearch] = useState("");
  const DEFAULT_FILTERS = {
    gender: "all", weightClass: "all",
    minOverall: 0, maxOverall: 100, minRanking: -100, maxRanking: 200,
    stats: Object.fromEntries(STAT_KEYS.map((k) => [k, 0])),
    statsMax: Object.fromEntries(STAT_KEYS.map((k) => [k, 100])),
    availableOnly: false, promotion: "all", shortlistOnly: false,
  };
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const resetFilters = () => setFilters(DEFAULT_FILTERS);
  const filtersActive = filters.gender !== "all" || filters.weightClass !== "all" || filters.minOverall > 0 || filters.maxOverall < 100 || filters.minRanking > -100 || filters.maxRanking < 200 || STAT_KEYS.some((k) => filters.stats[k] > 0 || filters.statsMax[k] < 100) || filters.availableOnly || filters.promotion !== "all" || filters.shortlistOnly;
  const passesFilters = (w) => {
    if (wrestlerSearch.trim() && !w.name.toLowerCase().includes(wrestlerSearch.trim().toLowerCase())) return false;
    if (filters.gender !== "all" && w.sex !== filters.gender) return false;
    if (filters.weightClass !== "all" && w.weightClass !== filters.weightClass) return false;
    const ovr = Math.round(attrOf(w));
    if (ovr < filters.minOverall || ovr > filters.maxOverall) return false;
    if (w.rankingPts < filters.minRanking || w.rankingPts > filters.maxRanking) return false;
    if (STAT_KEYS.some((k) => w[k] < filters.stats[k] || w[k] > filters.statsMax[k])) return false;
    if (filters.availableOnly) {
      const onCooldown = w.hireCooldownUntil && weekNumber < w.hireCooldownUntil;
      if (w.contractedTo !== null || onCooldown) return false;
    }
    if (filters.promotion !== "all") {
      if (filters.promotion === "freelance" && w.contractedTo !== null) return false;
      if (filters.promotion !== "freelance" && w.contractedTo !== filters.promotion) return false;
    }
    if (filters.shortlistOnly && !shortlist.includes(w.name)) return false;
    return true;
  };
  const toggleShortlist = (name) => setShortlist((sl) => (sl.includes(name) ? sl.filter((n) => n !== name) : [...sl, name]));
  const [negotiatingTarget, setNegotiatingTarget] = useState(null);
  const [negotiationOffers, setNegotiationOffers] = useState([]);
  const [negotiationResult, setNegotiationResult] = useState(null);
  const [negotiationCounter, setNegotiationCounter] = useState(null);

  const [arenaIdx, setArenaIdx] = useState(0);
  const arena = ARENAS[arenaIdx];
  const [ticketPrice, setTicketPrice] = useState(arena.ticketMin);
  const [adCampaign, setAdCampaign] = useState("none");
  const activeAdCampaign = AD_CAMPAIGNS.find((a) => a.key === adCampaign) || AD_CAMPAIGNS[0];
  // Show length defaults to the venue's typical runtime but is always the
  // player's call — a quick house show at a big arena, or a long flagship
  // card at a small one, are both legitimate choices. SHOW_MINUTES_MIN/MAX
  // bound the slider; venue choice just sets a sensible starting point.
  const [showMinutesTarget, setShowMinutesTarget] = useState(arena.showMinutes);
  // Show level — which half of a split roster this week's card can draw from.
  // A Developmental show is capped to the smaller venues regardless of company
  // tier, since it's a lower-profile card by design, not a full flagship show.
  const [showLevel, setShowLevel] = useState("main");
  const [merchStock, setMerchStock] = useState(0);
  const [merchQualityTier, setMerchQualityTier] = useState(0);
  const [merchBuyQty, setMerchBuyQty] = useState(100);
  const [recentMatchups, setRecentMatchups] = useState([]); // last ~30 matchup keys, most recent first
  const [wrestlerMerchSales, setWrestlerMerchSales] = useState({}); // {name: totalRevenue}, resets with a new promotion
  const [city, setCity] = useState(null);
  const [startingCity, setStartingCity] = useState(null);
  const [cityVisits, setCityVisits] = useState(() => Object.fromEntries(CITIES.map((c) => [c, 0])));
  const visitedCities = CITIES.filter((c) => cityVisits[c] > 0);
  // Touring reach: your overall score can't outgrow how many cities you've actually
  // built a following in. One city alone caps out mid-Local; reaching Global
  // needs genuine touring, not just repeatedly hammering one home town.
  const cityDiversityCap = Math.min(100, 15 + (visitedCities.length - 1) * 14);
  const rawPopularity = visitedCities.length > 0 ? visitedCities.reduce((s, c) => s + cityPopularity[c], 0) / visitedCities.length : 0;
  const popularity = visitedCities.length > 0 ? Math.round(Math.min(rawPopularity, cityDiversityCap)) : 0;
  const [segments, setSegments] = useState([]);
  const [darkMatches, setDarkMatches] = useState([]);

  const [titles, setTitles] = useState([
    { id: "world", name: "World Championship", type: "singles", weightClass: null, genderLock: null, holders: [], reignStartWeek: null, totalDefenses: 0, currentReignDefenses: 0, prestige: 0, history: [] },
  ]);
  const [purchasingTitle, setPurchasingTitle] = useState(false);
  const [newTitleName, setNewTitleName] = useState("");
  const [newTitleType, setNewTitleType] = useState("singles");
  const [newTitleWeightClass, setNewTitleWeightClass] = useState(null);
  const [newTitleGenderLock, setNewTitleGenderLock] = useState(null);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingTitleName, setEditingTitleName] = useState("");
  const TITLE_PURCHASE_COST = 25000;
  // Winners of a Number One Contender match get a guaranteed title shot —
  // this is what titleContenders() reads on top of the normal ranking.
  // Keyed by titleId so each title tracks at most one earned contender at a
  // time; cleared the moment that contender actually gets (and cashes in)
  // a real title match for it, win or lose.
  const [number1Contenders, setNumber1Contenders] = useState([]); // [{titleId, key, label, wonWeek}]

  const [showHistory, setShowHistory] = useState([]);
  const [rivalShowHistory, setRivalShowHistory] = useState([]);
  const [rivalFinanceHistory, setRivalFinanceHistory] = useState([]); // [{companyId, weekNumber, year, weekOfYear, funds, popularity}]
  // Calendar — player-scheduled reminders, fired by week number. One-off events
  // remove themselves once fired; recurring ones reschedule intervalWeeks ahead.
  const [scheduledEvents, setScheduledEvents] = useState([]); // { id, label, weekNumber, recurring, intervalWeeks }
  const [newEventLabel, setNewEventLabel] = useState("");
  const [newEventWeeksOut, setNewEventWeeksOut] = useState(4);
  const [newEventRecurring, setNewEventRecurring] = useState(false);
  // Event templates — recurring show slots (Weekly TV, Monthly Special, PPV...)
  // set up ahead of time from the Calendar. Each pre-sets the Book screen's
  // show level and venue the week it's due; a TV deal can optionally be
  // attached to exactly one template so it only pays out when that specific
  // show airs, instead of every main-roster show.
  const [eventTemplates, setEventTemplates] = useState([]); // { id, name, level, arenaIdx, intervalWeeks, nextWeekNumber, dayOfWeek, preferredCity }
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateLevel, setNewTemplateLevel] = useState("main");
  const [newTemplateArenaIdx, setNewTemplateArenaIdx] = useState(0);
  const [newTemplateIntervalWeeks, setNewTemplateIntervalWeeks] = useState(1);
  const [newTemplateDayOfWeek, setNewTemplateDayOfWeek] = useState("Monday");
  const [newTemplatePreferredCity, setNewTemplatePreferredCity] = useState("");
  const [newTemplateShowMinutes, setNewTemplateShowMinutes] = useState(ARENAS[0].showMinutes);
  const [financeHistory, setFinanceHistory] = useState([{ weekNumber: 0, year: 1, weekOfYear: 0, bank: 20000 }]);
  const [universeFeed, setUniverseFeed] = useState([]);
  const [storylines, setStorylines] = useState({}); // "nameA|nameB" (sorted) -> { intensity, matchesFought }
  const [stableStorylines, setStableStorylines] = useState({}); // "idA|idB" (sorted) -> { intensity, matchesFought }
  const [creatingRivalry, setCreatingRivalry] = useState(false);
  const [newRivalryType, setNewRivalryType] = useState("singles");
  const [newRivalryA, setNewRivalryA] = useState("");
  const [newRivalryB, setNewRivalryB] = useState("");
  const [stables, setStables] = useState(() => PRESET_STABLES.map((s, i) => ({ id: `preset-stable-${i}`, name: s.name, members: s.members, matches: 0, wins: 0, losses: 0, rivalStableIds: [] }))); // { id, name, members: [2-5 names], matches, wins, losses }
  const [creatingStable, setCreatingStable] = useState(false);
  const [newStableName, setNewStableName] = useState("");
  const [newStableMembers, setNewStableMembers] = useState([]);
  const [editingStableId, setEditingStableId] = useState(null);
  const [editingStableName, setEditingStableName] = useState("");
  const [showResult, setShowResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [runShowError, setRunShowError] = useState(null);
  const [weekCount, setWeekCount] = useState(1);
  // Event template ids whose show has already run THIS calendar week — reset
  // to [] once every due template for the week is accounted for and the week
  // actually advances. Lets several differently-scheduled shows (a weekly Raw
  // and SmackDown, a monthly PPV) all fall in the same calendar week without
  // the week ticking over after just the first one.
  const [showsDoneThisWeek, setShowsDoneThisWeek] = useState([]);
  const [totalShowsRun, setTotalShowsRun] = useState(0);
  const [totalMatchesRun, setTotalMatchesRun] = useState(0);

  const weekNumber = weekCount;
  const scheduledDate = addWeeks(START_DATE, weekCount - 1);
  const isPPVWeek = weekNumber % PPV_EVERY === 0;
  const currentYear = yearOf(weekNumber);

  const addScheduledEvent = () => {
    if (!newEventLabel.trim()) return;
    setScheduledEvents((ev) => [...ev, {
      id: `evt-${Date.now()}`, label: newEventLabel.trim(),
      weekNumber: weekNumber + Math.max(1, newEventWeeksOut),
      recurring: newEventRecurring, intervalWeeks: newEventRecurring ? Math.max(1, newEventWeeksOut) : null,
    }]);
    setNewEventLabel(""); setNewEventWeeksOut(4); setNewEventRecurring(false);
  };
  const removeScheduledEvent = (id) => setScheduledEvents((ev) => ev.filter((e) => e.id !== id));

  const addEventTemplate = () => {
    if (!newTemplateName.trim() || !newTemplatePreferredCity) return;
    setEventTemplates((ts) => [...ts, {
      id: `tmpl-${Date.now()}`, name: newTemplateName.trim(), level: newTemplateLevel,
      arenaIdx: newTemplateArenaIdx, intervalWeeks: Math.max(1, newTemplateIntervalWeeks),
      nextWeekNumber: weekNumber, dayOfWeek: newTemplateDayOfWeek, preferredCity: newTemplatePreferredCity,
      showMinutes: newTemplateShowMinutes,
    }]);
    // A brand-new template due immediately (this week) won't be picked up by
    // the week-change effect, since weekNumber itself hasn't changed — apply
    // its preset to the Book screen right away instead.
    setShowLevel(newTemplateLevel);
    setArenaIdx(newTemplateArenaIdx);
    setTicketPrice(ARENAS[newTemplateArenaIdx].ticketMin);
    setAdCampaign("none");
    setShowMinutesTarget(newTemplateShowMinutes);
    setCity(newTemplatePreferredCity);
    setNewTemplateName(""); setNewTemplateLevel("main"); setNewTemplateArenaIdx(0); setNewTemplateIntervalWeeks(1);
    setNewTemplateDayOfWeek("Monday"); setNewTemplatePreferredCity(""); setNewTemplateShowMinutes(ARENAS[0].showMinutes);
  };
  const removeEventTemplate = (id) => {
    setEventTemplates((ts) => ts.filter((t) => t.id !== id));
    setNetworkDeal((d) => (d && d.eventTemplateId === id ? { ...d, eventTemplateId: null } : d));
  };
  const setNetworkDealEvent = (eventTemplateId) => setNetworkDeal((d) => (d ? { ...d, eventTemplateId: eventTemplateId || null } : d));
  // The next template (if any) still due and not yet run THIS calendar week —
  // drives the Book screen's auto-preset and which TV deal (if attached to
  // one) pays out. Several shows can be due the same week (a weekly Raw and
  // SmackDown, a monthly PPV): they're worked through in day-of-week order,
  // one at a time, and the week itself only advances once none are left (see
  // showsDoneThisWeek and isLastShowOfWeek, used in runShow).
  // <= rather than === — a template that's fallen behind (the week moved
  // past it some other way) stays eligible instead of getting permanently
  // stuck comparing against a weekNumber it'll never match again.
  const activeEventTemplate = [...eventTemplates]
    .filter((t) => t.nextWeekNumber <= weekNumber && !showsDoneThisWeek.includes(t.id))
    .sort((a, b) => DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek) || a.nextWeekNumber - b.nextWeekNumber)[0] || null;
  // Anything ELSE also due this week, still unrun — if this is non-empty, the
  // show about to run isn't the last one of the week, so the weekly-cadence
  // costs/ticks (payroll, aging, the rival-world simulation, …) hold off
  // until whichever show actually is.
  const otherDueTemplatesThisWeek = activeEventTemplate
    ? eventTemplates.filter((t) => t.id !== activeEventTemplate.id && !showsDoneThisWeek.includes(t.id) && t.nextWeekNumber <= weekNumber)
    : [];

  const roster = pool.filter((w) => w.contractedTo === "player");
  const avgRosterOverall = roster.length > 0 ? Math.round(roster.reduce((s, w) => s + attrOf(w), 0) / roster.length) : 0;
  const rosterQualityMult =
    roster.length === 0
      ? (TIER_RANK[popularityTier(popularity)] > 0 ? 0.65 : 1) // fine while brand new, real penalty once established
      : roster.length < 5
      ? 1
      : clamp(0.7 + 0.3 * (avgRosterOverall / EXPECTED_ROSTER_OVERALL[popularityTier(popularity)]), 0.6, 1.15);
  const unlockedCities = computeUnlockedCities(cityPopularity, startingCity, popularityTier(popularity));
  const perUseWrestlers = pool.filter((w) => w.contractedTo === null && perUseRoster.includes(w.name));
  // Freelancers are open to either level — only the exclusive roster is split.
  const levelRoster = roster.filter((w) => (w.rosterLevel || "main") === showLevel);
  // A working agreement opens up a partner's signed roster as guest talent —
  // bookable alongside your own, no per-appearance fee (the benefit of the deal).
  const agreementRoster = pool.filter((w) => workingAgreements.includes(w.contractedTo));
  const bookable = [...levelRoster, ...perUseWrestlers, ...agreementRoster].filter((w) => !w.injuryWeeksRemaining);

  const renameWrestler = (oldName, newName) => {
    setPool((p) => p.map((w) => (w.name === oldName ? { ...w, name: newName } : w)));
    setDetailWrestler((d) => (d ? { ...d, name: newName } : d));
    setHasRenamedWrestler(true);
  };
  const setAlignment = (name, alignment) => {
    setPool((p) => p.map((w) => (w.name === name ? { ...w, alignment } : w)));
    setDetailWrestler((d) => (d ? { ...d, alignment } : d));
  };
  const setPush = (name, pushOverride) => {
    setPool((p) => p.map((w) => {
      if (w.name !== name) return w;
      // A real promotion or demotion on the card is a real moment for a
      // wrestler — happy to move up, stings to move down, scaled by how
      // many rungs it actually was rather than a flat amount either way.
      const oldIdx = TIER_ORDER.indexOf(effectiveTier(w));
      const newIdx = TIER_ORDER.indexOf(pushOverride || w.tier);
      const moraleDelta = (oldIdx >= 0 && newIdx >= 0) ? (newIdx - oldIdx) * 4 : 0;
      return { ...w, pushOverride, happiness: clamp(w.happiness + moraleDelta, 0, 100) };
    }));
    setDetailWrestler((d) => (d ? { ...d, pushOverride } : d));
  };

  const hireTierCap = HIRE_TIER_CAP[popularityTier(popularity)];
  const exceedsHireCap = (w) => hireTierCap != null && TIER_ORDER.indexOf(w.tier) > TIER_ORDER.indexOf(hireTierCap);
  const startHiring = (w) => { setHiringTarget(w); setHireWeeks(26); setHireLevel("main"); setHireWageKey("standard"); setHirePushLevel(null); };
  const happinessRefusalAdj = (w) => {
    if (w.happiness < 20) return 0.3;
    if (w.happiness < 40) return 0.15;
    if (w.happiness > 85) return -0.08;
    if (w.happiness > 70) return -0.03;
    return 0;
  };
  // Leverage: how big a stretch this name is for a promotion at your level.
  // Someone right at the top of what you're even allowed to approach is a
  // hard sell regardless of the offer; someone well within your reach is an
  // easy one — your own reputation (popularity tier), not just their mood.
  const reputationRefusalAdj = (w) => {
    const cap = HIRE_TIER_CAP[popularityTier(popularity)];
    const capIdx = cap ? TIER_ORDER.indexOf(cap) : TIER_ORDER.length - 1;
    const edge = capIdx - TIER_ORDER.indexOf(w.tier);
    return clamp(0.12 - edge * 0.04, -0.06, 0.12);
  };

  // An exclusive offer never resolves on the spot — it opens (or joins) a
  // bidding war that settles on its own in NEGOTIATION_WEEKS (see the weekly
  // tick in runShow), giving rivals time to notice and counter-bid, and the
  // wrestler themself a real choice between whatever's on the table when the
  // window closes (offerAppeal, above).
  const confirmHire = () => {
    if (!hiringTarget || exceedsHireCap(hiringTarget)) return;
    const offer = HIRE_WAGE_OFFERS.find((o) => o.key === hireWageKey);
    const signedLevel = hireLevel === "developmental" && feederCompany ? "developmental" : "main";
    const myOffer = { companyId: "player", wageMult: offer.mult, contractWeeks: hireWeeks, level: signedLevel, pushLevel: hirePushLevel };
    const isNewApproach = !pendingOffers.some((e) => e.wrestlerName === hiringTarget.name);
    setPendingOffers((po) => {
      const idx = po.findIndex((e) => e.wrestlerName === hiringTarget.name);
      if (idx === -1) {
        return [...po, { id: `po-${hiringTarget.name}-${weekNumber}-${Date.now()}`, wrestlerName: hiringTarget.name, resolveWeek: weekNumber + NEGOTIATION_WEEKS, offers: [myOffer] }];
      }
      const next = [...po];
      next[idx] = { ...next[idx], offers: [...next[idx].offers.filter((o) => o.companyId !== "player"), myOffer] };
      return next;
    });
    if (isNewApproach) {
      setUniverseFeed((feed) => [{ id: `appr-${weekNumber}-${Date.now()}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has made an approach to sign ${hiringTarget.name}.`, type: "rival", companyId: "player" }, ...feed].slice(0, 300));
    }
  };
  const buyoutCost = (w) => {
    const remainingWeeks = Math.max(0, (w.contractExpiresWeek || weekNumber) - weekNumber);
    return Math.round(weeklyWage(w) * 0.5 * remainingWeeks);
  };
  const release = (w) => {
    const cost = buyoutCost(w);
    setBank((b) => b - cost);
    if (cost > 0) setFinanceHistory((fh) => [...fh, { weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), bank: bank - cost }]);
    setPool((p) => p.map((x) => (x.name === w.name ? { ...x, contractedTo: null, contractExpiresWeek: null } : x)));
    setPendingOffers((po) => po.filter((e) => e.wrestlerName !== w.name));
  };

  // Scouting — poach a young or undersized prospect straight off a rival's
  // roster into your Developmental system. Smaller and riskier than buying
  // the whole company (acquireCompany): one wrestler, a real chance they
  // turn you down, and the buyout cost is only paid if they say yes.
  const isScoutProspect = (w) => w.age <= 24 || ["Jobber", "Lower Card"].includes(w.tier);
  const scoutCost = (w) => Math.round(buyoutCost(w) * 1.5) + 2000;
  const startScouting = (w) => { setScoutingTarget(w); setScoutResult(null); };
  const confirmScout = () => {
    if (!scoutingTarget || !feederCompany) return;
    const cost = scoutCost(scoutingTarget);
    if (bank < cost) return;
    let chance = SCOUT_BASE_REFUSAL;
    if (scoutingTarget.happiness < 40) chance -= 0.15; // unhappy where they are — easier sell
    else if (scoutingTarget.happiness > 70) chance += 0.1; // content there — harder sell
    chance = clamp(chance, 0.1, 0.85);
    const refused = Math.random() < chance;
    if (refused) {
      const cooldownWeeks = rand(2, 4);
      setPool((p) => p.map((w) => (w.name === scoutingTarget.name ? { ...w, hireCooldownUntil: weekNumber + cooldownWeeks } : w)));
      setScoutResult("refused");
      return;
    }
    const rivalName = RIVAL_COMPANIES.find((c) => c.id === scoutingTarget.contractedTo)?.name || "a rival promotion";
    setBank((b) => b - cost);
    setFinanceHistory((fh) => [...fh, { weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), bank: bank - cost }]);
    setPool((p) => p.map((w) => (w.name === scoutingTarget.name ? { ...w, contractedTo: "player", contractExpiresWeek: weekNumber + SCOUT_CONTRACT_WEEKS, rosterLevel: "developmental", hireCooldownUntil: null } : w)));
    setPendingOffers((po) => po.filter((e) => e.wrestlerName !== scoutingTarget.name));
    setUniverseFeed((feed) => [{ id: `scout-${weekNumber}-${Date.now()}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has scouted ${scoutingTarget.name} away from ${rivalName} for their developmental system.`, type: "rival", companyId: "player" }, ...feed].slice(0, 300));
    setScoutResult("accepted");
  };
  // Show-level roster split — which card a signed wrestler is eligible for.
  // Defaults to "main" for anyone without one set (older saves included).
  const setRosterLevel = (name, level) => setPool((p) => p.map((w) => (w.name === name ? { ...w, rosterLevel: level } : w)));

  // Inter-promotion M&A — buying a rival outright, working agreements, and a
  // developmental feeder promotion of your own.
  const companyPurchaseCost = (co) => Math.round(co.funds * 2 + co.popularity * 8000);
  const acquireCompany = (co) => {
    const cost = companyPurchaseCost(co);
    if (bank < cost || co.acquired) return;
    setBank((b) => b - cost);
    setFinanceHistory((fh) => [...fh, { weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), bank: bank - cost }]);
    setRivalCompanies((cs) => cs.map((c) => (c.id === co.id ? { ...c, acquired: true } : c)));
    setWorkingAgreements((ids) => ids.filter((id) => id !== co.id));
    setPool((p) => p.map((w) => (w.contractedTo === co.id ? { ...w, contractedTo: null, contractExpiresWeek: null, hireCooldownUntil: null } : w)));
    setRivalTitles((ts) => ts.filter((t) => t.companyId !== co.id));
    setUniverseFeed((feed) => [{ id: `acq-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has acquired ${co.name}! Their signed roster is now available as free agents.`, type: "title", companyId: "player" }, ...feed].slice(0, 300));
  };
  // A major promotion wouldn't bother working with a tiny local indie, and a
  // struggling local outfit has nothing a global giant needs — agreements only
  // make sense between companies within a tier of each other.
  const canProposeAgreement = (co) => !co.acquired && !workingAgreements.includes(co.id) && Math.abs(TIER_RANK[co.lastTier] - TIER_RANK[popularityTier(popularity)]) <= 1;
  const proposeAgreement = (co) => {
    if (!canProposeAgreement(co)) return;
    setWorkingAgreements((ids) => [...ids, co.id]);
    setUniverseFeed((feed) => [{ id: `wa-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has struck a working agreement with ${co.name} — their signed talent can now be booked as guest appearances, at a discounted loan fee.`, type: "title", companyId: "player" }, ...feed].slice(0, 300));
  };
  const endAgreement = (co) => {
    setWorkingAgreements((ids) => ids.filter((id) => id !== co.id));
    setUniverseFeed((feed) => [{ id: `wae-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `The working agreement between ${companyName} and ${co.name} has ended.`, type: "title", companyId: "player" }, ...feed].slice(0, 300));
  };
  const feederSetupCost = FEEDER_SETUP_COSTS[popularityTier(popularity)];
  const foundFeederCompany = () => {
    if (!newFeederName.trim() || feederCompany || bank < feederSetupCost) return;
    setBank((b) => b - feederSetupCost);
    setFinanceHistory((fh) => [...fh, { weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), bank: bank - feederSetupCost }]);
    setFeederCompany({ name: newFeederName.trim(), foundedWeek: weekNumber });
    setUniverseFeed((feed) => [{ id: `feeder-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has invested £${feederSetupCost.toLocaleString()} to found ${newFeederName.trim()} as a developmental feeder promotion. The Developmental show level and roster assignment are now unlocked.`, type: "title", companyId: "player" }, ...feed].slice(0, 300));
    setNewFeederName("");
  };

  const nextProductionTier = PRODUCTION_TIERS[productionTier + 1] || null;
  const upgradeProduction = () => {
    if (!nextProductionTier || bank < nextProductionTier.cost) return;
    setBank((b) => b - nextProductionTier.cost);
    setFinanceHistory((fh) => [...fh, { weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), bank: bank - nextProductionTier.cost }]);
    setProductionTier((t) => t + 1);
    setUniverseFeed((feed) => [{ id: `prod-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has invested £${nextProductionTier.cost.toLocaleString()} upgrading production to ${nextProductionTier.name} — pyro, titantron, lighting, and camera work all get a boost.`, type: "title", companyId: "player" }, ...feed].slice(0, 300));
  };

  // World Editor — direct create/edit/delete for wrestlers and companies, plus
  // CSV bulk import/export. Sandbox tools: no cost, no confirmation dialogs
  // beyond the delete buttons themselves, since this is meant for building out
  // a roster/world rather than playing through consequences.
  const openNewWrestlerDraft = () => {
    const w = makeWrestlerFromOverall("New Wrestler", 50);
    setEditingWrestlerDraft({ ...w, _isNew: true, _originalName: null });
  };
  const openEditWrestlerDraft = (w) => setEditingWrestlerDraft({ ...w, _isNew: false, _originalName: w.name });
  const deleteWrestlerByName = (name) => {
    setPool((p) => p.filter((w) => w.name !== name));
    setPerUseRoster((pu) => pu.filter((n) => n !== name));
    setTitles((ts) => ts.map((t) => (t.holders.includes(name) ? { ...t, holders: t.holders.filter((h) => h !== name) } : t)));
    setRivalTitles((ts) => ts.map((t) => (t.holder === name ? { ...t, holder: null } : t)));
    setPendingOffers((po) => po.filter((e) => e.wrestlerName !== name));
  };
  const saveWrestlerDraft = () => {
    const d = editingWrestlerDraft;
    if (!d || !d.name.trim()) return;
    const name = d.name.trim();
    const nameTaken = pool.some((w) => w.name === name && name !== d._originalName);
    if (nameTaken) return;
    const clamped = { ...d };
    STAT_KEYS.forEach((k) => { clamped[k] = clamp(Math.round(Number(clamped[k]) || 0), 0, 100); });
    clamped.age = clamp(Math.round(Number(clamped.age) || 25), 16, 90);
    clamped.name = name;
    clamped.tier = tierFromAvg(avgStats(clamped));
    delete clamped._isNew; delete clamped._originalName;
    if (d._isNew) {
      setPool((p) => [...p, clamped]);
    } else {
      setPool((p) => p.map((w) => (w.name === d._originalName ? { ...w, ...clamped } : w)));
      if (d._originalName !== name) {
        // Keep every reference to the old name pointing at the renamed wrestler.
        setPerUseRoster((pu) => pu.map((n) => (n === d._originalName ? name : n)));
        setTitles((ts) => ts.map((t) => ({ ...t, holders: t.holders.map((h) => (h === d._originalName ? name : h)) })));
        setRivalTitles((ts) => ts.map((t) => (t.holder === d._originalName ? { ...t, holder: name } : t)));
        setPendingOffers((po) => po.map((e) => (e.wrestlerName === d._originalName ? { ...e, wrestlerName: name } : e)));
        setShortlist((sl) => sl.map((n) => (n === d._originalName ? name : n)));
      }
    }
    setEditingWrestlerDraft(null);
  };

  const openNewCompanyDraft = () => setEditingCompanyDraft({ id: null, name: "", bookerName: randomBookerName(), titleName: "", popularity: 10, funds: 25000, _isNew: true });
  const openEditCompanyDraft = (co) => setEditingCompanyDraft({ ...co, _isNew: false });
  const deleteCompanyById = (id) => {
    setRivalCompanies((cs) => cs.filter((c) => c.id !== id));
    setRivalTitles((ts) => ts.filter((t) => t.companyId !== id));
    setWorkingAgreements((ids) => ids.filter((wid) => wid !== id));
    setPool((p) => p.map((w) => (w.contractedTo === id ? { ...w, contractedTo: null, contractExpiresWeek: null } : w)));
  };
  const saveCompanyDraft = () => {
    const d = editingCompanyDraft;
    if (!d || !d.name.trim()) return;
    const popularity = clamp(Math.round(Number(d.popularity) || 0), 0, 100);
    const funds = Math.max(0, Math.round(Number(d.funds) || 0));
    const titleName = d.titleName.trim() || `${d.name.trim()} Championship`;
    if (d._isNew) {
      const id = slugifyCompanyId(d.name.trim(), rivalCompanies.map((c) => c.id));
      setRivalCompanies((cs) => [...cs, { id, name: d.name.trim(), bookerName: d.bookerName.trim() || randomBookerName(), titleName, popularity, funds, showsRun: 0, lastTier: popularityTier(popularity), acquired: false }]);
      setRivalTitles((ts) => [...ts, { id: `${id}-title`, name: titleName, companyId: id, holder: null, reignStartWeek: null, totalDefenses: 0 }]);
    } else {
      setRivalCompanies((cs) => cs.map((c) => (c.id === d.id ? { ...c, name: d.name.trim(), bookerName: d.bookerName.trim() || c.bookerName, titleName, popularity, funds } : c)));
      setRivalTitles((ts) => ts.map((t) => (t.companyId === d.id ? { ...t, name: titleName } : t)));
    }
    setEditingCompanyDraft(null);
  };

  const downloadWrestlerTemplate = () => downloadTextFile("booked-wrestler-template.csv", toCSV([
    { name: "Johnny Thunder", age: 27, sex: "Male", weightClass: "Heavyweight", alignment: "Face", overall: 65 },
    { name: "The Viper", age: 31, sex: "Male", weightClass: "Cruiserweight", alignment: "Heel", overall: 58 },
  ], WRESTLER_CSV_HEADERS));
  const downloadWrestlerExport = () => downloadTextFile("booked-wrestlers-export.csv", toCSV(
    pool.map((w) => ({ name: w.name, age: w.age, sex: w.sex, weightClass: w.weightClass, alignment: w.alignment, overall: Math.round(avgStats(w)) })),
    WRESTLER_CSV_HEADERS
  ));
  const handleWrestlerCSVUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result));
      if (rows.length < 2) { setWrestlerImportSummary({ added: 0, skipped: [{ row: 0, reason: "File is empty or has no data rows." }] }); return; }
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (key) => header.indexOf(key);
      const nameIdx = idx("name");
      if (nameIdx === -1) { setWrestlerImportSummary({ added: 0, skipped: [{ row: 0, reason: 'No "name" column found.' }] }); return; }
      const existingNames = new Set(pool.map((w) => w.name));
      const added = [];
      const skipped = [];
      rows.slice(1).forEach((r, i) => {
        const name = (r[nameIdx] || "").trim();
        if (!name) { skipped.push({ row: i + 2, reason: "Missing name." }); return; }
        if (existingNames.has(name) || added.some((w) => w.name === name)) { skipped.push({ row: i + 2, reason: `"${name}" already exists.` }); return; }
        const age = clamp(Math.round(Number(r[idx("age")]) || 25), 16, 90);
        const sexRaw = (r[idx("sex")] || "").trim();
        const sex = /^f/i.test(sexRaw) ? "Female" : "Male";
        const weightClass = WEIGHT_CLASSES.includes((r[idx("weightclass")] || "").trim()) ? r[idx("weightclass")].trim() : WEIGHT_CLASSES[rand(0, WEIGHT_CLASSES.length - 1)];
        const alignment = ALIGNMENTS.includes((r[idx("alignment")] || "").trim()) ? r[idx("alignment")].trim() : ALIGNMENTS[rand(0, ALIGNMENTS.length - 1)];
        const overall = clamp(Math.round(Number(r[idx("overall")]) || 50), 1, 100);
        added.push(makeWrestlerFromOverall(name, overall, { age, sex, weightClass, alignment }));
      });
      if (added.length > 0) setPool((p) => [...p, ...added]);
      setWrestlerImportSummary({ added: added.length, skipped });
    };
    reader.readAsText(file);
  };

  const downloadCompanyTemplate = () => downloadTextFile("booked-company-template.csv", toCSV([
    { name: "Thunderdome Wrestling", bookerName: "Alex Rivera", titleName: "Thunderdome Championship", popularity: 25, funds: 100000 },
  ], COMPANY_CSV_HEADERS));
  const downloadCompanyExport = () => downloadTextFile("booked-companies-export.csv", toCSV(
    rivalCompanies.map((c) => ({ name: c.name, bookerName: c.bookerName, titleName: c.titleName, popularity: Math.round(c.popularity), funds: Math.round(c.funds) })),
    COMPANY_CSV_HEADERS
  ));
  const handleCompanyCSVUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result));
      if (rows.length < 2) { setCompanyImportSummary({ added: 0, skipped: [{ row: 0, reason: "File is empty or has no data rows." }] }); return; }
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (key) => header.indexOf(key);
      const nameIdx = idx("name");
      if (nameIdx === -1) { setCompanyImportSummary({ added: 0, skipped: [{ row: 0, reason: 'No "name" column found.' }] }); return; }
      const existingIds = rivalCompanies.map((c) => c.id);
      const addedCompanies = [];
      const addedTitles = [];
      const skipped = [];
      rows.slice(1).forEach((r, i) => {
        const name = (r[nameIdx] || "").trim();
        if (!name) { skipped.push({ row: i + 2, reason: "Missing name." }); return; }
        const popularity = clamp(Math.round(Number(r[idx("popularity")]) || 10), 0, 100);
        const funds = Math.max(0, Math.round(Number(r[idx("funds")]) || 25000));
        const bookerName = (r[idx("bookername")] || "").trim() || randomBookerName();
        const titleName = (r[idx("titlename")] || "").trim() || `${name} Championship`;
        const id = slugifyCompanyId(name, [...existingIds, ...addedCompanies.map((c) => c.id)]);
        addedCompanies.push({ id, name, bookerName, titleName, popularity, funds, showsRun: 0, lastTier: popularityTier(popularity), acquired: false });
        addedTitles.push({ id: `${id}-title`, name: titleName, companyId: id, holder: null, reignStartWeek: null, totalDefenses: 0 });
      });
      if (addedCompanies.length > 0) {
        setRivalCompanies((cs) => [...cs, ...addedCompanies]);
        setRivalTitles((ts) => [...ts, ...addedTitles]);
      }
      setCompanyImportSummary({ added: addedCompanies.length, skipped });
    };
    reader.readAsText(file);
  };

  const startNegotiating = (w) => {
    setNegotiatingTarget(w);
    setNegotiationOffers(rollPerUseOffers(w));
    setNegotiationCounter(null);
    setNegotiationResult(null);
  };
  const finalizePerUse = (fee) => {
    if (!negotiatingTarget) return;
    setPool((p) => p.map((w) => (w.name === negotiatingTarget.name ? { ...w, perUseFee: fee } : w)));
    setPerUseRoster((pu) => (pu.includes(negotiatingTarget.name) ? pu : [...pu, negotiatingTarget.name]));
    setNegotiationResult("accepted");
  };
  const pickPerUseOffer = (offer) => {
    if (!negotiatingTarget) return;
    const refused = Math.random() < clamp(offer.refusalChance + happinessRefusalAdj(negotiatingTarget) + reputationRefusalAdj(negotiatingTarget), 0.02, 0.95);
    if (refused) {
      if (Math.random() < COUNTER_OFFER_CHANCE) {
        const counterFee = Math.round(offer.fee * (1.2 + Math.random() * 0.25));
        setNegotiationCounter({ fee: counterFee });
        setNegotiationResult("countered");
        return;
      }
      const cooldownWeeks = rand(1, 3);
      setPool((p) => p.map((w) => (w.name === negotiatingTarget.name ? { ...w, hireCooldownUntil: weekNumber + cooldownWeeks } : w)));
      setNegotiationResult("refused");
      return;
    }
    finalizePerUse(offer.fee);
  };
  const acceptNegotiationCounter = () => { if (negotiationCounter) finalizePerUse(negotiationCounter.fee); };
  const walkAwayFromNegotiationCounter = () => {
    if (!negotiatingTarget) return;
    const cooldownWeeks = rand(1, 3);
    setPool((p) => p.map((w) => (w.name === negotiatingTarget.name ? { ...w, hireCooldownUntil: weekNumber + cooldownWeeks } : w)));
    setNegotiationResult("refused");
  };
  const removePerUse = (name) => setPerUseRoster((pu) => pu.filter((n) => n !== name));

  const startExtending = (w) => { setExtendingTarget(w); setExtendWeeks(26); setExtendResult(null); };
  const confirmExtend = () => {
    if (!extendingTarget) return;
    const refused = Math.random() < clamp(EXTENSION_REFUSAL_CHANCE + happinessRefusalAdj(extendingTarget) + reputationRefusalAdj(extendingTarget), 0.02, 0.9);
    if (refused) {
      setExtendResult("refused");
      return;
    }
    setPool((p) => p.map((w) => (w.name === extendingTarget.name ? { ...w, contractExpiresWeek: Math.max(w.contractExpiresWeek, weekNumber) + extendWeeks } : w)));
    // A fresh extension settles "stay or go" on the spot — any bidding war
    // already brewing over their old expiry date is moot now.
    setPendingOffers((po) => po.filter((e) => e.wrestlerName !== extendingTarget.name));
    setExtendResult("accepted");
  };

  const acceptNetworkOffer = (offer) => {
    setNetworkDeal({ id: offer.id, name: offer.name, payPerViewer: offer.payPerViewer, viewerMult: offer.viewerMult, expiresWeek: weekNumber + offer.weeks, eventTemplateId: null });
    setNetworkOffers([]);
  };
  const acceptSponsorOffer = (offer) => {
    setSponsorDeal({ id: offer.id, name: offer.name, weeklyPay: offer.weeklyPay, expiresWeek: weekNumber + offer.weeks });
    setSponsorOffers([]);
  };

  const toggleStableMember = (name) => {
    setNewStableMembers((m) => (m.includes(name) ? m.filter((n) => n !== name) : m.length < STABLE_MAX_MEMBERS ? [...m, name] : m));
  };
  const confirmCreateStable = () => {
    if (!newStableName.trim() || newStableMembers.length < STABLE_MIN_MEMBERS) return;
    setStables((s) => [...s, { id: `stable-${Date.now()}`, name: newStableName.trim(), members: newStableMembers, matches: 0, wins: 0, losses: 0, rivalStableIds: [] }]);
    setNewStableName(""); setNewStableMembers([]); setCreatingStable(false);
    setHasCreatedStableManually(true);
  };
  const disbandStable = (id) => setStables((s) => s.filter((x) => x.id !== id));
  const startRenameStable = (s) => { setEditingStableId(s.id); setEditingStableName(s.name); };
  const confirmRenameStable = () => {
    if (!editingStableName.trim()) return;
    setStables((ss) => ss.map((s) => (s.id === editingStableId ? { ...s, name: editingStableName.trim() } : s)));
    setEditingStableId(null);
  };
  const addStableMember = (stableId, name) => {
    setStables((ss) => ss.map((s) => (s.id === stableId && s.members.length < STABLE_MAX_MEMBERS && !s.members.includes(name) ? { ...s, members: [...s.members, name] } : s)));
  };
  const removeStableMember = (stableId, name) => {
    setStables((ss) => ss.map((s) => (s.id === stableId ? { ...s, members: s.members.filter((n) => n !== name) } : s)));
  };
  const stableOf = (name) => stables.find((s) => s.members.includes(name)) || null;

  const CONTENDER_SLOTS = 3;
  const meetsTitleRestrictions = (w, title) => {
    if (title.weightClass && w.weightClass !== title.weightClass) return false;
    if (title.genderLock && w.sex !== title.genderLock) return false;
    return true;
  };
  // Top contenders for a title are drawn from your own bookable roster (exclusive
  // + per-use) — a random freelancer nobody's ever booked shouldn't be able to
  // walk in and challenge for your belt just because a stat happened to be high.
  const titleContenders = (title) => {
    if (title.type === "tag") {
      const eligibleStables = stables.filter((s) => {
        const core = s.members.slice(0, 2);
        if (core.length < 2) return false;
        if (title.holders.length > 0 && core.some((n) => title.holders.includes(n))) return false;
        return core.every((n) => bookable.some((w) => w.name === n && meetsTitleRestrictions(w, title)));
      });
      return eligibleStables
        .map((s) => {
          const core = s.members.slice(0, 2).map((n) => bookable.find((w) => w.name === n)).filter(Boolean);
          const pts = core.reduce((sum, w) => sum + w.rankingPts, 0);
          return { key: s.id, label: s.name, pts };
        })
        .sort((a, b) => b.pts - a.pts)
        .slice(0, CONTENDER_SLOTS);
    }
    const ranked = bookable
      .filter((w) => !title.holders.includes(w.name) && meetsTitleRestrictions(w, title))
      .map((w) => ({ key: w.name, label: w.name, pts: w.rankingPts }))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, CONTENDER_SLOTS);
    // A Number One Contender match winner is guaranteed a shot regardless of
    // where they'd otherwise rank — bump them in ahead of the ranked list
    // (or just surface them, if they'd have made it anyway).
    const earned = number1Contenders.find((n) => n.titleId === title.id);
    if (earned && !title.holders.includes(earned.key) && !ranked.some((r) => r.key === earned.key)) {
      return [{ key: earned.key, label: earned.label, pts: Infinity, earned: true }, ...ranked].slice(0, CONTENDER_SLOTS + 1);
    }
    return ranked.map((r) => (r.key === earned?.key ? { ...r, earned: true } : r));
  };
  // Resolves a #1 Contender stipulation's winner into the shape
  // number1Contenders tracks — UI only offers non-tag titles as n1cTitleId
  // choices, so winnerTeam is always a single wrestler here.
  const n1cInfoFor = (seg, winnerTeam) => {
    if (!seg.n1cTitleId || winnerTeam.length === 0) return null;
    const title = titles.find((t) => t.id === seg.n1cTitleId);
    if (!title) return null;
    return { id: title.id, name: title.name, key: winnerTeam[0].name, label: winnerTeam[0].name };
  };

  const addWrestlerRivalry = (nameA, nameB) => {
    if (!nameA || !nameB || nameA === nameB) return;
    setPool((p) => p.map((w) => {
      if (w.name === nameA) return { ...w, rivals: [...new Set([...w.rivals, nameB])] };
      if (w.name === nameB) return { ...w, rivals: [...new Set([...w.rivals, nameA])] };
      return w;
    }));
  };
  const removeWrestlerRivalry = (nameA, nameB) => {
    setPool((p) => p.map((w) => {
      if (w.name === nameA) return { ...w, rivals: w.rivals.filter((n) => n !== nameB) };
      if (w.name === nameB) return { ...w, rivals: w.rivals.filter((n) => n !== nameA) };
      return w;
    }));
    const key = [nameA, nameB].sort().join("|");
    setStorylines((s) => { const next = { ...s }; delete next[key]; return next; });
  };
  const addStableRivalry = (idA, idB) => {
    if (!idA || !idB || idA === idB) return;
    setStables((ss) => ss.map((s) => {
      if (s.id === idA) return { ...s, rivalStableIds: [...new Set([...(s.rivalStableIds || []), idB])] };
      if (s.id === idB) return { ...s, rivalStableIds: [...new Set([...(s.rivalStableIds || []), idA])] };
      return s;
    }));
  };
  const removeStableRivalry = (idA, idB) => {
    setStables((ss) => ss.map((s) => {
      if (s.id === idA) return { ...s, rivalStableIds: (s.rivalStableIds || []).filter((id) => id !== idB) };
      if (s.id === idB) return { ...s, rivalStableIds: (s.rivalStableIds || []).filter((id) => id !== idA) };
      return s;
    }));
    const key = [idA, idB].sort().join("|");
    setStableStorylines((s) => { const next = { ...s }; delete next[key]; return next; });
  };
  const confirmCreateRivalry = () => {
    if (newRivalryType === "singles") addWrestlerRivalry(newRivalryA, newRivalryB);
    else addStableRivalry(newRivalryA, newRivalryB);
    setNewRivalryA(""); setNewRivalryB(""); setCreatingRivalry(false);
    setHasCreatedRivalryManually(true);
  };

  const promiseRequest = (req) => {
    setRequests((rs) => rs.map((r) => (r.id === req.id ? { ...r, status: "promised", deadlineWeek: weekNumber + REQUEST_DEADLINE_WEEKS } : r)));
  };
  const declineRequest = (req) => {
    setRequests((rs) => rs.filter((r) => r.id !== req.id));
    setPool((p) => p.map((w) => (w.name === req.wrestlerName ? { ...w, happiness: clamp(w.happiness + HAPPINESS_DECLINE_PENALTY, 0, 100) } : w)));
  };
  const fulfillRequest = (req) => {
    setRequests((rs) => rs.filter((r) => r.id !== req.id));
    // A role-change isn't a stat tweak — granting it retires them from
    // in-ring competition into the staff pool outright, same destination as
    // a wrestler who rolls this on the way into retirement (see
    // RETIRE_TO_STAFF_CHANCE), just requested instead of random.
    if (req.type === "role-change") {
      const w = pool.find((x) => x.name === req.wrestlerName);
      if (!w) return;
      const roleLabel = STAFF_ROLES.find((r) => r.key === req.targetRole)?.label || req.targetRole;
      const skill = clamp(Math.round(avgStats(w) * 0.7 + w.titleReigns * 5), 20, 95);
      setStaffPool((sp) => [...sp, { id: `rolechange-${w.name}-${weekNumber}`, name: w.name, role: req.targetRole, skill, contractedTo: null, contractExpiresWeek: null }]);
      setPool((p) => p.filter((x) => x.name !== w.name));
      setPerUseRoster((pu) => pu.filter((n) => n !== w.name));
      if ((w.holdsTitles || []).length > 0) {
        setTitles((ts) => ts.map((t) => (t.holders.includes(w.name) ? { ...t, holders: [], reignStartWeek: null, currentReignDefenses: 0, history: [...t.history, { holderNames: t.holders, reignWeeks: t.reignStartWeek !== null ? weekNumber - t.reignStartWeek : 0, wonWeek: t.reignStartWeek, lostWeek: weekNumber, defenses: t.currentReignDefenses || 0, vacatedByRetirement: true }] } : t)));
        setRivalTitles((ts) => ts.map((t) => (t.holder === w.name ? { ...t, holder: null } : t)));
      }
      setUniverseFeed((feed) => [{ id: `rolechange-${weekNumber}-${Date.now()}`, showNumber: weekNumber, date: scheduledDate, text: `${w.name} has stepped away from in-ring competition to become ${/^[aeiou]/i.test(roleLabel) ? "an" : "a"} ${roleLabel} — available to hire from the Staff screen.`, type: "rumor", companyId: w.contractedTo }, ...feed].slice(0, 300));
      return;
    }
    setPool((p) => p.map((w) => {
      if (w.name !== req.wrestlerName) return w;
      const happier = { ...w, happiness: clamp(w.happiness + HAPPINESS_FULFILLED_BONUS, 0, 100) };
      if (req.type === "raise") {
        happier.wageMultiplier = Math.round((happier.wageMultiplier || 1) * 1.15 * 100) / 100;
        if (happier.perUseFee != null) happier.perUseFee = Math.round(happier.perUseFee * 1.15);
      }
      return happier;
    }));
  };

  const takeLoan = (opt) => {
    if (loan || TIER_RANK[popularityTier(popularity)] < TIER_RANK[opt.minTier]) return;
    const totalOwed = Math.round(opt.amount * (1 + LOAN_INTEREST_RATE));
    setLoan({ principal: opt.amount, weeklyPayment: Math.round(totalOwed / opt.weeks), weeksRemaining: opt.weeks, totalOwed });
    setBank((b) => b + opt.amount);
    setFinanceHistory((fh) => [...fh, { weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), bank: bank + opt.amount }]);
    setHasEverTakenLoan(true);
  };
  const buyMerchStock = (units) => {
    const cost = units * MERCH_QUALITY_TIERS[merchQualityTier].unitCost;
    if (units <= 0 || cost > bank) return;
    setBank((b) => b - cost);
    setMerchStock((s) => s + units);
  };
  const upgradeMerchQuality = () => {
    const next = merchQualityTier + 1;
    if (next >= MERCH_QUALITY_TIERS.length || bank < MERCH_QUALITY_TIERS[next].upgradeCost) return;
    setBank((b) => b - MERCH_QUALITY_TIERS[next].upgradeCost);
    setMerchQualityTier(next);
  };

  const MAX_TITLES = 5;
  const purchaseTitle = () => {
    if (bank < TITLE_PURCHASE_COST || !newTitleName.trim() || titles.length >= MAX_TITLES) return;
    setBank((b) => b - TITLE_PURCHASE_COST);
    setFinanceHistory((fh) => [...fh, { weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), bank: bank - TITLE_PURCHASE_COST }]);
    setTitles((ts) => [...ts, { id: `title-${Date.now()}`, name: newTitleName.trim(), type: newTitleType, weightClass: newTitleWeightClass, genderLock: newTitleGenderLock, holders: [], reignStartWeek: null, totalDefenses: 0, currentReignDefenses: 0, prestige: 0, history: [] }]);
    setNewTitleName(""); setNewTitleType("singles"); setNewTitleWeightClass(null); setNewTitleGenderLock(null); setPurchasingTitle(false);
  };
  const startRenameTitle = (t) => { setEditingTitleId(t.id); setEditingTitleName(t.name); };
  const confirmRenameTitle = () => {
    if (!editingTitleName.trim()) return;
    setTitles((ts) => ts.map((t) => (t.id === editingTitleId ? { ...t, name: editingTitleName.trim() } : t)));
    setEditingTitleId(null);
  };

  // Staff — hiring/releasing, and the derived skill values every gameplay
  // effect reads from. Only your best-skilled hire in each role counts (no
  // stacking multiple agents for a bigger bonus), same spirit as how only
  // one network/sponsor deal can be active at a time.
  const hiredStaff = staffPool.filter((s) => s.contractedTo === "player");
  const bestStaffSkill = (role) => hiredStaff.filter((s) => s.role === role).reduce((max, s) => Math.max(max, s.skill), 0);
  const bestAgentSkill = bestStaffSkill("agent");
  const bestRefereeSkill = bestStaffSkill("referee");
  const bestMedicalSkill = bestStaffSkill("medical");
  const bestRingCrewSkill = bestStaffSkill("ringcrew");
  const bestSecuritySkill = bestStaffSkill("security");
  const bestBookerSkill = bestStaffSkill("booker");
  const bestTrainerSkill = bestStaffSkill("trainer");
  // Agents and a sharp referee raise the ceiling a match can realistically hit;
  // an assistant booker's contribution is smaller and show-wide rather than
  // per-match. Caps at +12 total with max skill across all three roles.
  const staffRatingBonus = Math.round((bestAgentSkill / 100) * 6 + (bestRefereeSkill / 100) * 3 + (bestBookerSkill / 100) * 3);
  const medicalInjuryFactor = 1 - (bestMedicalSkill / 100) * 0.5;
  const ringCrewCatastropheFactor = 1 - (bestRingCrewSkill / 100) * 0.5;
  const securityIncidentFactor = 1 - (bestSecuritySkill / 100) * 0.6;
  const staffWeeklyPayroll = hiredStaff.reduce((sum, s) => sum + staffWeeklyWage(s.skill), 0);
  // Production (pyro, titantron, lighting, cameras) stacks with the Staff
  // bonus above rather than replacing it — one's people, the other's gear.
  const productionRatingBonus = PRODUCTION_TIERS[productionTier].ratingBonus;
  const showQualityBonus = staffRatingBonus + productionRatingBonus;
  const productionWeeklyUpkeep = PRODUCTION_TIERS[productionTier].upkeep;
  const startHiringStaff = (s) => { setHiringStaffTarget(s); setStaffHireWeeks(26); };
  const confirmHireStaff = () => {
    if (!hiringStaffTarget) return;
    setStaffPool((sp) => sp.map((s) => (s.id === hiringStaffTarget.id ? { ...s, contractedTo: "player", contractExpiresWeek: weekNumber + staffHireWeeks } : s)));
    setUniverseFeed((feed) => [{ id: `staffhire-${weekNumber}-${Date.now()}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has hired ${hiringStaffTarget.name} as ${STAFF_ROLES.find((r) => r.key === hiringStaffTarget.role)?.label || "staff"}.`, type: "rival", companyId: "player" }, ...feed].slice(0, 300));
    setHiringStaffTarget(null);
  };
  const releaseStaff = (s) => {
    setStaffPool((sp) => sp.map((x) => (x.id === s.id ? { ...x, contractedTo: null, contractExpiresWeek: null } : x)));
    setUniverseFeed((feed) => [{ id: `staffrel-${weekNumber}-${Date.now()}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has released ${s.name}.`, type: "rival", companyId: "player" }, ...feed].slice(0, 300));
  };

  // Ported straight from the old fixed-slot resolution logic (same formulas,
  // same order of operations) — the only thing that changed is where `cap`
  // comes from: a computed position+minutes value instead of a SLOT_DEFS
  // lookup. Called once whenever a segment's own content changes (not when
  // other segments are added/removed/reordered around it) — a segment's
  // result is frozen at whatever position/total it had at that moment,
  // the same way a human booker wouldn't expect match 1's winner to change
  // because they added a match 4.
  // True when a previous result exists for the exact same set of people —
  // the signal that a winner (auto-rolled or overridden) should stay put
  // rather than re-roll just because the booker tweaked minutes, a
  // specialty, or a title assignment. Changing who's actually in the match
  // is the only thing that should ever force a fresh roll.
  const sameParticipants = (previousResult, currentParticipants) => {
    if (!previousResult || previousResult.format !== "match") return false;
    const prevNames = [...(previousResult.team1 || []), ...(previousResult.team2 || [])].map((w) => w.name).sort().join("|");
    const currNames = currentParticipants.map((w) => w.name).sort().join("|");
    return prevNames === currNames && prevNames.length > 0;
  };
  // What a Hype vignette can actually be pointed at — real, current state
  // (a fresh signing who hasn't debuted, someone due back from injury soon,
  // or next week's show) rather than a separate fictional calendar of
  // "announced" storylines. Picking a real target over leaving it general
  // is what earns the rating bonus in resolveSegmentResult below.
  const hypeTargets = () => {
    const targets = [];
    // Debut hype covers anyone actually bookable right now who's never had a
    // match for us — a fresh exclusive signing or a freelancer's first time
    // on the card both count as a real "new arrival" story.
    bookable.forEach((w) => {
      if (w.matches === 0) targets.push({ id: `signee-${w.name}`, label: `Hype ${w.name}'s arrival`, kind: "signee", name: w.name });
    });
    // Injury return is narrower — only an exclusive signee is "ours" in a
    // continuing-storyline sense while they're out hurt.
    pool.forEach((w) => {
      if (w.contractedTo === "player" && w.injuryWeeksRemaining > 0 && w.injuryWeeksRemaining <= 3) targets.push({ id: `return-${w.name}`, label: `Hype ${w.name}'s return from injury`, kind: "return", name: w.name });
    });
    targets.push({ id: "next-show", label: (weekNumber + 1) % PPV_EVERY === 0 ? "Hype next week's big show" : "Hype the upcoming show", kind: "show", name: null });
    return targets;
  };
  const resolveSegmentResult = (seg, index, total, previousResult = null) => {
    let cap = computeSegmentCap(index, total, seg.minutes);
    const label = segmentLabel(index, total);
    // What the wrestling world wants right now, applied flat wherever this
    // particular segment actually fits the active trend.
    const trendBonus = fitsFanTrend(fanTrendKey, seg) ? FAN_TREND_BONUS : 0;
    if (seg.format === "segment") {
      const angleType = seg.angleType || "promo";
      const performer = seg.team1[0];
      const subject = seg.team2 && seg.team2[0] ? seg.team2[0] : null;
      const statBasis = angleType === "vignette" ? performer.ent
        : angleType === "confrontation" && subject ? (performer.cha + subject.cha) / 2
        : performer.cha;
      const floor = Math.round(statBasis * 0.4);
      const rawRating = Math.max(floor, Math.min(cap, floor + Math.round(Math.random() * (cap - floor))));
      // A face-to-face confrontation has a real chance of boiling over into
      // a physical swerve — pops the rating a bit, same spirit as a promo
      // genuinely going off-script, at a small energy cost (see the weekly
      // tick) instead of a promo's usual energy recovery.
      const brawl = angleType === "confrontation" && !!subject && Math.random() < 0.25;
      // A Vignette pointed at something real (see hypeTargets) plays better
      // than generic atmosphere — fans respond to actual news, not filler.
      const hypeInfo = angleType === "vignette" && seg.hypeTargetId ? hypeTargets().find((t) => t.id === seg.hypeTargetId) || null : null;
      const rating = Math.min(100, Math.min(cap, rawRating + showQualityBonus + trendBonus) + (brawl ? 6 : 0) + (hypeInfo ? HYPE_TARGET_BONUS : 0));
      return { slotKey: seg.id, slotLabel: label, format: "segment", angleType, performer, subject, rating, brawl, hypeInfo, titleInfo: null, customName: seg.customName || null, script: seg.script || null };
    }
    // Purpose only applies to actual matches — why it's happening (a fair
    // fight, chasing the night's best rating, elevating the winner, or a
    // fast squash), reflected in how high the match can rate.
    const purpose = MATCH_PURPOSE_BY_ID[seg.purposeId] || MATCH_PURPOSE_BY_ID.competitive;
    cap = Math.max(20, cap + purpose.capBonus);
    if (seg.type === "triple" || seg.type === "fatal4") {
      const participants = seg.team1.filter(Boolean);
      const rollAutoWinnerIdx = () => {
        // Fatigue-adjusted weighted random winner — everyone's odds scale with
        // their effective strength, but it's not a strict 1v1 coin flip.
        const weights = participants.map((w) => attrOf(w) * (0.6 + 0.4 * (w.eng / 100)));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll <= 0) return i; }
        return 0;
      };
      const overrideIdx = seg.winnerOverride ? participants.findIndex((p) => p.name === seg.winnerOverride) : -1;
      const stickyIdx = sameParticipants(previousResult, participants) && previousResult.winnerTeam
        ? participants.findIndex((p) => p.name === previousResult.winnerTeam[0].name) : -1;
      const winnerIdx = overrideIdx >= 0 ? overrideIdx : stickyIdx >= 0 ? stickyIdx : rollAutoWinnerIdx();
      const winnerTeam = [participants[winnerIdx]];
      const loserTeam = participants.filter((_, i) => i !== winnerIdx);
      const avgAttr = participants.reduce((s, w) => s + attrOf(w), 0) / participants.length;
      // Match Story — the narrative hook, independent of Purpose (see
      // MATCH_STORIES). "classic" and "underdog" depend on how the winner
      // actually compares to the field, so they're resolved here rather than
      // as a flat constant.
      const matchStory = MATCH_STORY_BY_ID[seg.storyId] || MATCH_STORY_BY_ID.standard;
      const loserAvgAttrMM = loserTeam.length ? loserTeam.reduce((s, w) => s + attrOf(w), 0) / loserTeam.length : avgAttr;
      const winnerAttrMM = attrOf(winnerTeam[0]);
      let storyCapBonusMM = matchStory.capBonus || 0;
      if (matchStory.id === "classic") {
        const gap = Math.abs(winnerAttrMM - loserAvgAttrMM) / Math.max(1, (winnerAttrMM + loserAvgAttrMM) / 2);
        storyCapBonusMM = gap < 0.15 ? 8 : gap < 0.3 ? 2 : -6;
      }
      const isUpsetMM = matchStory.id === "underdog" && winnerAttrMM < loserAvgAttrMM;
      cap = Math.max(20, cap + storyCapBonusMM);
      const rawFloor = Math.round(avgAttr * 0.25);
      let floor = Math.min(cap, rawFloor);
      if (matchStory.floorBoostFrac) floor = Math.round(floor + (cap - floor) * matchStory.floorBoostFrac);
      const spread = Math.min(cap - floor, Math.round(20 + avgAttr * 0.55));
      let rating = Math.max(floor, Math.min(cap, floor + Math.round(Math.random() * spread) + 3)); // scrambles run a touch hotter
      const specialty = seg.specialtyId ? SPECIALTY_MATCHES.find((s) => s.id === seg.specialtyId) : null;
      if (specialty) rating = Math.min(cap, rating + specialty.ratingBonus);
      // Clutch Performer (see deriveTraits) earns their reputation in exactly
      // the moments that reputation is named for — title matches and the
      // Main Event, not a flat bonus everywhere.
      const clutchBonus = (label === "Main Event" || !!seg.titleId) && participants.some((w) => deriveTraits(w).some((t) => t.key === "clutch")) ? 3 : 0;
      rating = Math.min(cap, rating + showQualityBonus + trendBonus + clutchBonus + (isUpsetMM ? 6 : 0));
      let titleInfo = null;
      if (seg.titleId) {
        const title = titles.find((t) => t.id === seg.titleId);
        if (title) {
          const winnerNames = winnerTeam.map((w) => w.name);
          const defended = title.holders.length > 0 && title.holders.every((h) => winnerNames.includes(h));
          titleInfo = { id: title.id, name: title.name, label: title.holders.length === 0 ? "New Champion(s)" : defended ? "Title Defended" : "Title Changes Hands!", defended };
        }
      }
      const n1cInfo = n1cInfoFor(seg, winnerTeam);
      const winMethod = seg.winMethodOverride || (sameParticipants(previousResult, participants) ? previousResult.winMethod : null) || pickWinMethod(winnerTeam);
      return { slotKey: seg.id, slotLabel: label, format: "match", team1: participants, team2: [], winnerTeam, loserTeam, rating, isTag: false, isMultiMan: true, titleInfo, n1cInfo, loserLeaves: !!seg.loserLeaves, specialty, storyKey: null, stableStoryKey: null, winMethod, purpose: purpose.id, matchStory: matchStory.id, upsetHappened: isUpsetMM, customName: seg.customName || null, script: seg.script || null };
    }
    const team1 = seg.team1.filter(Boolean);
    const team2 = seg.team2.filter(Boolean);
    const attr1 = teamAttr(team1);
    const attr2 = teamAttr(team2);
    // Gassed wrestlers perform worse — fatigue temporarily knocks down effective
    // stats for this match (up to 40% at 0 energy), affecting both who wins and
    // how good the match can possibly be.
    const fatigueMult1 = 0.6 + 0.4 * (teamStat(team1, "eng") / 100);
    const fatigueMult2 = 0.6 + 0.4 * (teamStat(team2, "eng") / 100);
    const effAttr1 = attr1 * fatigueMult1;
    const effAttr2 = attr2 * fatigueMult2;
    const attrProb1 = effAttr1 / (effAttr1 + effAttr2);

    const specialty = seg.specialtyId ? SPECIALTY_MATCHES.find((s) => s.id === seg.specialtyId) : null;
    let prob1 = attrProb1;
    if (specialty) {
      const spec1 = teamStat(team1, specialty.statKey);
      const spec2 = teamStat(team2, specialty.statKey);
      const specProb1 = spec1 / (spec1 + spec2);
      prob1 = attrProb1 * (1 - SPECIALTY_WEIGHT) + specProb1 * SPECIALTY_WEIGHT;
    }
    const overrideSide = seg.winnerOverride ? (team1.some((w) => w.name === seg.winnerOverride) ? team1 : team2.some((w) => w.name === seg.winnerOverride) ? team2 : null) : null;
    const stickySide = !overrideSide && sameParticipants(previousResult, [...team1, ...team2]) && previousResult.winnerTeam
      ? (team1.some((w) => w.name === previousResult.winnerTeam[0].name) ? team1 : team2) : null;
    const winnerTeam = overrideSide || stickySide || (Math.random() < prob1 ? team1 : team2);
    const loserTeam = winnerTeam === team1 ? team2 : team1;
    // Match Story — see the multi-man branch above for why "classic" and
    // "underdog" are resolved here instead of as a flat constant.
    const matchStory = MATCH_STORY_BY_ID[seg.storyId] || MATCH_STORY_BY_ID.standard;
    const winnerAttrST = teamAttr(winnerTeam);
    const loserAttrST = teamAttr(loserTeam);
    let storyCapBonusST = matchStory.capBonus || 0;
    if (matchStory.id === "classic") {
      const gap = Math.abs(winnerAttrST - loserAttrST) / Math.max(1, (winnerAttrST + loserAttrST) / 2);
      storyCapBonusST = gap < 0.15 ? 8 : gap < 0.3 ? 2 : -6;
    }
    const isUpsetST = matchStory.id === "underdog" && winnerAttrST < loserAttrST;
    cap = Math.max(20, cap + storyCapBonusST);
    const rawFloor = Math.round(((effAttr1 + effAttr2) / 2) * 0.25);
    let floor = Math.min(cap, rawFloor);
    if (matchStory.floorBoostFrac) floor = Math.round(floor + (cap - floor) * matchStory.floorBoostFrac);
    const avgEffAttr = (effAttr1 + effAttr2) / 2;
    const spread = Math.min(cap - floor, Math.round(20 + avgEffAttr * 0.55));
    let rating = Math.max(floor, Math.min(cap, floor + Math.round(Math.random() * spread)));
    if (specialty) rating = Math.min(cap, rating + specialty.ratingBonus);
    // A clean Face vs Heel dynamic tells a better story than two of the same.
    const aligns1 = new Set(team1.map((w) => w.alignment));
    const aligns2 = new Set(team2.map((w) => w.alignment));
    if (aligns1.size === 1 && aligns2.size === 1 && [...aligns1][0] !== [...aligns2][0]) {
      rating = Math.min(cap, rating + 4);
    }

    // A booked-in rivalry pays off with a rating bump scaled to how heated it's gotten.
    let storyKey = null;
    if (team1.length === 1 && team2.length === 1 && team1[0].rivals.includes(team2[0].name) && team2[0].rivals.includes(team1[0].name)) {
      storyKey = [team1[0].name, team2[0].name].sort().join("|");
      const existing = storylines[storyKey] || { intensity: 20, matchesFought: 0 };
      rating = Math.min(cap, rating + Math.round(existing.intensity / 10));
    }
    // Fans notice when you run the same match back over and over — a
    // penalty that scales with how often this exact pairing has shown up
    // in your recent shows, and fades away once you stop repeating it.
    // An active rivalry gets it halved — building toward a blowoff is a
    // real reason to run it back, not just repetition for its own sake.
    const matchupKey = [...team1.map((w) => w.name), ...team2.map((w) => w.name)].sort().join("|");
    const recentRepeats = recentMatchups.filter((k) => k === matchupKey).length;
    if (recentRepeats > 0) {
      const stalenessPenalty = Math.min(25, recentRepeats * 6);
      rating = Math.max(floor, rating - (storyKey ? Math.round(stalenessPenalty / 2) : stalenessPenalty));
    }

    let stableStoryKey = null;
    if (team1.length === 2 && team2.length === 2) {
      const s1 = stables.find((s) => s.members.length >= 2 && team1.every((w) => [s.members[0], s.members[1]].includes(w.name)));
      const s2 = stables.find((s) => s.members.length >= 2 && team2.every((w) => [s.members[0], s.members[1]].includes(w.name)));
      if (s1 && s2 && (s1.rivalStableIds || []).includes(s2.id) && (s2.rivalStableIds || []).includes(s1.id)) {
        stableStoryKey = [s1.id, s2.id].sort().join("|");
        const existing = stableStorylines[stableStoryKey] || { intensity: 20, matchesFought: 0 };
        rating = Math.min(cap, rating + Math.round(existing.intensity / 10));
      }
    }

    let titleInfo = null;
    if (seg.titleId) {
      const title = titles.find((t) => t.id === seg.titleId);
      if (title) {
        const winnerNames = winnerTeam.map((w) => w.name).sort();
        const currentHolders = [...title.holders].sort();
        const defended = title.holders.length > 0 && winnerNames.length === currentHolders.length && winnerNames.every((n, i) => n === currentHolders[i]);
        titleInfo = { id: title.id, name: title.name, label: title.holders.length === 0 ? "New Champion(s)" : defended ? "Title Defended" : "Title Changes Hands!", defended };
      }
    }
    // Clutch Performer (see deriveTraits) earns their reputation in exactly
    // the moments that reputation is named for — title matches and the Main
    // Event, not a flat bonus everywhere.
    const clutchBonus = (label === "Main Event" || !!seg.titleId) && [...team1, ...team2].some((w) => deriveTraits(w).some((t) => t.key === "clutch")) ? 3 : 0;
    rating = Math.min(cap, rating + showQualityBonus + trendBonus + clutchBonus + (isUpsetST ? 6 : 0));
    const n1cInfo = n1cInfoFor(seg, winnerTeam);
    const winMethod = seg.winMethodOverride || (sameParticipants(previousResult, [...team1, ...team2]) ? previousResult.winMethod : null) || pickWinMethod(winnerTeam);
    return { slotKey: seg.id, slotLabel: label, format: "match", team1, team2, winnerTeam, loserTeam, rating, isTag: seg.type === "tag", titleInfo, n1cInfo, loserLeaves: !!seg.loserLeaves, specialty, storyKey, stableStoryKey, winMethod, purpose: purpose.id, matchStory: matchStory.id, upsetHappened: isUpsetST, customName: seg.customName || null, script: seg.script || null };
  };

  // Applies a field update to one segment, then re-resolves it (or clears
  // its result) using its CURRENT position in the running order — every
  // segment setter below routes through this so resolution never has to be
  // triggered separately.
  const updateSegment = (id, fn) => {
    setSegments((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const updated = fn(prev[idx]);
      const withResult = { ...updated, result: isSegmentComplete(updated) ? resolveSegmentResult(updated, idx, prev.length, prev[idx].result) : null };
      const next = [...prev];
      next[idx] = withResult;
      return next;
    });
  };
  const addSegment = (format) => setSegments((prev) => [...prev, makeSegment(format)]);
  const removeSegment = (id) => setSegments((prev) => prev.filter((s) => s.id !== id));
  const setSegmentFormat = (id, format) => {
    updateSegment(id, (s) => ({ ...s, format, angleType: "promo", team1: [s.team1[0], null, null, null], team2: [null, null], titleId: null, specialtyId: null, n1cTitleId: null, loserLeaves: false, hypeTargetId: null, winnerOverride: null, winMethodOverride: null }));
  };
  const setSegmentAngleType = (id, angleType) => {
    // Vignette has no subject — drop one if it was set switching away from
    // Promo/Confrontation. Confrontation needs a subject, but leaves it
    // for the player to pick rather than guessing one. hypeTargetId only
    // means anything on a Vignette, so it's cleared leaving one.
    updateSegment(id, (s) => ({ ...s, angleType, team2: angleType === "vignette" ? [null] : s.team2, hypeTargetId: angleType === "vignette" ? s.hypeTargetId : null }));
  };
  const setSegmentHypeTarget = (id, hypeTargetId) => updateSegment(id, (s) => ({ ...s, hypeTargetId }));
  const setSegmentType = (id, type) => {
    updateSegment(id, (s) => {
      if (type === "triple" || type === "fatal4") {
        return { ...s, type, team1: [s.team1[0], s.team1[1] || null, s.team1[2] || null, s.team1[3] || null], team2: [], titleId: null, winnerOverride: null, winMethodOverride: null };
      }
      return { ...s, type, team1: [s.team1[0], type === "tag" ? s.team1[1] : null, null, null], team2: [s.team2[0], type === "tag" ? s.team2[1] : null], titleId: null, winnerOverride: null, winMethodOverride: null };
    });
  };
  const setSegmentMember = (id, side, memberIdx, wrestler) => {
    updateSegment(id, (s) => {
      const team = [...s[side]];
      team[memberIdx] = wrestler;
      // If the primary changes and now belongs to a stable that excludes the current partner, clear the partner.
      if (memberIdx === 0 && team[1]) {
        const stable = wrestler ? stableOf(wrestler.name) : null;
        if (stable && !stable.members.includes(team[1].name)) team[1] = null;
      }
      return { ...s, [side]: team, titleId: null, winnerOverride: null, winMethodOverride: null };
    });
  };
  const setSegmentTitle = (id, titleId) => updateSegment(id, (s) => ({ ...s, titleId, n1cTitleId: titleId ? null : s.n1cTitleId }));
  const setSegmentSpecialty = (id, specialtyId) => updateSegment(id, (s) => ({ ...s, specialtyId }));
  const setSegmentN1C = (id, n1cTitleId) => updateSegment(id, (s) => ({ ...s, n1cTitleId, titleId: n1cTitleId ? null : s.titleId }));
  const setSegmentLoserLeaves = (id, loserLeaves) => updateSegment(id, (s) => ({ ...s, loserLeaves }));
  const setSegmentMinutes = (id, minutes) => updateSegment(id, (s) => ({ ...s, minutes: clamp(minutes, SEGMENT_MIN_MINUTES, SEGMENT_MAX_MINUTES) }));
  const setSegmentWinner = (id, name) => updateSegment(id, (s) => ({ ...s, winnerOverride: name }));
  const setSegmentWinMethod = (id, method) => updateSegment(id, (s) => ({ ...s, winMethodOverride: method }));
  const setSegmentPurpose = (id, purposeId) => updateSegment(id, (s) => ({ ...s, purposeId }));
  const setSegmentStory = (id, storyId) => updateSegment(id, (s) => ({ ...s, storyId }));
  const setSegmentCustomName = (id, customName) => updateSegment(id, (s) => ({ ...s, customName }));
  const setSegmentScript = (id, script) => updateSegment(id, (s) => ({ ...s, script }));

  // Dark matches resolve the same way a segment does — the moment both
  // sides are filled, roll a winner (for flavor text only; it never touches
  // win/loss records, rankings, or the show rating) using the same
  // ability-scaled odds as a real match.
  const resolveDarkMatchResult = (d) => {
    if (!d.a || !d.b) return null;
    const probA = attrOf(d.a) / (attrOf(d.a) + attrOf(d.b));
    return { a: d.a, b: d.b, winner: Math.random() < probA ? d.a.name : d.b.name };
  };
  const updateDarkMatch = (id, fn) => {
    setDarkMatches((prev) => prev.map((d) => {
      if (d.id !== id) return d;
      const updated = fn(d);
      return { ...updated, result: resolveDarkMatchResult(updated) };
    }));
  };
  const addDarkMatch = (timing) => setDarkMatches((prev) => (prev.filter((d) => d.timing === timing).length >= DARK_MATCH_CAP_PER_TIMING ? prev : [...prev, makeDarkMatch(timing)]));
  const removeDarkMatch = (id) => setDarkMatches((prev) => prev.filter((d) => d.id !== id));
  const setDarkMatchMember = (id, side, wrestler) => updateDarkMatch(id, (d) => ({ ...d, [side]: wrestler }));

  // Shared across the main card AND dark matches — someone working a dark
  // match is off the board for the card and vice versa, since the whole
  // point is reps for people NOT on tonight's rated card.
  const usedNames = new Set([
    ...segments.flatMap((s) => [...s.team1, ...s.team2]).filter(Boolean).map((w) => w.name),
    ...darkMatches.flatMap((d) => [d.a, d.b]).filter(Boolean).map((w) => w.name),
  ]);
  // A Developmental show never gets the bigger rooms, however big the company —
  // it's a lower-profile card by design, not a cost-saving version of the same show.
  const DEVELOPMENTAL_MAX_ARENA_IDX = 1;
  const arenaLocked = TIER_RANK[popularityTier(popularity)] < TIER_RANK[arena.minTier] || (showLevel === "developmental" && arenaIdx > DEVELOPMENTAL_MAX_ARENA_IDX);
  const totalShowMinutes = segments.reduce((sum, s) => sum + s.minutes, 0);
  const readyToRun = !gameOver && !arenaLocked && segments.some((s) => isSegmentComplete(s)) && !!city;

  // Projected Show Costs panel — same cost components runShow() actually
  // charges (booking fee, specialty upcharges, freelance fees), computed
  // ahead of time from what's currently booked so the booker can see the
  // bill before hitting Run the Show. Weekly roster payroll is shown too,
  // for context, but it's charged regardless of this specific show.
  const projectedSpecialtyCost = segments.reduce((sum, s) => {
    if (!s.specialtyId) return sum;
    const specialty = SPECIALTY_MATCHES.find((sp) => sp.id === s.specialtyId);
    return sum + (specialty ? specialty.cost : 0);
  }, 0);
  const projectedFreelancerNames = new Set(
    segments.flatMap((s) => [...s.team1, ...s.team2]).filter(Boolean).filter((w) => w.contractedTo === null).map((w) => w.name)
  );
  const projectedFreelanceCost = bookable.filter((w) => projectedFreelancerNames.has(w.name)).reduce((sum, w) => sum + (w.perUseFee ?? baseFreelanceFee(w)), 0);
  const projectedAgreementNames = new Set(
    segments.flatMap((s) => [...s.team1, ...s.team2]).filter(Boolean).filter((w) => workingAgreements.includes(w.contractedTo)).map((w) => w.name)
  );
  const projectedAgreementCost = bookable.filter((w) => projectedAgreementNames.has(w.name)).reduce((sum, w) => sum + agreementTalentFee(w), 0);
  const projectedPayroll = roster.reduce((sum, w) => sum + weeklyWage(w), 0);
  // Touring abroad costs real money to actually get there — flights, freight,
  // customs — on top of whatever the venue itself costs.
  const travelSurcharge = FOREIGN_CITIES.includes(city) ? Math.round(arena.cost * FOREIGN_TRAVEL_SURCHARGE_FRAC) : 0;
  const projectedShowCost = arena.cost + travelSurcharge + activeAdCampaign.cost + projectedSpecialtyCost + projectedFreelanceCost + projectedAgreementCost;

  const cityPop = city ? cityPopularity[city] : popularity;
  // Price always thins the crowd (multiplicative, so it matters at any popularity level),
  // and city score raises the ceiling — a high enough score projects close to a sellout
  // even before the ±10% random swing gets applied on the night. Who's actually in the
  // Main Event matters too — real drawing power there swings the crowd up to ±25%.
  const priceFrac = (ticketPrice - arena.ticketMin) / (arena.ticketMax - arena.ticketMin || 1);
  const priceMultiplier = 1 - priceFrac * 0.6; // 1.0 at cheapest, 0.4 at most expensive
  const mainSegmentForDraw = segments.length > 0 ? segments[segments.length - 1] : null;
  const mainDrawParticipants = mainSegmentForDraw ? [...(mainSegmentForDraw.team1 || []).filter(Boolean), ...(mainSegmentForDraw.team2 || []).filter(Boolean)] : [];
  const mainDrawAvg = mainDrawParticipants.length ? mainDrawParticipants.reduce((s, w) => s + (w.drawPower ?? 50), 0) / mainDrawParticipants.length : 50;
  const drawFactor = 1 + ((mainDrawAvg - 50) / 100) * 0.5;
  const baseFrac = 0.1 + (cityPop / 100) * 0.85; // 0.1 floor rising to 0.95 ceiling as score climbs
  const demandFrac = Math.max(0.05, Math.min(1, baseFrac * priceMultiplier * drawFactor * activeAdCampaign.attendanceMult));
  const projectedAttendance = Math.round(arena.crowdMin + (arena.crowdMax - arena.crowdMin) * demandFrac);

  // skipShow advances a week with no show booked — used by the Calendar's
  // "Advance without a show" action. Wages, loan payments, rival-promotion
  // activity, aging, injury recovery, and title inactivity all still tick
  // forward exactly as they would after a real show; only this week's own
  // attendance/revenue/rating/city-growth/history are skipped, since there's
  // no show to generate them from.
  const runShow = (skipShow = false) => {
    setRunning(true);
    setShowResult(null);
    setRunShowError(null);
    setTimeout(() => {
      try {
      const showRan = !skipShow;
      // True once nothing else is left due this calendar week — only then do
      // the weekly-cadence costs and ticks (payroll, staff/production upkeep,
      // loan payment, aging, the rival-world simulation, bidding wars, …) fire
      // and the week itself actually advances. A skip always counts as the
      // last show of the week, same as it always has.
      const isLastShowOfWeek = skipShow || otherDueTemplatesThisWeek.length === 0;
      // Every segment already resolved incrementally as it was booked (see
      // resolveSegmentResult) — Start Show just collects what's already
      // decided, then recomputes which matches count toward the repeat-
      // booking staleness check the same way the old code did (only plain
      // 1v1/tag matches, never scrambles or segments). A skipped week never
      // reads the in-progress draft card — whatever's half-booked stays put
      // for next week, untouched.
      const matches = showRan ? segments.map((s) => s.result).filter(Boolean) : [];
      // Dark matches never feed into the rated card — no rating, no time
      // budget, no wins/losses — they only exist to get an off-card body
      // some reps. Like the card itself, a skipped week doesn't run them.
      const darkMatchResults = showRan ? darkMatches.map((d) => d.result).filter(Boolean) : [];
      const thisShowMatchupKeys = matches
        .filter((m) => m.format === "match" && !m.isMultiMan)
        .map((m) => [...m.team1.map((w) => w.name), ...m.team2.map((w) => w.name)].sort().join("|"));

      const attendance = showRan ? Math.max(0, Math.round(projectedAttendance * (0.9 + Math.random() * 0.2))) : 0;
      const revenue = attendance * ticketPrice;
      // Exclusive roster is billed a standing weekly wage regardless of whether they're
      // on this week's card. Per-use freelancers only cost their fee when actually booked —
      // a dark-match-only freelancer still needs paying to show up and work. On a week
      // with more than one show, that wage is charged once (on the last show of the
      // week), not once per show.
      const payroll = isLastShowOfWeek ? roster.reduce((sum, w) => sum + weeklyWage(w), 0) : 0;
      const freelancersUsed = new Set([
        ...matches.flatMap((m) => (m.format === "segment" ? [m.performer, ...(m.subject ? [m.subject] : [])] : [...m.team1, ...m.team2])).filter((w) => w.contractedTo === null).map((w) => w.name),
        ...darkMatchResults.flatMap((d) => [d.a, d.b]).filter((w) => w.contractedTo === null).map((w) => w.name),
      ]);
      const freelanceCost = pool.filter((w) => freelancersUsed.has(w.name)).reduce((sum, w) => sum + (w.perUseFee ?? baseFreelanceFee(w)), 0);
      // A working agreement's "free" guest talent still costs a discounted
      // loan fee per booking — the partner promotion is still paying that
      // wrestler's own wage regardless of who used them this week.
      const agreementTalentUsed = new Set([
        ...matches.flatMap((m) => (m.format === "segment" ? [m.performer, ...(m.subject ? [m.subject] : [])] : [...m.team1, ...m.team2])).filter((w) => workingAgreements.includes(w.contractedTo)).map((w) => w.name),
        ...darkMatchResults.flatMap((d) => [d.a, d.b]).filter((w) => workingAgreements.includes(w.contractedTo)).map((w) => w.name),
      ]);
      const agreementCost = pool.filter((w) => agreementTalentUsed.has(w.name)).reduce((sum, w) => sum + agreementTalentFee(w), 0);
      const wrestlerPay = payroll + freelanceCost + agreementCost;
      const news = NEWS_EVENTS[rand(0, NEWS_EVENTS.length - 1)];
      const specialtyCost = matches.reduce((s, m) => s + (m.specialty ? m.specialty.cost : 0), 0);

      // TV network pays per estimated viewer; sponsor pays a flat weekly fee. Both
      // lapse automatically once their deal's week count runs out.
      // A deal attached to a specific event template only pays out the week
      // that exact show airs — an unattached (general) deal pays once per
      // calendar week (on the week's last show) instead, same weekly framing
      // as the sponsor fee below.
      const networkActive = networkDeal && weekNumber < networkDeal.expiresWeek
        && (networkDeal.eventTemplateId ? (showRan && activeEventTemplate?.id === networkDeal.eventTemplateId) : isLastShowOfWeek);
      const networkViewers = networkActive ? Math.round(popularity * networkDeal.viewerMult) : 0;
      const networkIncome = networkActive ? Math.round(networkViewers * networkDeal.payPerViewer * PRODUCTION_TIERS[productionTier].tvMult) : 0;
      const sponsorActive = sponsorDeal && weekNumber < sponsorDeal.expiresWeek;
      const sponsorIncome = (isLastShowOfWeek && sponsorActive) ? sponsorDeal.weeklyPay : 0;

      const loanPayment = isLastShowOfWeek ? (loan ? loan.weeklyPayment : 0) : 0;
      let profit = revenue - (showRan ? arena.cost + travelSurcharge + activeAdCampaign.cost : 0) - wrestlerPay - specialtyCost - loanPayment - (isLastShowOfWeek ? staffWeeklyPayroll : 0) - (isLastShowOfWeek ? productionWeeklyUpkeep : 0) + news.amount + networkIncome + sponsorIncome;
      const matchLikeRatings = matches.map((m) => m.rating);
      let fullRating = matchLikeRatings.length ? Math.round(matchLikeRatings.reduce((s, r) => s + r, 0) / matchLikeRatings.length) : 0;

      // Once you're big enough, fans expect a full card — a show that uses
      // well under its time budget at National level or above costs you
      // both rating and revenue, same spirit as the old missing-slots
      // penalty (translated from slot count to minutes, since slots no
      // longer exist) and the same maximum size (a totally empty card hits
      // exactly as hard as 5 missing slots used to: -40 rating, -£3,750).
      // None of this applies to a skipped week — there's no show to be
      // underbooked, so no penalty for not running one here either.
      const usedShowMinutes = showRan ? segments.filter((s) => s.result).reduce((sum, s) => sum + s.minutes, 0) : 0;
      const shortfallFrac = showRan ? Math.max(0, (showMinutesTarget - usedShowMinutes) / showMinutesTarget) : 0;
      let underbookedPenaltyNote = null;
      if (showRan && showLevel === "main" && shortfallFrac > 0 && TIER_RANK[popularityTier(popularity)] >= TIER_RANK.National) {
        const ratingHit = Math.round(shortfallFrac * 40);
        const cashHit = Math.round(shortfallFrac * 3750);
        fullRating = Math.max(0, fullRating - ratingHit);
        profit -= cashHit;
        underbookedPenaltyNote = `Fans expected a full ${showMinutesTarget}-minute card at your level — only using ${usedShowMinutes} min cost you £${cashHit.toLocaleString()} and knocked the show rating down.`;
      }

      // Merchandise — stock persists across shows rather than being bought fresh
      // each time. You buy inventory on the Merch page; every show sells what it
      // can from what's on hand, tracks what demand went unmet, and carries a
      // small theft risk on whatever's left in the truck overnight.
      const cityFanFactor = 0.5 + (cityPopularity[city] || 0) / 100;
      const qualityFactor = fullRating / 100;
      const merchDemandUnits = popularity >= MERCH_UNLOCK_POPULARITY ? Math.round(attendance * cityFanFactor * qualityFactor * 0.18) : 0;
      const merchQuality = MERCH_QUALITY_TIERS[merchQualityTier];
      const merchUnitsSold = Math.min(merchStock, merchDemandUnits);
      const merchMissedUnits = Math.max(0, merchDemandUnits - merchStock);
      const merchRevenue = merchUnitsSold * merchQuality.unitPrice;
      const stockAfterSale = merchStock - merchUnitsSold;
      const merchTheftUnits = stockAfterSale > 0 && Math.random() < 0.04 ? Math.round(stockAfterSale * (0.1 + Math.random() * 0.25)) : 0;
      profit += merchRevenue;

      let catastropheEntry = null;
      if (Math.random() < CATASTROPHE_CHANCE * ringCrewCatastropheFactor && bank > 0) {
        const severity = CATASTROPHE_SEVERITIES[rand(0, CATASTROPHE_SEVERITIES.length - 1)];
        const hit = Math.round(bank * severity);
        const reason = CATASTROPHE_REASONS[rand(0, CATASTROPHE_REASONS.length - 1)].replace("{company}", companyName);
        profit -= hit;
        catastropheEntry = { text: `${reason} — a loss of £${hit.toLocaleString()} (${Math.round(severity * 100)}% of company funds).`, hit };
        setHasSurvivedCatastrophe(true);
      }
      // A separate roll, only possible on a show that actually ran (no
      // crowd, no security incident) — capped at one disaster per SHOW so
      // bad luck doesn't compound into two DISASTER! banners at once; a
      // week with more than one show can still roll one at each, same as
      // running two real shows in a week realistically carries twice the risk.
      if (!catastropheEntry && showRan && Math.random() < SECURITY_INCIDENT_CHANCE * securityIncidentFactor && bank > 0) {
        const severity = CATASTROPHE_SEVERITIES[rand(0, CATASTROPHE_SEVERITIES.length - 1)];
        const hit = Math.round(bank * severity);
        const reason = SECURITY_INCIDENT_REASONS[rand(0, SECURITY_INCIDENT_REASONS.length - 1)].replace("{company}", companyName);
        profit -= hit;
        catastropheEntry = { text: `${reason} — a loss of £${hit.toLocaleString()} (${Math.round(severity * 100)}% of company funds).`, hit };
        setHasSurvivedCatastrophe(true);
      }

      setBank((b) => b + profit);
      const newBank = bank + profit;
      // Both of these count down/assess in calendar weeks, not shows — hold
      // off until whichever show is actually this week's last.
      if (isLastShowOfWeek && loan) {
        const remaining = loan.weeksRemaining - 1;
        if (remaining <= 0) {
          setLoan(null);
          setHasEverRepaidLoanFully(true);
          setUniverseFeed((feed) => [{ id: `loan-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has paid off its loan in full.`, type: "title", companyId: "player" }, ...feed].slice(0, 300));
        } else {
          setLoan((l) => (l ? { ...l, weeksRemaining: remaining } : null));
        }
      }
      if (isLastShowOfWeek) {
        if (newBank < 0) {
          setBankruptWeeks((n) => {
            const next = n + 1;
            if (next >= FIRED_THRESHOLD) setGameOver(true);
            return next;
          });
        } else {
          setBankruptWeeks(0);
        }
      }
      setPeakPopularity((p) => Math.max(p, popularity));
      // Growth gets harder the more established a city already is — running shows
      // always gives a small baseline bump (any exposure helps), but a big swing
      // from a great rating gets dampened once you're already popular there.
      // The break-even rating a show needs to clear scales up with how popular
      // you already are here — a brand-new Backyard-tier promotion only needs a
      // teens/twenties rating to grow, while a well-known city demands a real 35+.
      // None of this runs on a skipped week — no show, no city movement either
      // way (good or bad), and no city "visit" gets recorded.
      if (showRan) {
        const breakEvenRating = clamp(10 + cityPopularity[city] * 0.3, 10, 35);
        const rawCityDelta = (1 + (fullRating - breakEvenRating) * 0.08 + (networkActive ? NETWORK_POPULARITY_BOOST : 0)) * activeAdCampaign.popularityMult;
        const growthDampener = clamp(1 - Math.floor(cityPopularity[city] / 10) * 0.07, 0.3, 1);
        const growthScale = rawCityDelta > 0 ? growthDampener * rosterQualityMult : growthDampener;
        const newCityPop = clamp(cityPopularity[city] + rawCityDelta * growthScale, 0, 100);
        const newVisited = cityVisits[city] > 0 ? visitedCities : [...visitedCities, city];
        const newDiversityCap = Math.min(100, 15 + (newVisited.length - 1) * 14);
        const newOverallPopularity = Math.round(Math.min(newDiversityCap, newVisited.reduce((s, c) => s + (c === city ? newCityPop : cityPopularity[c]), 0) / newVisited.length));
        const newPlayerTier = popularityTier(newOverallPopularity);
        if (newPlayerTier !== playerLastTier) {
          setUniverseFeed((feed) => [{ id: `pt-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has ${TIER_RANK[newPlayerTier] > TIER_RANK[playerLastTier] ? "grown" : "shrunk"} to ${newPlayerTier} status!`, type: "title", companyId: "player" }, ...feed].slice(0, 300));
          setPlayerLastTier(newPlayerTier);
        }
        setCityPopularity((cp) => ({ ...cp, [city]: newCityPop }));
        setCityVisits((cv) => ({ ...cv, [city]: cv[city] + 1 }));
      }
      setFinanceHistory((fh) => [...fh, { weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), bank: newBank }]);

      const gainedTitles = {};
      const lostTitles = {};
      const titleUpdates = {};
      const titleNewsEntries = [];
      const reignCandidates = []; // [{titleName, holderNames, weeks}] — checked for longest-ever after the loop
      const newChampionNames = []; // names starting a fresh reign — tallied for most-reigns-ever
      matches.forEach((m) => {
        if (m.format !== "match" || !m.titleInfo) return;
        const title = titles.find((t) => t.id === m.titleInfo.id);
        if (!title) return;
        const winnerNames = m.winnerTeam.map((w) => w.name);
        const prestigeBump = 2 + Math.max(0, Math.round((m.rating - 50) / 10));
        if (m.titleInfo.defended) {
          const newDefenseCount = (title.currentReignDefenses || 0) + 1;
          titleUpdates[title.id] = { ...title, totalDefenses: (title.totalDefenses || 0) + 1, currentReignDefenses: newDefenseCount, prestige: clamp((title.prestige || 0) + prestigeBump, 0, 100), lastDefendedWeek: weekNumber };
          titleNewsEntries.push(`${winnerNames.join(" & ")} successfully defend${winnerNames.length === 1 ? "s" : ""} the ${title.name} — defense #${newDefenseCount}.`);
          return;
        }
        if (title.holders.length > 0) {
          title.holders.forEach((h) => { lostTitles[h] = [...(lostTitles[h] || []), title.id]; });
          titleNewsEntries.push(`TITLE CHANGE! ${winnerNames.join(" & ")} defeat${winnerNames.length === 1 ? "s" : ""} ${title.holders.join(" & ")} to become the new ${title.name}!`);
          reignCandidates.push({ titleName: title.name, holderNames: title.holders, weeks: weekNumber - title.reignStartWeek });
        } else {
          titleNewsEntries.push(`${winnerNames.join(" & ")} become${winnerNames.length === 1 ? "s" : ""} the inaugural ${title.name}!`);
        }
        winnerNames.forEach((n) => { gainedTitles[n] = [...(gainedTitles[n] || []), title.id]; newChampionNames.push(n); });
        // A short, barely-defended reign dents prestige rather than building it —
        // a title that changes hands every couple of weeks shouldn't feel more
        // prestigious just because a match happened.
        // Only a genuinely undefended reign takes a hit — since outcomes are
        // probability-based, not scripted, a champion who defends even once
        // before an upset loss shouldn't be punished for the dice not
        // cooperating. Only "won it and immediately lost it" gets penalized.
        const outgoingReignWeeks = title.reignStartWeek !== null ? weekNumber - title.reignStartWeek : null;
        const outgoingDefenses = title.currentReignDefenses || 0;
        const reignPenalty = (outgoingReignWeeks !== null && outgoingDefenses === 0) ? (outgoingReignWeeks < 2 ? -10 : outgoingReignWeeks < 4 ? -5 : 0) : 0;
        titleUpdates[title.id] = {
          ...title, holders: winnerNames, reignStartWeek: weekNumber, currentReignDefenses: 0, lastDefendedWeek: weekNumber, prestige: clamp((title.prestige || 0) + prestigeBump + reignPenalty, 0, 100),
          history: title.holders.length > 0 ? [...title.history, { holderNames: title.holders, reignWeeks: weekNumber - title.reignStartWeek, wonWeek: title.reignStartWeek, lostWeek: weekNumber, defenses: title.currentReignDefenses || 0 }] : title.history,
        };
      });
      // #1 Contender stipulation: grant the winner a guaranteed shot at the
      // chosen title, and clear out anyone who just cashed theirs in (win or
      // lose — getting the actual title match is what consumes it) so a
      // stale entry doesn't keep surfacing after it's already been used.
      const n1cGrants = {};
      const n1cClears = new Set();
      matches.forEach((m) => {
        if (m.format !== "match") return;
        if (m.n1cInfo) n1cGrants[m.n1cInfo.id] = { titleId: m.n1cInfo.id, key: m.n1cInfo.key, label: m.n1cInfo.label, wonWeek: weekNumber };
        if (m.titleInfo) [...m.team1, ...(m.team2 || [])].forEach((w) => n1cClears.add(`${m.titleInfo.id}|${w.name}`));
      });
      if (Object.keys(n1cGrants).length > 0 || n1cClears.size > 0) {
        setNumber1Contenders((list) => {
          let next = list.filter((c) => !n1cClears.has(`${c.titleId}|${c.key}`));
          Object.values(n1cGrants).forEach((g) => { next = [...next.filter((c) => c.titleId !== g.titleId), g]; });
          return next;
        });
        Object.values(n1cGrants).forEach((g) => titleNewsEntries.push(`${g.label} has earned a guaranteed shot at the ${g.name} by winning a Number One Contender match!`));
      }
      // Loser Leaves [Town/Promotion]: the losing side is released outright —
      // a storyline write-off, not a negotiated buyout, so no fee applies.
      const loserLeavesNames = new Set();
      matches.forEach((m) => { if (m.format === "match" && m.loserLeaves) (m.loserTeam || []).forEach((w) => loserLeavesNames.add(w.name)); });
      if (loserLeavesNames.size > 0) {
        setPool((p) => p.map((w) => (loserLeavesNames.has(w.name) ? { ...w, contractedTo: null, contractExpiresWeek: null, hireCooldownUntil: null } : w)));
        loserLeavesNames.forEach((n) => titleNewsEntries.push(`${n} has been released from the promotion after losing a Loser Leaves stipulation match.`));
      }

      const vacatedByInactivity = [];
      setTitles((ts) => {
        const nextTitles = ts.map((t) => {
          if (titleUpdates[t.id]) return titleUpdates[t.id];
          if (t.holders.length > 0) {
            const lastActive = t.lastDefendedWeek ?? t.reignStartWeek;
            if (lastActive !== null && weekNumber - lastActive >= TITLE_VACATE_WEEKS) {
              vacatedByInactivity.push({ name: t.name, holders: t.holders });
              return {
                ...t, holders: [], reignStartWeek: null, lastDefendedWeek: null, currentReignDefenses: 0,
                prestige: clamp((t.prestige || 0) - 8, 0, 100),
                history: [...t.history, { holderNames: t.holders, reignWeeks: weekNumber - t.reignStartWeek, wonWeek: t.reignStartWeek, lostWeek: weekNumber, defenses: t.currentReignDefenses || 0, vacatedByInactivity: true }],
              };
            }
          }
          return t;
        });
        // Posted from inside this updater — read right after setTitles(),
        // vacatedByInactivity is not guaranteed to be populated yet.
        if (vacatedByInactivity.length > 0) {
          setUniverseFeed((feed) => [...vacatedByInactivity.map((v, i) => ({ id: `vac-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: `The ${v.name} has been vacated — ${v.holders.join(" & ")} went too long without defending it.`, type: "title", companyId: "player" })), ...feed].slice(0, 300));
        }
        return nextTitles;
      });
      if (titleNewsEntries.length > 0) {
        setUniverseFeed((feed) => [...titleNewsEntries.map((text, i) => ({ id: `t-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text, type: "title", companyId: "player" })), ...feed].slice(0, 300));
      }

      // Hall of Fame — lifetime records, survive retiring and starting a new
      // promotion. Kept deliberately small: best match, biggest show, longest
      // reign, most reigns by one wrestler. Not trying to be a full stat archive.
      const bestMatchCandidate = showRan ? matches.filter((m) => m.format === "match").sort((a, b) => b.rating - a.rating)[0] : null;
      if (bestMatchCandidate && bestMatchCandidate.rating > (hallOfFame.bestMatch?.rating ?? -1)) {
        const names = [...bestMatchCandidate.team1, ...(bestMatchCandidate.team2 || [])].map((w) => w.name).join(" vs ");
        setHallOfFame((h) => ({ ...h, bestMatch: { rating: bestMatchCandidate.rating, description: names, companyName, date: scheduledDate.toISOString() } }));
      }
      if (showRan && attendance > (hallOfFame.biggestShow?.attendance ?? -1)) {
        setHallOfFame((h) => ({ ...h, biggestShow: { attendance, companyName, arena: arena.name, city, date: scheduledDate.toISOString() } }));
      }
      reignCandidates.forEach((rc) => {
        setHallOfFame((h) => (rc.weeks > (h.longestReign?.weeks ?? -1) ? { ...h, longestReign: { titleName: rc.titleName, holderNames: rc.holderNames, weeks: rc.weeks, companyName } } : h));
      });
      if (newChampionNames.length > 0) {
        setWrestlerReignCounts((counts) => {
          const next = { ...counts };
          newChampionNames.forEach((n) => { next[n] = (next[n] || 0) + 1; });
          return next;
        });
      }

      // Rivalries that got booked against each other this week: intensify, or blow off.
      const storyNewsEntries = [];
      const storyUpdates = {};
      const blownOffPairs = []; // [nameA, nameB] whose feud resolves and clears from rivals lists
      matches.forEach((m) => {
        if (!m.storyKey) return;
        const [nameA, nameB] = m.storyKey.split("|");
        const existing = storylines[m.storyKey] || { intensity: 20, matchesFought: 0 };
        const newIntensity = clamp(existing.intensity + 15, 0, 100);
        const blowsOff = newIntensity >= 80 && Math.random() < 0.4;
        if (blowsOff) {
          blownOffPairs.push([nameA, nameB]);
          storyUpdates[m.storyKey] = { intensity: 0, matchesFought: existing.matchesFought + 1 };
          storyNewsEntries.push(`STORYLINE BLOWOFF! ${m.winnerTeam[0].name} finally puts the rivalry with ${m.loserTeam[0].name} to rest in a war rated ${m.rating}.`);
        } else {
          storyUpdates[m.storyKey] = { intensity: newIntensity, matchesFought: existing.matchesFought + 1 };
          storyNewsEntries.push(`The rivalry between ${nameA} and ${nameB} intensifies after another battle tonight.`);
        }
      });
      if (Object.keys(storyUpdates).length > 0) setStorylines((s) => ({ ...s, ...storyUpdates }));
      if (storyNewsEntries.length > 0) {
        setUniverseFeed((feed) => [...storyNewsEntries.map((text, i) => ({ id: `s-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text, type: "title" })), ...feed].slice(0, 300));
      }
      const clearRivalry = (w) => {
        const pair = blownOffPairs.find(([a, b]) => a === w.name || b === w.name);
        if (!pair) return w;
        const other = pair[0] === w.name ? pair[1] : pair[0];
        return { ...w, rivals: w.rivals.filter((n) => n !== other) };
      };

      // A promo aimed at someone: smaller effect than an actual match, and no
      // physical cost — nudges an existing feud, or can spark a brand new one.
      // A Confrontation swings the same storyline harder — two people actually
      // stood face to face — and harder still if it boiled over into a brawl.
      const segmentNewsEntries = [];
      const segmentStoryUpdates = {};
      const segmentNewRivalNames = []; // [performerName, subjectName] pairs to add to each other's rivals
      matches.forEach((m) => {
        if (m.format !== "segment" || !m.subject) return;
        const key = [m.performer.name, m.subject.name].sort().join("|");
        const alreadyRivals = m.performer.rivals.includes(m.subject.name) && m.subject.rivals.includes(m.performer.name);
        const isConfrontation = m.angleType === "confrontation";
        const intensityGain = isConfrontation ? (m.brawl ? 18 : 10) : 5;
        const startIntensity = isConfrontation ? 25 : 15;
        if (alreadyRivals) {
          const existing = storylines[key] || { intensity: 20, matchesFought: 0 };
          segmentStoryUpdates[key] = { intensity: clamp(existing.intensity + intensityGain, 0, 100), matchesFought: existing.matchesFought };
          segmentNewsEntries.push(isConfrontation
            ? `${m.performer.name} and ${m.subject.name} go face to face${m.brawl ? " and it turns physical" : ""}, keeping the rivalry hot.`
            : `${m.performer.name} calls out ${m.subject.name} on the mic, keeping the rivalry hot.`);
        } else {
          segmentNewRivalNames.push([m.performer.name, m.subject.name]);
          segmentStoryUpdates[key] = { intensity: startIntensity, matchesFought: 0 };
          segmentNewsEntries.push(isConfrontation
            ? `${m.performer.name} and ${m.subject.name} come face to face${m.brawl ? " and it turns physical" : ""}, sparking a new rivalry.`
            : `${m.performer.name} calls out ${m.subject.name}, sparking a new rivalry.`);
        }
      });
      if (Object.keys(segmentStoryUpdates).length > 0) setStorylines((s) => ({ ...s, ...segmentStoryUpdates }));
      if (segmentNewsEntries.length > 0) {
        setUniverseFeed((feed) => [...segmentNewsEntries.map((text, i) => ({ id: `seg-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text, type: "title" })), ...feed].slice(0, 300));
      }
      if (segmentNewRivalNames.length > 0) {
        setPool((p) => p.map((w) => {
          const pair = segmentNewRivalNames.find(([a, b]) => a === w.name || b === w.name);
          if (!pair) return w;
          const other = pair[0] === w.name ? pair[1] : pair[0];
          return { ...w, rivals: [...new Set([...w.rivals, other])] };
        }));
      }

      // Same treatment for tag team (stable) rivalries.
      const stableStoryNewsEntries = [];
      const stableStoryUpdates = {};
      const blownOffStablePairs = [];
      matches.forEach((m) => {
        if (!m.stableStoryKey) return;
        const [idA, idB] = m.stableStoryKey.split("|");
        const sA = stables.find((s) => s.id === idA), sB = stables.find((s) => s.id === idB);
        const winnerStable = m.winnerTeam.every((w) => sA && [sA.members[0], sA.members[1]].includes(w.name)) ? sA : sB;
        const loserStable = winnerStable === sA ? sB : sA;
        const existing = stableStorylines[m.stableStoryKey] || { intensity: 20, matchesFought: 0 };
        const newIntensity = clamp(existing.intensity + 15, 0, 100);
        const blowsOff = newIntensity >= 80 && Math.random() < 0.4;
        if (blowsOff) {
          blownOffStablePairs.push([idA, idB]);
          stableStoryUpdates[m.stableStoryKey] = { intensity: 0, matchesFought: existing.matchesFought + 1 };
          stableStoryNewsEntries.push(`STORYLINE BLOWOFF! ${winnerStable?.name} finally puts the rivalry with ${loserStable?.name} to rest in a war rated ${m.rating}.`);
        } else {
          stableStoryUpdates[m.stableStoryKey] = { intensity: newIntensity, matchesFought: existing.matchesFought + 1 };
          stableStoryNewsEntries.push(`The rivalry between ${sA?.name} and ${sB?.name} intensifies after another battle tonight.`);
        }
      });
      if (Object.keys(stableStoryUpdates).length > 0) setStableStorylines((s) => ({ ...s, ...stableStoryUpdates }));
      if (stableStoryNewsEntries.length > 0) {
        setUniverseFeed((feed) => [...stableStoryNewsEntries.map((text, i) => ({ id: `ss-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text, type: "title", companyId: "player" })), ...feed].slice(0, 300));
      }
      if (blownOffStablePairs.length > 0) {
        setStables((ss) => ss.map((s) => {
          const pair = blownOffStablePairs.find(([a, b]) => a === s.id || b === s.id);
          if (!pair) return s;
          const other = pair[0] === s.id ? pair[1] : pair[0];
          return { ...s, rivalStableIds: (s.rivalStableIds || []).filter((id) => id !== other) };
        }));
      }

      const applyTitleChanges = (w) => {
        const gained = gainedTitles[w.name] || [];
        const lost = lostTitles[w.name] || [];
        if (gained.length === 0 && lost.length === 0) return w;
        const holdsTitles = [...new Set([...(w.holdsTitles || []).filter((id) => !lost.includes(id)), ...gained])];
        const happinessDelta = gained.length * 10 - lost.length * 8;
        return { ...w, holdsTitles, titleReigns: w.titleReigns + gained.length, happiness: clamp(w.happiness + happinessDelta, 0, 100) };
      };

      // Track the record of each stable's core tag team (its first two members)
      // whenever that exact pairing competes together.
      const stableUpdates = {};
      matches.forEach((m) => {
        if (m.format !== "match" || !m.isTag) return;
        [m.team1, m.team2].forEach((team) => {
          if (team.length !== 2) return;
          const won = m.winnerTeam === team;
          const names = team.map((w) => w.name);
          const coreStable = stables.find((s) => s.members.length >= 2 && names.includes(s.members[0]) && names.includes(s.members[1]));
          if (!coreStable) return;
          const existing = stableUpdates[coreStable.id] || { matches: coreStable.matches, wins: coreStable.wins, losses: coreStable.losses };
          stableUpdates[coreStable.id] = { matches: existing.matches + 1, wins: existing.wins + (won ? 1 : 0), losses: existing.losses + (won ? 0 : 1) };
        });
      });
      if (Object.keys(stableUpdates).length > 0) {
        setStables((ss) => ss.map((s) => (stableUpdates[s.id] ? { ...s, ...stableUpdates[s.id] } : s)));
      }

      // Rival-world simulation, deals, and bidding wars all run on a weekly
      // cadence, not a per-show one — holding off until isLastShowOfWeek
      // keeps a two-show week from giving rivals two turns, rolling two
      // bidding-war weeks, offering two fresh TV/sponsor deals, and so on.
      // rivalShowUsage/rivalMatchOutcomes/rivalFreelanceBookings are read
      // again much further down (the per-wrestler pool pass), so they're
      // declared out here rather than scoped to the block below.
      let rivalShowUsage = new Set();
      let rivalMatchOutcomes = {};
      let rivalFreelanceBookings = {}; // wrestler name -> company id that booked them this week
      if (isLastShowOfWeek) {
      const rivalNewsEntries = [];
      const rivalPoolUpdates = {};
      const rivalTitleUpdates = {};
      const rivalStaffUpdates = {}; // staff candidate id -> {contractedTo, contractExpiresWeek}
      // Computed as a plain loop first, not inside setRivalCompanies — mutating
      // outer variables as a side effect of a state updater isn't reliable, since
      // React doesn't guarantee exactly when that function body runs relative to
      // the code right after it. This was very likely why hiring/crowning silently
      // failed to apply even though showsRun kept climbing.
      const newRivalCompanies = rivalCompanies.map((co) => {
        // Acquired companies are yours now — no more independent hiring,
        // firing, title drama, or popularity drift for them.
        if (co.acquired) return co;
        // Symmetric drift (no permanent upward bias like before), damped further
        // as they approach the top — much harder to keep climbing near 100,
        // exactly like the player's own city growth curve.
        const rawDrift = rand(-3, 3);
        const drift = rawDrift > 0 ? rawDrift * (1 - co.popularity / 120) : rawDrift;
        let newPop = clamp(co.popularity + drift, 0, 100);
        // Real economics: income scales with popularity (bigger draw = more gate/
        // merch revenue), payroll is the actual weekly wage of everyone they have
        // signed — a company that oversigns relative to its popularity will bleed
        // funds and eventually need to trim its roster, same as it would for you.
        const signedRosterNow = pool.filter((w) => w.contractedTo === co.id);
        const weeklyPayroll = signedRosterNow.reduce((sum, w) => sum + weeklyWage(w), 0);
        const weeklyIncome = Math.round(co.popularity * 1500 + rand(-3000, 5000));
        const signedStaffNow = staffPool.filter((s) => s.contractedTo === co.id);
        const staffPayroll = signedStaffNow.reduce((sum, s) => sum + staffWeeklyWage(s.skill), 0);
        let newFunds = clamp(co.funds + weeklyIncome - weeklyPayroll - staffPayroll, 0, 5000000);
        let signedNow = pool.filter((w) => w.contractedTo === co.id && !rivalPoolUpdates[w.name]);
        let freelancers = pool.filter((w) => w.contractedTo === null && !rivalPoolUpdates[w.name] && !w.injuryWeeksRemaining);
        const title = rivalTitles.find((t) => t.companyId === co.id);

        // Guaranteed floor: a company that's been running 5+ weeks with fewer
        // than 2 signed wrestlers force-signs from the freelance pool. This
        // isn't RNG-gated — talent-starved companies were a real dead end
        // without it, no matter how the weekly hire roll was tuned.
        if (co.showsRun >= 5 && signedNow.length < 2 && freelancers.length > 0) {
          const needed = Math.min(2 - signedNow.length, freelancers.length);
          const forced = [...freelancers].sort(() => Math.random() - 0.5).slice(0, needed);
          forced.forEach((w) => {
            rivalPoolUpdates[w.name] = { contractedTo: co.id, contractExpiresWeek: weekNumber + 52 };
            rivalNewsEntries.push({ text: `${co.name} has signed ${w.name} to a new exclusive contract.`, companyId: co.id });
          });
          signedNow = [...signedNow, ...forced];
          freelancers = freelancers.filter((w) => !forced.includes(w));
        }

        // Hiring runs on its own independent roll — real competition for talent,
        // not something that only happens when the fire/title dice miss.
        if (Math.random() < 0.2 && freelancers.length > 0) {
          const w = freelancers[rand(0, freelancers.length - 1)];
          rivalPoolUpdates[w.name] = { contractedTo: co.id, contractExpiresWeek: weekNumber + 52 };
          rivalNewsEntries.push({ text: `${co.name} has signed ${w.name} to a new exclusive contract.`, companyId: co.id });
          signedNow = [...signedNow, w];
          freelancers = freelancers.filter((x) => x.name !== w.name);
        }

        // Every rival runs its own Training School — a small independent
        // chance each week to bring in a raw prospect, flagged developmental
        // instead of main roster and trained up the same way the player's
        // own Developmental system works (see the per-wrestler growth pass).
        const prospectPool = freelancers.filter((w) => w.age <= 25 && potentialOf(w) - avgStats(w) >= 10);
        if (Math.random() < 0.1 && prospectPool.length > 0) {
          const w = prospectPool[rand(0, prospectPool.length - 1)];
          rivalPoolUpdates[w.name] = { contractedTo: co.id, contractExpiresWeek: weekNumber + 52, rosterLevel: "developmental" };
          rivalNewsEntries.push({ text: `${co.name} has brought in ${w.name} as a prospect for their training school.`, companyId: co.id });
          signedNow = [...signedNow, w];
        }

        // A company that can't even cover this week's payroll makes an emergency
        // cut rather than just running deeper into the red indefinitely.
        if (newFunds <= 0 && weeklyPayroll > 0 && signedRosterNow.length > 0) {
          const w = signedRosterNow[rand(0, signedRosterNow.length - 1)];
          rivalPoolUpdates[w.name] = { contractedTo: null, contractExpiresWeek: null };
          rivalNewsEntries.push({ text: `${co.name} is in financial trouble and has released ${w.name} to cut costs.`, companyId: co.id });
          if (title && title.holder === w.name) rivalTitleUpdates[title.id] = null;
        }

        // Safeguard: a company running for a few weeks with signed talent shouldn't
        // sit on a vacant title forever just because the dice didn't cooperate.
        const financialStrain = weeklyPayroll > weeklyIncome * 1.3; // spending well beyond their means
        if (title && title.holder === null && co.showsRun >= 3 && signedNow.length > 0) {
          const w = signedNow[rand(0, signedNow.length - 1)];
          rivalTitleUpdates[title.id] = w.name;
          rivalNewsEntries.push({ text: `${w.name} is crowned the first ${title.name}!`, companyId: co.id });
        } else if (Math.random() < (financialStrain ? 0.5 : 0.3)) {
          const roll = Math.random();
          const releaseChance = financialStrain ? 0.75 : 0.5;
          if (roll < releaseChance && signedNow.length > 0) {
            const w = signedNow[rand(0, signedNow.length - 1)];
            rivalPoolUpdates[w.name] = { contractedTo: null, contractExpiresWeek: null };
            rivalNewsEntries.push({ text: `${w.name} has been released by ${co.name}.`, companyId: co.id });
            if (title && title.holder === w.name) rivalTitleUpdates[title.id] = null;
          } else if (title && signedNow.length > 0) {
            const w = signedNow[rand(0, signedNow.length - 1)];
            rivalTitleUpdates[title.id] = w.name;
            rivalNewsEntries.push({ text: title.holder === w.name ? `${w.name} retains the ${title.name}.` : `${w.name} is the new ${title.name}!`, companyId: co.id });
          }
        }

        // Staff — real competition for the same shared candidate pool the
        // player hires from, not just a popularity formula. A company fills
        // an open role on its own independent roll (richer, more popular
        // ones reach for the better candidate), and can just as easily lose
        // someone to burnout, budget cuts, or getting poached elsewhere.
        const openStaffRoles = STAFF_ROLES.filter((r) => !signedStaffNow.some((s) => s.role === r.key && !rivalStaffUpdates[s.id]));
        if (openStaffRoles.length > 0 && Math.random() < 0.1) {
          const role = openStaffRoles[rand(0, openStaffRoles.length - 1)];
          const freeCandidates = staffPool.filter((s) => s.role === role.key && s.contractedTo === null && !rivalStaffUpdates[s.id]);
          if (freeCandidates.length > 0) {
            const sortedBySkill = [...freeCandidates].sort((a, b) => b.skill - a.skill);
            const reach = Math.min(sortedBySkill.length - 1, Math.round((co.popularity / 100) * (sortedBySkill.length - 1)));
            const pick = sortedBySkill[rand(0, reach)];
            rivalStaffUpdates[pick.id] = { contractedTo: co.id, contractExpiresWeek: weekNumber + 52 };
            rivalNewsEntries.push({ text: `${co.name} has hired ${pick.name} as ${role.label}.`, companyId: co.id });
          }
        } else if (signedStaffNow.length > 0 && Math.random() < (financialStrain ? 0.12 : 0.05)) {
          const leaving = signedStaffNow.filter((s) => !rivalStaffUpdates[s.id]);
          if (leaving.length > 0) {
            const s = leaving[rand(0, leaving.length - 1)];
            rivalStaffUpdates[s.id] = { contractedTo: null, contractExpiresWeek: null };
            rivalNewsEntries.push({ text: `${s.name} has left ${co.name}'s staff.`, companyId: co.id });
          }
        }

        const newTier = popularityTier(newPop);
        if (newTier !== co.lastTier) {
          rivalNewsEntries.push({ text: `${co.name} has ${TIER_RANK[newTier] > TIER_RANK[co.lastTier] ? "grown" : "shrunk"} to ${newTier} status!`, companyId: co.id });
        }
        return { ...co, popularity: newPop, funds: newFunds, showsRun: co.showsRun + 1, lastTier: newTier };
      });
      setRivalCompanies(newRivalCompanies);
      // One snapshot per company per week — feeds the funds/popularity trend
      // charts on their profile, same idea as the player's own financeHistory.
      setRivalFinanceHistory((h) => [
        ...h,
        { companyId: "player", weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), funds: bank, popularity },
        ...newRivalCompanies.filter((co) => !co.acquired).map((co) => ({ companyId: co.id, weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), funds: co.funds, popularity: co.popularity })),
      ].slice(-2000));
      if (Object.keys(rivalPoolUpdates).length > 0) setPool((p) => p.map((w) => (rivalPoolUpdates[w.name] ? { ...w, ...rivalPoolUpdates[w.name] } : w)));
      if (Object.keys(rivalStaffUpdates).length > 0) setStaffPool((sp) => sp.map((s) => (rivalStaffUpdates[s.id] ? { ...s, ...rivalStaffUpdates[s.id] } : s)));
      const rivalReignCandidates = [];
      if (Object.keys(rivalTitleUpdates).length > 0) {
        setRivalTitles((ts) => {
          const nextRivalTitles = ts.map((t) => {
            if (!(t.id in rivalTitleUpdates)) return t;
            const newHolder = rivalTitleUpdates[t.id];
            if (newHolder === t.holder) return t; // retained, reign continues unbroken
            if (t.holder && t.reignStartWeek !== null) {
              rivalReignCandidates.push({ titleName: t.name, holderNames: [t.holder], weeks: weekNumber - t.reignStartWeek, companyName: RIVAL_COMPANIES.find((c) => c.id === t.companyId)?.name || t.name });
            }
            return { ...t, holder: newHolder, reignStartWeek: newHolder ? weekNumber : null };
          });
          // Posted from inside this updater — read right after setRivalTitles(),
          // rivalReignCandidates is not guaranteed to be populated yet.
          rivalReignCandidates.forEach((rc) => {
            setHallOfFame((h) => (rc.weeks > (h.longestReignRival?.weeks ?? -1) ? { ...h, longestReignRival: rc } : h));
          });
          return nextRivalTitles;
        });
      }
      if (rivalNewsEntries.length > 0) {
        setUniverseFeed((feed) => [...rivalNewsEntries.map((e, i) => ({ id: `rv-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: e.text, type: "rival", companyId: e.companyId })), ...feed].slice(0, 300));
      }

      // --- Exclusive-contract bidding wars --------------------------------
      // An open war can pick up extra bidders, a contract nearing expiry can
      // turn into a brand new one, and anything whose window has closed
      // gets settled — all on this same weekly tick, same as everything
      // else above. See NEGOTIATION_WEEKS/RENEWAL_WINDOW_WEEKS/offerAppeal.
      {
        const biddingNewsEntries = [];
        let nextPendingOffers = pendingOffers;

        // 1) A bidder may notice an already-open war and jump in — bigger
        //    names draw more outside interest.
        nextPendingOffers = nextPendingOffers.map((entry) => {
          if (weekNumber >= entry.resolveWeek) return entry; // resolving below, leave it alone here
          const w = pool.find((p) => p.name === entry.wrestlerName);
          if (!w) return entry;
          const biddingCompanies = new Set(entry.offers.map((o) => o.companyId));
          const eligibleRivals = rivalCompanies.filter((co) => !co.acquired && !biddingCompanies.has(co.id) && co.id !== w.contractedTo);
          if (eligibleRivals.length === 0 || Math.random() >= BIDDING_WAR_JOIN_CHANCE * (attrOf(w) / 100)) return entry;
          const co = eligibleRivals[rand(0, eligibleRivals.length - 1)];
          biddingNewsEntries.push({ text: `${co.name} has entered the bidding to sign ${w.name}.`, companyId: co.id });
          return { ...entry, offers: [...entry.offers, { companyId: co.id, wageMult: 0.9 + Math.random() * 0.5, contractWeeks: rand(26, 78) }] };
        });

        // 2) Contracts entering their last RENEWAL_WINDOW_WEEKS become
        //    poachable — a rival quietly lines up an offer that only matters
        //    if nobody re-signs them before the current deal actually lapses.
        pool.forEach((w) => {
          if (w.contractedTo === null || !w.contractExpiresWeek) return;
          const weeksLeft = w.contractExpiresWeek - weekNumber;
          if (weeksLeft < 0 || weeksLeft > RENEWAL_WINDOW_WEEKS) return;
          if (nextPendingOffers.some((e) => e.wrestlerName === w.name)) return;
          const eligibleRivals = rivalCompanies.filter((co) => !co.acquired && co.id !== w.contractedTo);
          if (eligibleRivals.length === 0 || Math.random() >= RENEWAL_POACH_CHANCE) return;
          const co = eligibleRivals[rand(0, eligibleRivals.length - 1)];
          const incumbentName = w.contractedTo === "player" ? companyName : (rivalCompanies.find((c) => c.id === w.contractedTo)?.name || "their current promotion");
          biddingNewsEntries.push({ text: `${co.name} has been linked with a move for ${w.name} as their contract with ${incumbentName} winds down.`, companyId: co.id });
          nextPendingOffers = [...nextPendingOffers, { id: `po-${w.name}-${weekNumber}-${Date.now()}-${Math.round(Math.random() * 1e6)}`, wrestlerName: w.name, resolveWeek: w.contractExpiresWeek, offers: [{ companyId: co.id, wageMult: 0.9 + Math.random() * 0.5, contractWeeks: rand(26, 78) }] }];
        });

        // 3) Settle anything whose window has closed.
        const offerPoolUpdates = {};
        const perUseDrops = [];
        const stillPending = [];
        nextPendingOffers.forEach((entry) => {
          if (weekNumber < entry.resolveWeek) { stillPending.push(entry); return; }
          const w = pool.find((p) => p.name === entry.wrestlerName);
          if (!w) return; // released/deleted mid-negotiation — just drop it
          const incumbentId = w.contractedTo;
          const offers = [...entry.offers];
          // An incumbent who never explicitly re-offered still gets a quiet
          // standing-pat retention option — a contract doesn't just lapse
          // unnoticed by default.
          if (incumbentId && !offers.some((o) => o.companyId === incumbentId)) {
            offers.push({ companyId: incumbentId, wageMult: w.wageMultiplier || 1, contractWeeks: 26 });
          }
          const scored = offers.map((o) => {
            const companyPopularity = o.companyId === "player" ? popularity : (rivalCompanies.find((c) => c.id === o.companyId)?.popularity ?? 10);
            const companyTierKey = o.companyId === "player" ? popularityTier(popularity) : (rivalCompanies.find((c) => c.id === o.companyId)?.lastTier ?? "Unknown");
            return { ...o, companyPopularity, companyTierKey, score: offerAppeal(w, { ...o, companyId: o.companyId, companyPopularity, companyTierKey }) };
          });
          scored.sort((a, b) => b.score - a.score);
          const best = scored[0];
          if (!best || best.score < WALKAWAY_FLOOR) {
            if (incumbentId) {
              offerPoolUpdates[w.name] = { contractedTo: null, contractExpiresWeek: null };
              biddingNewsEntries.push({ text: `${w.name}'s contract has expired and they've walked away as a free agent.`, companyId: incumbentId === "player" ? "player" : incumbentId });
            }
            return;
          }
          offerPoolUpdates[w.name] = { contractedTo: best.companyId, contractExpiresWeek: weekNumber + best.contractWeeks, wageMultiplier: best.wageMult, rosterLevel: best.level || w.rosterLevel || "main", pushOverride: "pushLevel" in best ? best.pushLevel : w.pushOverride };
          if (best.companyId === "player") perUseDrops.push(w.name);
          if (incumbentId && best.companyId !== incumbentId) {
            const fromName = incumbentId === "player" ? companyName : (rivalCompanies.find((c) => c.id === incumbentId)?.name || "their old promotion");
            const toName = best.companyId === "player" ? companyName : (rivalCompanies.find((c) => c.id === best.companyId)?.name || "a rival promotion");
            biddingNewsEntries.push({ text: `${w.name} has snubbed ${fromName} to sign with ${toName}${scored.length > 2 ? " after a bidding war" : ""}.`, companyId: best.companyId === "player" ? "player" : best.companyId });
          } else if (!incumbentId) {
            const toName = best.companyId === "player" ? companyName : (rivalCompanies.find((c) => c.id === best.companyId)?.name || "a rival promotion");
            biddingNewsEntries.push({ text: `${w.name} has signed with ${toName}${scored.length > 1 ? " after a bidding war" : ""}.`, companyId: best.companyId === "player" ? "player" : best.companyId });
          }
          // else: the incumbent retained them quietly — business as usual, no news needed.
        });
        if (Object.keys(offerPoolUpdates).length > 0) setPool((p) => p.map((w) => (offerPoolUpdates[w.name] ? { ...w, ...offerPoolUpdates[w.name] } : w)));
        if (perUseDrops.length > 0) setPerUseRoster((pu) => pu.filter((n) => !perUseDrops.includes(n)));
        setPendingOffers(stillPending);
        if (biddingNewsEntries.length > 0) {
          setUniverseFeed((feed) => [...biddingNewsEntries.map((e, i) => ({ id: `bid-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: e.text, type: "rival", companyId: e.companyId })), ...feed].slice(0, 300));
        }
      }

      // Clear deals once they lapse, and occasionally roll fresh offers when you're not under contract.
      if (networkDeal && weekNumber >= networkDeal.expiresWeek) setNetworkDeal(null);
      if (sponsorDeal && weekNumber >= sponsorDeal.expiresWeek) setSponsorDeal(null);
      // Use this show's freshly-updated popularity feel — but a skipped week has
      // no show to feel good or bad about, so it falls back to plain popularity.
      const dealPopularity = showRan ? clamp(popularity + (fullRating - 50) * 0.1, 0, 100) : popularity;
      if (!networkActive && Math.random() < DEAL_OFFER_CHANCE) {
        const eligible = NETWORKS.filter((n) => dealPopularity >= n.minPopularity);
        if (eligible.length > 0) {
          const picks = [...eligible].sort(() => Math.random() - 0.5).slice(0, 2);
          setNetworkOffers(picks.map((n) => ({ ...n, weeks: rand(DEAL_LENGTH_MIN, DEAL_LENGTH_MAX) })));
        }
      }
      if (!sponsorActive && Math.random() < DEAL_OFFER_CHANCE) {
        const eligible = SPONSORS.filter((s) => dealPopularity >= s.minPopularity);
        if (eligible.length > 0) {
          const picks = [...eligible].sort(() => Math.random() - 0.5).slice(0, 2);
          setSponsorOffers(picks.map((s) => ({ ...s, weeklyPay: rand(s.payMin, s.payMax), weeks: rand(DEAL_LENGTH_MIN, DEAL_LENGTH_MAX) })));
        }
      }

      // Rival companies run real shows: pair up a few signed wrestlers — plus,
      // like you, they can pull in freelancers on a per-use basis — roll winners
      // using the same probability logic as your own card, and apply wins/losses/
      // ranking points. Freelancers aren't exclusive to anyone, so the same free
      // agent could realistically get booked by more than one promotion in a week
      // (just not the same one twice — that's tracked below).
      rivalShowUsage = new Set();
      rivalMatchOutcomes = {};
      rivalFreelanceBookings = {}; // wrestler name -> company id that booked them this week
      const takenFreelancers = new Set(freelancersUsed);
      const newRivalShowRecords = [];
      rivalCompanies.forEach((co) => {
        if (co.acquired) return;
        const hiredStaffSkills = staffPool.filter((s) => s.contractedTo === co.id).map((s) => s.skill);
        const signedRoster = pool.filter((w) => w.contractedTo === co.id && !w.injuryWeeksRemaining && !rivalPoolUpdates[w.name]);
        const availableFreelancers = pool.filter((w) => w.contractedTo === null && !w.injuryWeeksRemaining && !rivalPoolUpdates[w.name] && !takenFreelancers.has(w.name));
        let freelancePicks = [];
        if (availableFreelancers.length > 0 && Math.random() < 0.4) {
          freelancePicks = [...availableFreelancers].sort(() => Math.random() - 0.5).slice(0, Math.min(availableFreelancers.length, rand(1, 2)));
          freelancePicks.forEach((w) => { takenFreelancers.add(w.name); rivalFreelanceBookings[w.name] = co.id; });
        }
        const combined = [...signedRoster, ...freelancePicks];
        // Whether — and under which name — this company even has a show due
        // this week: a brand new (Unknown) company only runs its one small
        // show on the shared monthly cadence, not every week; everyone with
        // a weekly lineup rotates through it; National/Global additionally
        // get a guaranteed, bigger, separately-branded show on that same
        // monthly week instead of their normal weekly rotation.
        const dueShow = rivalShowDueThisWeek(co, weekNumber, isPPVWeek);
        const showChance = dueShow ? (dueShow.guaranteed ? 1 : RIVAL_SHOW_CHANCE) : 0;
        if (dueShow && combined.length >= 2 && Math.random() < showChance) {
          const shuffled = [...combined].sort(() => Math.random() - 0.5);
          const maxPairsForLength = Math.max(1, Math.round(rivalShowMinutes(co.popularity) / 30)) + (dueShow.guaranteed ? 2 : 0);
          const pairCount = Math.min(Math.floor(shuffled.length / 2), rand(1, maxPairsForLength));
          const showMatches = [];
          for (let i = 0; i < pairCount; i++) {
            const a = shuffled[i * 2], b = shuffled[i * 2 + 1];
            if (!a || !b) break;
            rivalShowUsage.add(a.name);
            rivalShowUsage.add(b.name);
            const probA = attrOf(a) / (attrOf(a) + attrOf(b));
            const aWins = Math.random() < probA;
            rivalMatchOutcomes[a.name] = { won: aWins };
            rivalMatchOutcomes[b.name] = { won: !aWins };
            // Same ability-scaled formula as your own matches — a weak rival
            // roster genuinely can't fluke a classic, same as you can't.
            const rivalAvgAttr = (attrOf(a) + attrOf(b)) / 2;
            const rivalFloor = Math.round(rivalAvgAttr * 0.25);
            const rivalSpread = Math.round(20 + rivalAvgAttr * 0.55);
            const rivalRating = Math.max(rivalFloor, Math.min(100, rivalFloor + Math.round(Math.random() * rivalSpread) + rivalStaffBonus(co.popularity, hiredStaffSkills) + (dueShow.guaranteed ? 5 : 0)));
            showMatches.push({ a: a.name, b: b.name, winner: aWins ? a.name : b.name, rating: rivalRating });
          }
          if (showMatches.length > 0) {
            const rivalAttendance = Math.max(20, Math.round(co.popularity * 40 * (dueShow.guaranteed ? 1.6 : 1) + rand(-500, 1500)));
            newRivalShowRecords.push({ id: `${co.id}-${weekNumber}`, companyId: co.id, companyName: co.name, eventName: dueShow.eventName, weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), date: scheduledDate, matches: showMatches, attendance: rivalAttendance, wasPPV: dueShow.guaranteed });
          }
        }
      });
      if (newRivalShowRecords.length > 0) {
        setRivalShowHistory((h) => [...newRivalShowRecords, ...h].slice(0, 150));
      }
      if (newRivalShowRecords.length > 0) {
        const bestRivalMatch = newRivalShowRecords.flatMap((r) => r.matches.map((m) => ({ ...m, companyName: r.companyName, date: r.date }))).sort((a, b) => b.rating - a.rating)[0];
        if (bestRivalMatch) {
          setHallOfFame((h) => (bestRivalMatch.rating > (h.bestMatchRival?.rating ?? -1) ? { ...h, bestMatchRival: { rating: bestRivalMatch.rating, description: `${bestRivalMatch.a} vs ${bestRivalMatch.b}`, companyName: bestRivalMatch.companyName, date: bestRivalMatch.date.toISOString() } } : h));
        }
        const biggestRivalShow = [...newRivalShowRecords].sort((a, b) => b.attendance - a.attendance)[0];
        if (biggestRivalShow) {
          setHallOfFame((h) => (biggestRivalShow.attendance > (h.biggestShowRival?.attendance ?? -1) ? { ...h, biggestShowRival: { attendance: biggestRivalShow.attendance, companyName: biggestRivalShow.companyName, date: biggestRivalShow.date.toISOString() } } : h));
        }
      }
      } // isLastShowOfWeek (rival-world simulation, deals, bidding wars)

      let poolWithGrowth = null;
      // Fresh free agents trickle in every 25 weeks, indefinitely — reserveNameAt
      // never runs out (see its own comment), so a decades-long save never stops
      // seeing new talent the way the old fixed-length name list used to.
      if (isLastShowOfWeek && weekNumber % 25 === 0) {
        const n1 = reserveNameAt(nextReserveIndex), n2 = reserveNameAt(nextReserveIndex + 1);
        poolWithGrowth = [makeWrestler(n1), makeWrestler(n2)];
        setNextReserveIndex((i) => i + 2);
        setUniverseFeed((feed) => [{ id: `g-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${n1} and ${n2} have entered the wrestling scene as free agents.`, type: "rumor" }, ...feed].slice(0, 300));
      }
      if (isLastShowOfWeek && weekNumber % 4 === 0 && nextStaggeredDebutIndex < STAGGERED_DEBUT_DATA.length) {
        const d = STAGGERED_DEBUT_DATA[nextStaggeredDebutIndex];
        const debutWrestler = makeWrestlerFromOverall(d.name, d.overall, { age: d.age, sex: d.gender, weightClass: d.weightClass, alignment: d.alignment });
        poolWithGrowth = [...(poolWithGrowth || []), debutWrestler];
        setNextStaggeredDebutIndex((i) => i + 1);
        setUniverseFeed((feed) => [{ id: `debut-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${d.name} has made their debut, entering the wrestling scene as a free agent.`, type: "rumor" }, ...feed].slice(0, 300));
      }
      // What the wrestling world wants shifts every FAN_TREND_ROTATION_WEEKS,
      // same cadence class as the trickles above — ticks regardless of
      // whether a show ran, since it's about the world, not your card.
      if (isLastShowOfWeek && weekNumber % FAN_TREND_ROTATION_WEEKS === 0) {
        const candidates = FAN_TRENDS.filter((t) => t.key !== fanTrendKey);
        const next = candidates[rand(0, candidates.length - 1)];
        setFanTrendKey(next.key);
        setUniverseFeed((feed) => [{ id: `trend-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `The wrestling world is ${next.news} right now.`, type: "rumor" }, ...feed].slice(0, 300));
      }
      // A retiree's legacy child finally comes of age, 15-20 years on — debuts
      // as a free agent like any other newcomer, but their Potential is
      // pulled toward how good the parent actually was at their peak.
      const dueLegacies = pendingLegacies.filter((l) => l.debutWeek <= weekNumber);
      if (dueLegacies.length > 0) {
        const legacyNewsEntries = [];
        const legacyWrestlers = dueLegacies.map((l) => {
          const firstName = FIRST_NAMES_RESERVE[rand(0, FIRST_NAMES_RESERVE.length - 1)];
          const childName = `${firstName} ${l.surname}`;
          const startOverall = rand(15, 30);
          const debutWrestler = makeWrestlerFromOverall(childName, startOverall, { age: rand(18, 21), weightClass: l.weightClass });
          const childPotential = clamp(Math.round(l.parentQuality * 0.75 + rand(0, 10)), startOverall, 95);
          legacyNewsEntries.push(`${childName}, ${debutWrestler.sex === "Female" ? "daughter" : "son"} of legendary ${l.parentName}, has made their debut.`);
          return { ...debutWrestler, potential: childPotential, legacyParent: l.parentName };
        });
        poolWithGrowth = [...(poolWithGrowth || []), ...legacyWrestlers];
        const firedIds = new Set(dueLegacies.map((l) => l.id));
        setPendingLegacies((lp) => lp.filter((l) => !firedIds.has(l.id)));
        setUniverseFeed((feed) => [...legacyNewsEntries.map((text, i) => ({ id: `legacy-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text, type: "rumor" })), ...feed].slice(0, 300));
        setHasSeenLegacyDebut(true);
      }

      // Segment performers get a small permanent bump to whichever stat the
      // angle actually exercised — charisma for a Promo/Confrontation,
      // entertainment for a Vignette. A Confrontation's subject gets a
      // smaller charisma bump too — they're an active participant, not just
      // a name getting called out.
      const segmentBumps = {};
      matches.forEach((m) => {
        if (m.format !== "segment") return;
        const statKey = m.angleType === "vignette" ? "ent" : "cha";
        segmentBumps[m.performer.name] = { statKey, amount: Math.max(1, Math.round(m.rating / 30)) };
        if (m.angleType === "confrontation" && m.subject) {
          segmentBumps[m.subject.name] = { statKey: "cha", amount: Math.max(1, Math.round(m.rating / 40)) };
        }
      });

      // Dark match reps give each participant a small chance of a tiny
      // permanent bump to a random performance stat — picking up pointers
      // in an untelevised match, same spirit as the segment bump above.
      const darkMatchBumps = {};
      darkMatchResults.forEach((d) => {
        [d.a, d.b].forEach((w) => {
          if (Math.random() < 0.2) darkMatchBumps[w.name] = PERFORMANCE_STAT_KEYS[rand(0, PERFORMANCE_STAT_KEYS.length - 1)];
        });
      });

      // Broken promises: a promised request whose deadline has passed without being
      // marked fulfilled costs real happiness and gets called out in the news.
      const brokenNewsEntries = [];
      setRequests((rs) => {
        const stillOpen = [];
        rs.forEach((r) => {
          if (r.status === "promised" && weekNumber > r.deadlineWeek) {
            brokenNewsEntries.push(`${r.wrestlerName} is furious after ${companyName} broke a promise to them.`);
          } else {
            stillOpen.push(r);
          }
        });
        // Posted from inside this updater — read right after setRequests(),
        // brokenNewsEntries is not guaranteed to be populated yet.
        if (brokenNewsEntries.length > 0) {
          setUniverseFeed((feed) => [...brokenNewsEntries.map((text, i) => ({ id: `bp-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text, type: "injury", companyId: "player" })), ...feed].slice(0, 300));
        }
        return stillOpen;
      });
      const brokenNames = new Set(); // filled below once we know which requests just broke
      // (re-derive from the pre-sweep list so we can dock happiness in the same pool pass)
      // Gated the same as everything else weekly — a broken promise's
      // happiness hit should land once per calendar week, not once per show.
      if (isLastShowOfWeek) {
        requests.forEach((r) => { if (r.status === "promised" && weekNumber > r.deadlineWeek) brokenNames.add(r.wrestlerName); });
      }

      // Auto-fulfilled request types: push (booked in Main Event), title-shot
      // (booked in a title match), match (booked against their named target).
      // Everything else (raise, time-off) still needs a manual Mark Fulfilled.
      const autoFulfilled = requests.filter((r) => {
        if (r.status !== "promised") return false;
        if (r.type === "push") return matches.some((m) => m.format === "match" && m.slotLabel === "Main Event" && [...m.team1, ...(m.team2 || [])].some((x) => x.name === r.wrestlerName));
        if (r.type === "title-shot") return matches.some((m) => m.format === "match" && m.titleInfo && [...m.team1, ...(m.team2 || [])].some((x) => x.name === r.wrestlerName));
        if (r.type === "match" && r.targetName) return matches.some((m) => m.format === "match" && [...m.team1, ...(m.team2 || [])].some((x) => x.name === r.wrestlerName) && [...m.team1, ...(m.team2 || [])].some((x) => x.name === r.targetName));
        return false;
      });
      if (autoFulfilled.length > 0) {
        const autoFulfilledIds = new Set(autoFulfilled.map((r) => r.id));
        setRequests((rs) => rs.filter((r) => !autoFulfilledIds.has(r.id)));
        setPool((p) => p.map((w) => (autoFulfilled.some((r) => r.wrestlerName === w.name) ? { ...w, happiness: clamp(w.happiness + HAPPINESS_FULFILLED_BONUS, 0, 100) } : w)));
        setUniverseFeed((feed) => [...autoFulfilled.map((r, i) => ({ id: `autoreq-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: `${r.wrestlerName}'s request has been fulfilled: ${r.text}`, type: "rumor", companyId: "player" })), ...feed].slice(0, 300));
      }

      // New requests: any signed or per-use wrestler without an open request has a
      // small chance to raise one this week.
      const newRequests = [];
      const eligibleForRequest = [...roster, ...perUseWrestlers].filter((w) => !requests.some((r) => r.wrestlerName === w.name));
      eligibleForRequest.forEach((w) => {
        if (Math.random() < REQUEST_CHANCE) {
          const eligibleTypes = REQUEST_TYPES.filter((t) => !t.minAge || w.age >= t.minAge);
          const rt = eligibleTypes[rand(0, eligibleTypes.length - 1)];
          if (rt.type === "match") {
            const useFreelancer = Math.random() < 0.3;
            const freelancerPool = pool.filter((x) => x.contractedTo === null && x.name !== w.name && !bookable.some((b) => b.name === x.name));
            const candidates = (useFreelancer && freelancerPool.length > 0) ? freelancerPool : bookable.filter((x) => x.name !== w.name);
            if (candidates.length > 0) {
              const target = candidates[rand(0, candidates.length - 1)];
              newRequests.push({ id: `req-${weekNumber}-${w.name}`, wrestlerName: w.name, type: "match", targetName: target.name, text: `${w.name} wants a match against ${target.name}${!bookable.some((b) => b.name === target.name) ? " — you'll need to sign them first" : ""}.`, weekMade: weekNumber, deadlineWeek: null, status: "pending" });
            }
          } else if (rt.type === "role-change") {
            const role = STAFF_CAREER_ROLES[rand(0, STAFF_CAREER_ROLES.length - 1)];
            const roleLabel = STAFF_ROLES.find((r) => r.key === role)?.label || role;
            newRequests.push({ id: `req-${weekNumber}-${w.name}`, wrestlerName: w.name, type: "role-change", targetRole: role, text: `${w.name} is thinking about a move into the office — they'd like to become ${/^[aeiou]/i.test(roleLabel) ? "an" : "a"} ${roleLabel}.`, weekMade: weekNumber, deadlineWeek: null, status: "pending" });
          } else {
            newRequests.push({ id: `req-${weekNumber}-${w.name}`, wrestlerName: w.name, type: rt.type, text: rt.text(w), weekMade: weekNumber, deadlineWeek: null, status: "pending" });
          }
        }
      });
      if (newRequests.length > 0) setRequests((rs) => [...rs, ...newRequests]);

      // A few things happen across the wrestling world every week, regardless of
      // whether they touch your own card — drawn from the whole pool, not just
      // this week's participants. Weekly cadence, same reasoning as the rival
      // simulation above — rosterEventUpdates is read again in the pool pass
      // below, so it's declared out here rather than scoped to the gate.
      let rosterEventUpdates = {};
      if (isLastShowOfWeek) {
      const rosterNewsEntries = [];
      const eventCount = rand(ROSTER_EVENTS_MIN, ROSTER_EVENTS_MAX);
      for (let i = 0; i < eventCount; i++) {
        const tmpl = UNIVERSE_EVENT_TEMPLATES[rand(0, UNIVERSE_EVENT_TEMPLATES.length - 1)];
        if (tmpl.effect === "partner") {
          const males = pool.filter((w) => w.sex === "Male");
          const females = pool.filter((w) => w.sex === "Female");
          if (males.length === 0 || females.length === 0) continue;
          const wA = males[rand(0, males.length - 1)];
          const wB = females[rand(0, females.length - 1)];
          rosterNewsEntries.push(tmpl.text.replace("{A}", wA.name).replace("{B}", wB.name));
          rosterEventUpdates[wA.name] = { ...(rosterEventUpdates[wA.name] || {}), partner: wB.name };
          rosterEventUpdates[wB.name] = { ...(rosterEventUpdates[wB.name] || {}), partner: wA.name };
        } else if (tmpl.text.includes("{B}")) {
          if (pool.length < 2) continue;
          const idxA = rand(0, pool.length - 1);
          let idxB = rand(0, pool.length - 1);
          let guard = 0;
          while (idxB === idxA && guard < 10) { idxB = rand(0, pool.length - 1); guard++; }
          const wA = pool[idxA], wB = pool[idxB];
          if (wA.name === wB.name) continue;
          rosterNewsEntries.push(tmpl.text.replace("{A}", wA.name).replace("{B}", wB.name));
          if (tmpl.effect === "friend") {
            rosterEventUpdates[wA.name] = { ...(rosterEventUpdates[wA.name] || {}), addFriend: wB.name };
            rosterEventUpdates[wB.name] = { ...(rosterEventUpdates[wB.name] || {}), addFriend: wA.name };
          } else if (tmpl.effect === "rival") {
            rosterEventUpdates[wA.name] = { ...(rosterEventUpdates[wA.name] || {}), addRival: wB.name };
            rosterEventUpdates[wB.name] = { ...(rosterEventUpdates[wB.name] || {}), addRival: wA.name };
          }
        } else {
          if (pool.length === 0) continue;
          const wA = pool[rand(0, pool.length - 1)];
          rosterNewsEntries.push(tmpl.text.replace("{A}", wA.name));
        }
      }
      if (rosterNewsEntries.length > 0) {
        setUniverseFeed((feed) => [...rosterNewsEntries.map((text, i) => ({ id: `r-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text, type: "rumor" })), ...feed].slice(0, 300));
      }
      } // isLastShowOfWeek (universe events)

      const injuryNewsEntries = [];
      const newlyInjuredNames = []; // wrestler names injured this tick, any title they hold gets vacated below
      const retiringWrestlers = []; // { name, contractedTo, holdsTitles } — removed from the pool below, titles vacated after
      const retiringStaffCandidates = []; // ex-wrestlers whose retirement rolled them into a staff career
      const legacyQueue = []; // retirees whose retirement rolled them a legacy child, debuting decades later
      const developmentBreakoutNames = []; // developmental talent that trained up to their potential this tick
      const developmentBreakoutRecords = []; // richer version of the above, for the Training School's Alumni list
      const rivalGraduateNames = []; // rival trainees that graduated — auto-promoted since there's no manual Roster screen for them
      setPool((p) => {
        let next = p.map((w) => {
          const inMatch = matches.find((mm) => mm.format === "match" && (mm.team1.some((x) => x.name === w.name) || mm.team2.some((x) => x.name === w.name)));
          const segmentObj = matches.find((mm) => mm.format === "segment" && mm.performer.name === w.name);
          const darkMatchObj = darkMatchResults.find((d) => d.a.name === w.name || d.b.name === w.name);
          let withTitle = applyTitleChanges(w);
          withTitle = clearRivalry(withTitle);
          if (withTitle.contractedTo && withTitle.contractExpiresWeek !== null && withTitle.contractExpiresWeek <= weekNumber) {
            withTitle = { ...withTitle, contractedTo: null, contractExpiresWeek: null };
          }
          if (segmentBumps[w.name]) withTitle = { ...withTitle, [segmentBumps[w.name].statKey]: clamp(withTitle[segmentBumps[w.name].statKey] + segmentBumps[w.name].amount, 0, 100) };
          if (darkMatchBumps[w.name]) withTitle = { ...withTitle, [darkMatchBumps[w.name]]: clamp(withTitle[darkMatchBumps[w.name]] + 1, 0, 100) };
          const evt = rosterEventUpdates[w.name];
          if (evt) {
            if (evt.partner) withTitle = { ...withTitle, partner: evt.partner };
            if (evt.addFriend) withTitle = { ...withTitle, friends: [...new Set([...withTitle.friends, evt.addFriend])] };
            if (evt.addRival) withTitle = { ...withTitle, rivals: [...new Set([...withTitle.rivals, evt.addRival])] };
          }

          let updated = withTitle;
          if (inMatch) {
            const won = inMatch.winnerTeam.some((x) => x.name === w.name);
            // A match booked as a Put Over or a Squash (see MATCH_PURPOSES) is
            // deliberately lopsided — the winner gets a real draw-power payoff
            // scaled to who they just beat, and the loser takes it on the chin
            // (a bit of a happiness hit, since being fed never feels great,
            // even when it's the job).
            const opponentTeam = won ? inMatch.loserTeam : inMatch.winnerTeam;
            const opponentDraw = opponentTeam.length ? opponentTeam.reduce((s, o) => s + (o.drawPower ?? 50), 0) / opponentTeam.length : 50;
            let purposeDrawBonus = 0;
            let purposeHappinessAdj = 0;
            if (inMatch.purpose === "putover") { if (won) purposeDrawBonus += opponentDraw * 0.15; else purposeHappinessAdj -= 1; }
            if (inMatch.purpose === "squash") { if (won) purposeDrawBonus += opponentDraw * 0.25; else purposeDrawBonus -= 2; }
            // An Underdog Story (see MATCH_STORIES) only pays off if the upset
            // actually happened — the winner gets a real draw-power jolt out of
            // beating someone they weren't supposed to.
            if (inMatch.matchStory === "underdog" && inMatch.upsetHappened && won) purposeDrawBonus += 4;
            updated = { ...updated, matches: updated.matches + 1, wins: updated.wins + (won ? 1 : 0), losses: updated.losses + (won ? 0 : 1), rankingPts: clamp(updated.rankingPts + (won ? 5 : -3), -50, 150), happiness: clamp(updated.happiness + (won ? 1 : -2) + purposeHappinessAdj, 0, 100) };
            // A win teaches you something — small, slow, tied to how it was won.
            // Pinfalls sharpen offense, submissions sharpen technical ability.
            if (won && Math.random() < 0.15) {
              const growStat = inMatch.winMethod === "Submission" ? "sub" : inMatch.winMethod === "Pinfall" ? "atk" : null;
              if (growStat) updated = { ...updated, [growStat]: clamp(updated[growStat] + 1, 0, 100) };
            }
            // Drawing power — grows from winning, from a genuinely good match, and
            // especially from title moments. This is what actually fills seats.
            // Already a Fan Favorite (see deriveTraits)? Stars snowball — being
            // over the threshold speeds up growth a little rather than slowing
            // it down, same as a real star's momentum.
            const drawDelta = (won ? 0.6 : 0.1) + (inMatch.rating > 70 ? 0.8 : 0) + (inMatch.titleInfo ? 1 : 0) + ((updated.drawPower ?? 50) >= 75 ? 0.3 : 0) + purposeDrawBonus;
            updated = { ...updated, drawPower: clamp((updated.drawPower ?? 50) + drawDelta, 0, 100) };
          } else if (rivalMatchOutcomes[w.name]) {
            const won = rivalMatchOutcomes[w.name].won;
            updated = { ...updated, matches: updated.matches + 1, wins: updated.wins + (won ? 1 : 0), losses: updated.losses + (won ? 0 : 1), rankingPts: clamp(updated.rankingPts + (won ? 5 : -3), -50, 150) };
            updated = { ...updated, drawPower: clamp((updated.drawPower ?? 50) + (won ? 0.3 : 0.05), 0, 100) };
          } else if (updated.matches > 0 && updated.rankingPts !== 0) {
            // Sitting out — ranking points drift back toward zero. Injured wrestlers
            // slide faster since they're definitely not defending their position.
            const decayStep = updated.injuryWeeksRemaining ? 2 : 1;
            const drift = updated.rankingPts > 0 ? -Math.min(decayStep, updated.rankingPts) : Math.min(decayStep, -updated.rankingPts);
            updated = { ...updated, rankingPts: updated.rankingPts + drift };
          }
          // Fame fades slowly if you're never booked anywhere — floors out rather
          // than vanishing, since a name doesn't go to zero recognition.
          if (!inMatch && !rivalMatchOutcomes[w.name]) {
            updated = { ...updated, drawPower: Math.max(20, (updated.drawPower ?? 50) - 0.1) };
          }
          updated = { ...updated, perUsedByRival: rivalFreelanceBookings[w.name] || null };
          if (brokenNames.has(w.name)) updated = { ...updated, happiness: clamp(updated.happiness + HAPPINESS_BROKEN_PENALTY, 0, 100) };

          // Energy & injury — applies to every wrestler in the pool, any promotion.
          let eng = updated.eng;
          let injuryWeeksRemaining = updated.injuryWeeksRemaining;
          let injuryType = updated.injuryType || null;
          let justInjured = false;
          if (injuryWeeksRemaining) {
            eng = clamp(eng + ENERGY_RECOVERY_INJURED, 0, 100);
            const remaining = injuryWeeksRemaining - 1;
            if (remaining <= 0) {
              injuryWeeksRemaining = null;
              injuryType = null;
              eng = Math.max(eng, INJURY_RETURN_ENERGY);
              injuryNewsEntries.push({ text: `${w.name} has recovered from injury and is ready to compete again.`, companyId: updated.contractedTo });
            } else {
              injuryWeeksRemaining = remaining;
            }
          } else if (inMatch) {
            const rawDelta = inMatch.specialty ? rand(ENERGY_LOSS_SPECIALTY[0], ENERGY_LOSS_SPECIALTY[1]) : rand(ENERGY_LOSS_MATCH[0], ENERGY_LOSS_MATCH[1]);
            const delta = Math.round(rawDelta * (MATCH_PURPOSE_BY_ID[inMatch.purpose]?.energyMult ?? 1));
            eng = clamp(eng - delta, 0, 100);
            if (eng < INJURY_ENERGY_THRESHOLD && Math.random() < INJURY_CHANCE * medicalInjuryFactor) {
              const injuryPick = pickInjuryType();
              injuryWeeksRemaining = Math.max(1, Math.round(rand(INJURY_WEEKS_MIN, INJURY_WEEKS_MAX) * injuryPick.weeksMult));
              injuryType = injuryPick.name;
              injuryNewsEntries.push({ text: `${w.name} has suffered a ${injuryPick.name.toLowerCase()} injury and is expected to be out for ${injuryWeeksRemaining} weeks.`, companyId: updated.contractedTo });
              newlyInjuredNames.push(w.name);
              justInjured = true;
            }
          } else if (segmentObj) {
            // A Confrontation that boiled over into a brawl costs energy like
            // a light physical encounter instead of the usual segment
            // recovery — it stopped being just talking.
            eng = segmentObj.brawl
              ? clamp(eng - Math.round(rand(ENERGY_LOSS_MATCH[0], ENERGY_LOSS_MATCH[1]) * 0.5), 0, 100)
              : clamp(eng + rand(ENERGY_CHANGE_SEGMENT[0], ENERGY_CHANGE_SEGMENT[1]), 0, 100);
          } else if (darkMatchObj) {
            // Lighter than a real match — no live crowd carrying the pace,
            // no cameras raising the stakes. Half the energy cost, half the
            // injury risk of a card match.
            const delta = Math.round(rand(ENERGY_LOSS_MATCH[0], ENERGY_LOSS_MATCH[1]) * 0.5);
            eng = clamp(eng - delta, 0, 100);
            if (eng < INJURY_ENERGY_THRESHOLD && Math.random() < INJURY_CHANCE * 0.5 * medicalInjuryFactor) {
              const injuryPick = pickInjuryType();
              injuryWeeksRemaining = Math.max(1, Math.round(rand(INJURY_WEEKS_MIN, INJURY_WEEKS_MAX) * injuryPick.weeksMult));
              injuryType = injuryPick.name;
              injuryNewsEntries.push({ text: `${w.name} picked up a ${injuryPick.name.toLowerCase()} injury working a dark match and is expected to be out for ${injuryWeeksRemaining} weeks.`, companyId: updated.contractedTo });
              newlyInjuredNames.push(w.name);
              justInjured = true;
            }
          } else if (rivalShowUsage.has(w.name)) {
            const delta = rand(ENERGY_LOSS_MATCH[0], ENERGY_LOSS_MATCH[1]);
            eng = clamp(eng - delta, 0, 100);
            if (eng < INJURY_ENERGY_THRESHOLD && Math.random() < INJURY_CHANCE) {
              const injuryPick = pickInjuryType();
              injuryWeeksRemaining = Math.max(1, Math.round(rand(INJURY_WEEKS_MIN, INJURY_WEEKS_MAX) * injuryPick.weeksMult));
              injuryType = injuryPick.name;
              injuryNewsEntries.push({ text: `${w.name} has suffered a ${injuryPick.name.toLowerCase()} injury and is expected to be out for ${injuryWeeksRemaining} weeks.`, companyId: updated.contractedTo });
              newlyInjuredNames.push(w.name);
              justInjured = true;
            }
          } else {
            eng = clamp(eng + rand(ENERGY_RECOVERY_RESTING[0], ENERGY_RECOVERY_RESTING[1]), 0, 100);
          }

          const happiness = justInjured ? clamp(updated.happiness - 12, 0, 100) : updated.happiness;

          // Once a year, everyone gets a year older. Past 35, physical stats have
          // a real chance of a small permanent dip; past 30, there's a chance
          // experience shows up as a small charisma/mic bump instead — a worker
          // can be declining physically and still be great on the stick. Tier
          // (ability label) gets recomputed since raw stats may have genuinely
          // changed; a manual push override is untouched either way.
          let aged = { ...updated, eng, injuryWeeksRemaining, injuryType, happiness };

          // Developmental training — exclusive talent assigned to the feeder
          // promotion trains toward their potential every week, faster (and
          // more reliably) on a week they actually got ring time. A hired
          // Trainer raises the base odds; being booked against a notably
          // more experienced opponent (bring in a veteran per-use name to
          // work with your prospects) adds an extra growth tick on top,
          // win or lose. Growth stops once they've closed the gap — that's
          // what "developed" means. wasBelowPotential is captured here and
          // checked again at the very end of this wrestler's processing
          // (after aging etc.), so a crossing that a different same-week
          // mutation happens to complete still gets reported.
          // Every company's Training School runs the same way, player and
          // rival alike — just each with its own hired Trainer (or none).
          const inDevelopmental = !!aged.contractedTo && aged.rosterLevel === "developmental";
          const wasBelowPotential = inDevelopmental && avgStats(aged) < potentialOf(aged) - 0.5;
          if (wasBelowPotential) {
            const pot = potentialOf(aged);
            const gotRingTime = !!inMatch || !!segmentObj || !!darkMatchObj;
            let workedWithVeteran = false;
            if (inMatch) {
              const onTeam1 = inMatch.team1.some((x) => x.name === aged.name);
              const opponentTeam = onTeam1 ? inMatch.team2 : inMatch.team1;
              const opponentAvgAttr = opponentTeam.length ? opponentTeam.reduce((s, x) => s + attrOf(x), 0) / opponentTeam.length : 0;
              workedWithVeteran = opponentAvgAttr - attrOf(aged) >= 20;
            } else if (darkMatchObj) {
              const opponent = darkMatchObj.a.name === aged.name ? darkMatchObj.b : darkMatchObj.a;
              workedWithVeteran = attrOf(opponent) - attrOf(aged) >= 20;
            }
            const traineeTrainerSkill = aged.contractedTo === "player" ? bestTrainerSkill : staffPool.filter((s) => s.role === "trainer" && s.contractedTo === aged.contractedTo).reduce((max, s) => Math.max(max, s.skill), 0);
            const trainerChanceBonus = (traineeTrainerSkill / 100) * 0.12;
            const chance = Math.min(0.97, (gotRingTime ? 0.85 : 0.5) + trainerChanceBonus);
            if (Math.random() < chance) {
              const doubleChance = 0.4 + (traineeTrainerSkill / 100) * 0.3;
              let growCount = gotRingTime && Math.random() < doubleChance ? 2 : 1;
              if (workedWithVeteran) growCount += 1;
              growCount = Math.min(3, growCount);
              for (let g = 0; g < growCount; g++) {
                const statKey = PERFORMANCE_STAT_KEYS[rand(0, PERFORMANCE_STAT_KEYS.length - 1)];
                aged = { ...aged, [statKey]: clamp(aged[statKey] + rand(1, 3), 0, 100) };
              }
              aged = { ...aged, tier: tierFromAvg(avgStats(aged)) };
            }
          }

          if (isLastShowOfWeek && weekNumber % WEEKS_PER_YEAR === 0) {
            const newAge = aged.age + 1;
            aged = { ...aged, age: newAge };
            if (newAge >= 35) {
              ["str", "spd", "jmp", "atk"].forEach((k) => {
                if (Math.random() < 0.4) aged = { ...aged, [k]: clamp(aged[k] - rand(1, 2), 0, 100) };
              });
            }
            if (newAge >= 30 && Math.random() < 0.25) {
              const veteranStat = Math.random() < 0.5 ? "cha" : "ent";
              aged = { ...aged, [veteranStat]: clamp(aged[veteranStat] + 1, 0, 100) };
            }
            aged = { ...aged, tier: tierFromAvg(avgStats(aged)) };
            // Retirement — a real chance from 46 on, climbing with age, certain at 60.
            // Keeps the roster turning over instead of just accumulating veterans forever.
            if (newAge >= 46) {
              const retireChance = newAge >= 60 ? 1 : clamp((newAge - 45) * 0.06, 0, 0.9);
              if (Math.random() < retireChance) {
                retiringWrestlers.push({ name: aged.name, contractedTo: aged.contractedTo, holdsTitles: aged.holdsTitles });
                // A real career in the ring is exactly the résumé a locker
                // room wants from an agent, trainer, or booker — give some
                // retirees a second act instead of just vanishing from the
                // world. Skill reflects how good they actually were.
                if (Math.random() < RETIRE_TO_STAFF_CHANCE) {
                  const role = STAFF_CAREER_ROLES[rand(0, STAFF_CAREER_ROLES.length - 1)];
                  const skill = clamp(Math.round(avgStats(aged) * 0.7 + aged.titleReigns * 5), 20, 95);
                  retiringStaffCandidates.push({ id: `staffret-${aged.name}-${weekNumber}`, name: aged.name, role, skill, contractedTo: null, contractExpiresWeek: null });
                }
                // A legacy child inherits a shot at the parent's PEAK quality, not
                // whatever their stats had declined to by the time they hung it up.
                if (Math.random() < LEGACY_CHANCE) {
                  const surname = aged.name.trim().split(" ").slice(-1)[0];
                  const parentQuality = clamp(Math.round(avgStats(aged) + aged.titleReigns * 5), 20, 95);
                  legacyQueue.push({ id: `legacy-${aged.name}-${weekNumber}`, parentName: aged.name, surname, parentQuality, weightClass: aged.weightClass, debutWeek: weekNumber + rand(LEGACY_DEBUT_DELAY_MIN, LEGACY_DEBUT_DELAY_MAX) });
                }
              }
            }
          }
          if (wasBelowPotential && aged.rosterLevel === "developmental" && avgStats(aged) >= potentialOf(aged) - 0.5) {
            developmentBreakoutRecords.push({ name: aged.name, overall: Math.round(avgStats(aged)), tier: aged.tier, companyId: aged.contractedTo });
            if (aged.contractedTo === "player") {
              developmentBreakoutNames.push(aged.name);
            } else {
              // No manual Roster screen for a rival's own trainees — graduate
              // them onto the main roster automatically rather than leaving
              // them stuck flagged developmental forever.
              aged = { ...aged, rosterLevel: "main" };
              rivalGraduateNames.push({ name: aged.name, companyId: aged.contractedTo });
            }
          }
          return aged;
        });
        if (poolWithGrowth) next = [...next, ...poolWithGrowth];
        if (retiringWrestlers.length > 0) {
          const retiringNames = new Set(retiringWrestlers.map((r) => r.name));
          next = next.filter((w) => !retiringNames.has(w.name));
        }
        // Everything below is posted from inside this updater, not after
        // calling setPool, since a functional setState update isn't
        // guaranteed to run synchronously at the call site — these
        // collector arrays (injuryNewsEntries, newlyInjuredNames,
        // retiringWrestlers, developmentBreakoutNames) are only reliably
        // populated once this updater actually runs.
        if (injuryNewsEntries.length > 0) {
          setUniverseFeed((feed) => [...injuryNewsEntries.map((e, i) => ({ id: `inj-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: e.text, type: "injury", companyId: e.companyId })), ...feed].slice(0, 300));
        }
        if (newlyInjuredNames.length > 0) {
          // Check the titles themselves directly by holder name — simpler and more
          // reliable than tracking it through the per-wrestler pool pass. Handles
          // tag titles correctly too: either partner being hurt vacates the pair.
          const vacatedPlayerTitles = titles.filter((t) => t.holders.some((h) => newlyInjuredNames.includes(h)));
          if (vacatedPlayerTitles.length > 0) {
            setTitles((ts) => ts.map((t) => {
              if (!vacatedPlayerTitles.some((v) => v.id === t.id)) return t;
              return {
                ...t, holders: [], reignStartWeek: null, currentReignDefenses: 0,
                history: [...t.history, { holderNames: t.holders, reignWeeks: t.reignStartWeek !== null ? weekNumber - t.reignStartWeek : 0, wonWeek: t.reignStartWeek, lostWeek: weekNumber, defenses: t.currentReignDefenses || 0, vacatedByInjury: true }],
              };
            }));
            next = next.map((w) => (vacatedPlayerTitles.some((t) => t.holders.includes(w.name)) ? { ...w, holdsTitles: w.holdsTitles.filter((id) => !vacatedPlayerTitles.some((t) => t.id === id)) } : w));
            setUniverseFeed((feed) => [...vacatedPlayerTitles.map((t, i) => ({ id: `vac-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: `${t.holders.join(" & ")} forced to vacate the ${t.name} due to injury.`, type: "injury", companyId: "player" })), ...feed].slice(0, 300));
          }
          const vacatedRivalTitles = rivalTitles.filter((t) => t.holder && newlyInjuredNames.includes(t.holder));
          if (vacatedRivalTitles.length > 0) {
            setRivalTitles((ts) => ts.map((t) => (vacatedRivalTitles.some((v) => v.id === t.id) ? { ...t, holder: null } : t)));
            setUniverseFeed((feed) => [...vacatedRivalTitles.map((t, i) => ({ id: `rvac-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: `The ${t.name} has been vacated due to injury.`, type: "injury", companyId: t.companyId })), ...feed].slice(0, 300));
          }
        }
        if (retiringWrestlers.length > 0) {
          const retiringNames = retiringWrestlers.map((r) => r.name);
          const vacatedPlayerTitlesForRetirement = titles.filter((t) => t.holders.some((h) => retiringNames.includes(h)));
          if (vacatedPlayerTitlesForRetirement.length > 0) {
            setTitles((ts) => ts.map((t) => {
              if (!vacatedPlayerTitlesForRetirement.some((v) => v.id === t.id)) return t;
              return {
                ...t, holders: [], reignStartWeek: null, currentReignDefenses: 0,
                history: [...t.history, { holderNames: t.holders, reignWeeks: t.reignStartWeek !== null ? weekNumber - t.reignStartWeek : 0, wonWeek: t.reignStartWeek, lostWeek: weekNumber, defenses: t.currentReignDefenses || 0, vacatedByRetirement: true }],
              };
            }));
          }
          const vacatedRivalTitlesForRetirement = rivalTitles.filter((t) => t.holder && retiringNames.includes(t.holder));
          if (vacatedRivalTitlesForRetirement.length > 0) {
            setRivalTitles((ts) => ts.map((t) => (vacatedRivalTitlesForRetirement.some((v) => v.id === t.id) ? { ...t, holder: null } : t)));
          }
          setPerUseRoster((pu) => pu.filter((n) => !retiringNames.includes(n)));
          setUniverseFeed((feed) => [...retiringWrestlers.map((r, i) => {
            const staffCareer = retiringStaffCandidates.find((c) => c.name === r.name);
            const careerLine = staffCareer ? ` They've taken a job as ${STAFF_ROLES.find((role) => role.key === staffCareer.role)?.label || "staff"} — available to hire from the Staff screen.` : "";
            return { id: `ret-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: `${r.name} has announced their retirement from professional wrestling.${r.holdsTitles.length > 0 ? " Their title(s) have been vacated." : ""}${careerLine}`, type: "rumor", companyId: r.contractedTo };
          }), ...feed].slice(0, 300));
          if (retiringStaffCandidates.length > 0) {
            setStaffPool((sp) => [...sp, ...retiringStaffCandidates]);
          }
          if (legacyQueue.length > 0) {
            setPendingLegacies((lp) => [...lp, ...legacyQueue]);
          }
        }
        if (developmentBreakoutNames.length > 0) {
          setUniverseFeed((feed) => [...developmentBreakoutNames.map((name, i) => ({ id: `dev-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: `${name} has developed into a legitimate prospect — they've outgrown what Developmental can teach them and are ready for the main roster.`, type: "title", companyId: "player" })), ...feed].slice(0, 300));
        }
        if (rivalGraduateNames.length > 0) {
          setUniverseFeed((feed) => [...rivalGraduateNames.map((g, i) => ({ id: `rivaldev-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: `${g.name} has graduated from ${rivalCompanies.find((c) => c.id === g.companyId)?.name || "a rival's"} training school onto their main roster.`, type: "rival", companyId: g.companyId })), ...feed].slice(0, 300));
        }
        if (developmentBreakoutRecords.length > 0) {
          setDevelopmentalAlumni((al) => [
            ...developmentBreakoutRecords.map((r) => ({ ...r, graduatedWeek: weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber) })),
            ...al,
          ].slice(0, 300));
        }
        return next;
      });

      const record = showRan ? { id: weekNumber, showNumber: weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), date: scheduledDate, wasPPV: arena.name === "Major Arena", matches, attendance, revenue, wrestlerPay, specialtyCost, travelSurcharge, adCost: activeAdCampaign.cost, adCampaignLabel: activeAdCampaign.key !== "none" ? activeAdCampaign.label : null, agreementCost, loanPayment, networkIncome, sponsorIncome, merchUnitsSold, merchRevenue, merchMissedUnits, merchTheftUnits, catastrophe: catastropheEntry, underbookedPenaltyNote, profit, news, fullRating, arena: arena.name, ticketPrice, city, showLevel } : null;
      if (record) setShowHistory((h) => [record, ...h].slice(0, 60));
      if (thisShowMatchupKeys.length > 0) {
        setRecentMatchups((prev) => [...thisShowMatchupKeys, ...prev].slice(0, 30));
      }
      if (catastropheEntry) {
        setUniverseFeed((feed) => [{ id: `cat-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: catastropheEntry.text, type: "injury", companyId: "player" }, ...feed].slice(0, 300));
      }
      if (merchUnitsSold > 0 || merchTheftUnits > 0) {
        setMerchStock((s) => Math.max(0, s - merchUnitsSold - merchTheftUnits));
      }
      if (merchTheftUnits > 0) {
        setUniverseFeed((feed) => [{ id: `theft-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `Merch stock was stolen at the show — ${merchTheftUnits} units gone.`, type: "injury", companyId: "player" }, ...feed].slice(0, 300));
      }
      if (merchRevenue > 0) {
        const competitors = matches.filter((m) => m.format === "match").flatMap((m) => [...m.team1, ...(m.team2 || [])]);
        const totalDraw = competitors.reduce((s, w) => s + (w.drawPower ?? 50), 0);
        if (totalDraw > 0) {
          const shareMap = {};
          competitors.forEach((w) => { shareMap[w.name] = (shareMap[w.name] || 0) + (w.drawPower ?? 50) / totalDraw; });
          setWrestlerMerchSales((prev) => {
            const next = { ...prev };
            Object.entries(shareMap).forEach(([name, share]) => { next[name] = Math.round((next[name] || 0) + merchRevenue * share); });
            return next;
          });
        }
      }
      // Calendar reminders — fire regardless of whether a show ran this week,
      // but only once per calendar week (not once per show on a multi-show
      // one). One-off events are removed once fired; recurring ones
      // reschedule intervalWeeks further out instead of disappearing.
      if (isLastShowOfWeek) {
        const dueEvents = scheduledEvents.filter((e) => e.weekNumber <= weekNumber);
        if (dueEvents.length > 0) {
          setUniverseFeed((feed) => [...dueEvents.map((e, i) => ({ id: `cal-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: `REMINDER: ${e.label}`, type: "rumor", companyId: "player" })), ...feed].slice(0, 300));
          setScheduledEvents((ev) => ev
            .filter((e) => !dueEvents.some((d) => d.id === e.id) || e.recurring)
            .map((e) => (dueEvents.some((d) => d.id === e.id) && e.recurring ? { ...e, weekNumber: e.weekNumber + e.intervalWeeks } : e)));
        }
      }
      // Event templates reschedule themselves on their own cadence regardless
      // of whether this week's show actually ran — a weekly slot moves to next
      // week either way, same as it would in the real world. Math.max guards
      // against a template that had drifted behind (skipped in favor of a
      // more-overdue one) — always lands strictly in the future from here,
      // rather than compounding the same backlog forever.
      if (activeEventTemplate) {
        setEventTemplates((ts) => ts.map((t) => (t.id === activeEventTemplate.id ? { ...t, nextWeekNumber: Math.max(t.nextWeekNumber + t.intervalWeeks, weekNumber + 1) } : t)));
      }

      // Achievement-relevant records from this show — matches array is already
      // fresh/local here, so these can be set directly rather than via effect.
      // A skipped week never reads the in-progress draft card for these either,
      // since nothing was actually booked or run.
      if (showRan && segments.some((s) => s.type === "fatal4")) setBookedFatal4Ever(true);
      if (showRan && segments.some((s) => s.specialtyId === "cage")) setBookedCageEver(true);
      setMaxAttendanceEver((prev) => Math.max(prev, attendance));
      setMaxShowRatingEver((prev) => Math.max(prev, fullRating));
      if (attendance >= arena.crowdMax) setHasSoldOutEver(true);
      if (showRan) {
        setTotalShowsRun((n) => n + 1);
        setTotalMatchesRun((n) => n + matches.filter((m) => m.format === "match").length);
      } else {
        setUniverseFeed((feed) => [{ id: `skip-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} ran no show this week — the business ticked along quietly.`, type: "rumor", companyId: "player" }, ...feed].slice(0, 300));
      }
      // Staff candidate pool trickles over — a stale unhired candidate is
      // occasionally swapped for a freshly generated one of the same role,
      // so the pool never fully dries up or goes stale long-term. Only a
      // genuinely free candidate (contractedTo === null) is eligible — rivals
      // hire out of this same pool now, and a staffer actually under
      // contract to someone (the player OR a rival) should never just
      // vanish mid-contract.
      if (Math.random() < 0.15) {
        setStaffPool((sp) => {
          const idx = sp.findIndex((s) => s.contractedTo === null);
          if (idx === -1) return sp;
          const replaced = [...sp];
          replaced[idx] = generateStaffCandidate(sp[idx].role, new Set(sp.map((s) => s.name)));
          return replaced;
        });
      }
      // The calendar week only actually turns over once nothing else is due
      // this week — otherwise just mark this template's own slot done so the
      // Book screen moves on to whichever show is next (see activeEventTemplate).
      if (isLastShowOfWeek) {
        setWeekCount((w) => w + 1);
        setShowsDoneThisWeek([]);
      } else if (showRan && activeEventTemplate) {
        setShowsDoneThisWeek((d) => [...d, activeEventTemplate.id]);
      }
      setShowResult(record);
      } catch (e) {
        // A show that throws partway through should never leave the button
        // stuck on "RUNNING THE SHOW..." forever — surface it (console +
        // on-screen, since most players won't have dev tools open) and
        // always release the running state below.
        console.error("runShow failed partway through:", e);
        setRunShowError((e && e.message ? e.message : String(e)) + (e && e.stack ? `\n${e.stack}` : ""));
      }

      setRunning(false);
    }, 1200);
  };

  // "Book another show" clearing the card for a fresh one — city is NOT
  // reset here: the [weekCount] effect above already set it correctly for
  // whichever show is now due the moment the week advanced, and nulling it
  // again here left nothing to ever set it back (that effect only reruns on
  // the NEXT weekCount change), permanently disabling RUN THE SHOW until the
  // game was reloaded.
  const resetShow = () => {
    setSegments([]);
    setDarkMatches([]);
    setShowResult(null);
  };

  const buildSaveSnapshot = () => ({
    v: 1, savedAt: new Date().toISOString(),
    bank, weekCount, totalShowsRun, totalMatchesRun,
    companyName, playerName, playerAge, playerSex,
    cityPopularity, cityVisits, pool, startingCity,
    rivalCompanies, rivalTitles, nextReserveIndex, nextStaggeredDebutIndex,
    perUseRoster, titles,
    // Each match embeds full wrestler snapshots (every stat) rather than just a
    // name — across 20 saved shows x up to 5 matches x up to 4 wrestlers, that
    // adds up fast. Trim to {name} only, but keep winnerTeam/loserTeam pointing
    // at the SAME trimmed array reference as team1/team2, since the UI tells
    // who won by reference equality (m.winnerTeam === m.team1), not by content.
    showHistory: showHistory.slice(0, 20).map((r) => ({
      ...r,
      matches: r.matches.map((m) => {
        if (m.format === "segment") return { ...m, performer: { name: m.performer.name }, subject: m.subject ? { name: m.subject.name } : null };
        const t1 = m.team1.map((w) => ({ name: w.name }));
        const t2 = m.team2.map((w) => ({ name: w.name }));
        const winnerTeam = m.winnerTeam === m.team1 ? t1 : t2;
        const loserTeam = winnerTeam === t1 ? t2 : t1;
        return { ...m, team1: t1, team2: t2, winnerTeam, loserTeam };
      }),
    })),
    financeHistory: financeHistory.slice(-300),
    rivalFinanceHistory: rivalFinanceHistory.slice(-1600),
    rivalShowHistory: rivalShowHistory.slice(0, 150),
    number1Contenders,
    universeFeed: universeFeed.slice(0, 150),
    storylines, stableStorylines, stables,
    networkDeal, networkOffers, sponsorDeal, sponsorOffers,
    bankruptWeeks, peakPopularity, loan, requests, playerLastTier, notes,
    unlockedAchievements, hasEverTakenLoan, hasEverRepaidLoanFully, hasSurvivedCatastrophe,
    hasBeenFired, hasRetiredOnce, hasCreatedStableManually, hasCreatedRivalryManually,
    pendingLegacies, hasSeenLegacyDebut,
    hasRenamedWrestler, bookedFatal4Ever, bookedCageEver, maxAttendanceEver, hasSoldOutEver, maxShowRatingEver,
    hallOfFame, wrestlerReignCounts, merchStock, merchQualityTier, wrestlerMerchSales, recentMatchups,
    scheduledEvents, eventTemplates, workingAgreements, feederCompany, developmentalAlumni,
    staffPool, productionTier, fanTrendKey, shortlist, pendingOffers, showsDoneThisWeek,
  });

  const applySaveSnapshot = (s) => {
    setBank(s.bank ?? 20000); setWeekCount(s.weekCount ?? 1); setTotalShowsRun(s.totalShowsRun ?? 0); setTotalMatchesRun(s.totalMatchesRun ?? 0);
    setCompanyName(s.companyName || "Ringside Empire Wrestling"); setPlayerName(s.playerName || ""); setPlayerAge(s.playerAge || ""); setPlayerSex(s.playerSex || "");
    // Merge over a full zeroed map, not just the saved object — an older
    // save predating a since-added city (New York/Mexico City/Tokyo did not
    // always exist) would otherwise leave that city's popularity undefined.
    setCityPopularity({ ...Object.fromEntries(CITIES.map((c) => [c, 0])), ...(s.cityPopularity || {}) });
    setStartingCity(s.startingCity || null);
    setCityVisits({ ...Object.fromEntries(CITIES.map((c) => [c, 0])), ...(s.cityVisits || {}) });
    // Legend used to be a selectable push tier (removed — it's an earned
    // Trait now, see deriveTraits). An older save can still have "Legend"
    // sitting in a wrestler's tier/pushOverride; normalize it to the new top
    // rung so TIER_ORDER lookups elsewhere don't just quietly drop them.
    setPool((s.pool || buildInitialPool()).map((w) => ({
      ...w,
      tier: w.tier === "Legend" ? "Main Event" : w.tier,
      pushOverride: w.pushOverride === "Legend" ? "Main Event" : w.pushOverride,
    })));
    setRivalCompanies(s.rivalCompanies || RIVAL_COMPANIES.map((c, i) => ({ ...c, funds: RIVAL_STARTING_FUNDS[i] ?? 25000, showsRun: 0, lastTier: popularityTier(c.popularity) })));
    setRivalTitles(s.rivalTitles || RIVAL_COMPANIES.map((c) => ({ id: `${c.id}-title`, name: c.titleName, companyId: c.id, holder: null })));
    setNextReserveIndex(s.nextReserveIndex ?? BULK_DEBUT_COUNT);
    setNextStaggeredDebutIndex(s.nextStaggeredDebutIndex ?? 0);
    setPerUseRoster(s.perUseRoster || []);
    setTitles(s.titles || [{ id: "world", name: "World Championship", type: "singles", holders: [], reignStartWeek: null, totalDefenses: 0, currentReignDefenses: 0, prestige: 0, history: [] }]);
    // Dates survive JSON as strings, not Date objects — rebuild them so formatDate() still works.
    setShowHistory((s.showHistory || []).map((r) => ({ ...r, date: new Date(r.date) })));
    setRivalShowHistory((s.rivalShowHistory || []).map((r) => ({ ...r, date: new Date(r.date) })));
    setNumber1Contenders(s.number1Contenders || []);
    setFinanceHistory(s.financeHistory || [{ weekNumber: 0, year: 1, weekOfYear: 0, bank: s.bank ?? 20000 }]);
    setRivalFinanceHistory(s.rivalFinanceHistory || []);
    setUniverseFeed((s.universeFeed || []).map((item) => ({ ...item, date: new Date(item.date) })));
    setStorylines(s.storylines || {}); setStableStorylines(s.stableStorylines || {}); setStables(s.stables || []);
    setNetworkDeal(s.networkDeal || null); setNetworkOffers(s.networkOffers || []);
    setSponsorDeal(s.sponsorDeal || null); setSponsorOffers(s.sponsorOffers || []);
    setBankruptWeeks(s.bankruptWeeks || 0); setPeakPopularity(s.peakPopularity || 0);
    setLoan(s.loan || null); setRequests(s.requests || []); setPlayerLastTier(s.playerLastTier || "Unknown");
    setNotes(s.notes || "");
    setUnlockedAchievements(s.unlockedAchievements || []);
    setHasEverTakenLoan(!!s.hasEverTakenLoan); setHasEverRepaidLoanFully(!!s.hasEverRepaidLoanFully);
    setHasSurvivedCatastrophe(!!s.hasSurvivedCatastrophe); setHasBeenFired(!!s.hasBeenFired); setHasRetiredOnce(!!s.hasRetiredOnce);
    setHasCreatedStableManually(!!s.hasCreatedStableManually); setHasCreatedRivalryManually(!!s.hasCreatedRivalryManually);
    setPendingLegacies(s.pendingLegacies || []); setHasSeenLegacyDebut(!!s.hasSeenLegacyDebut);
    setHasRenamedWrestler(!!s.hasRenamedWrestler); setBookedFatal4Ever(!!s.bookedFatal4Ever); setBookedCageEver(!!s.bookedCageEver);
    setMaxAttendanceEver(s.maxAttendanceEver || 0); setHasSoldOutEver(!!s.hasSoldOutEver); setMaxShowRatingEver(s.maxShowRatingEver || 0);
    setHallOfFame(s.hallOfFame || { bestMatch: null, biggestShow: null, longestReign: null, bestMatchRival: null, biggestShowRival: null, longestReignRival: null });
    setWrestlerReignCounts(s.wrestlerReignCounts || {});
    setMerchStock(s.merchStock || 0); setMerchQualityTier(s.merchQualityTier || 0); setWrestlerMerchSales(s.wrestlerMerchSales || {});
    setRecentMatchups(s.recentMatchups || []);
    setScheduledEvents(s.scheduledEvents || []);
    setEventTemplates(s.eventTemplates || []);
    setWorkingAgreements(s.workingAgreements || []);
    setFeederCompany(s.feederCompany || null);
    setDevelopmentalAlumni(s.developmentalAlumni || []);
    setProductionTier(s.productionTier ?? 0);
    setFanTrendKey(s.fanTrendKey || FAN_TRENDS[0].key);
    setStaffPool(s.staffPool || buildStaffPool());
    setShortlist(s.shortlist || []);
    setPendingOffers(s.pendingOffers || []);
    setShowsDoneThisWeek(s.showsDoneThisWeek || []);
    setArenaIdx(1); setCity(null);
    setSegments([]);
    setDarkMatches([]);
    setShowResult(null); setGameOver(false); setTab("company");
  };

  const refreshSaveSlots = async () => {
    try {
      const res = await window.storage.get("booked-save", false);
      setSaveInfo(res ? JSON.parse(res.value) : null);
    } catch (e) {
      setSaveInfo(null);
    }
    try {
      const res = await window.storage.get("booked-autosave", false);
      setAutoSaveInfo(res ? JSON.parse(res.value) : null);
    } catch (e) {
      setAutoSaveInfo(null);
    }
  };
  const refreshPreviousGames = async () => {
    try {
      const res = await window.storage.get("booked-previous-games", false);
      setPreviousGames(res ? JSON.parse(res.value) : []);
    } catch (e) {
      setPreviousGames([]);
    }
  };
  const saveGame = async () => {
    setSaveActionMsg("Saving...");
    const full = buildSaveSnapshot();
    try {
      const payload = JSON.stringify(full);
      if (payload.length > 4_500_000) {
        setSaveActionMsg(`Save too large (${Math.round(payload.length / 1024)}KB) — try clearing old news or ask for a smaller save format.`);
        setTimeout(() => setSaveActionMsg(""), 5000);
        return;
      }
      await window.storage.set("booked-save", payload, false);
      setSaveActionMsg("Saved!");
      refreshSaveSlots();
      setTimeout(() => setSaveActionMsg(""), 2500);
      return;
    } catch (e) {
      // Full save failed — try a stripped-down core save (bank, roster, titles) so
      // something persists even if one specific section is tripping up storage.
      try {
        const core = { v: 1, core: true, savedAt: full.savedAt, bank: full.bank, weekCount: full.weekCount, totalShowsRun: full.totalShowsRun, totalMatchesRun: full.totalMatchesRun, companyName: full.companyName, playerName: full.playerName, pool: full.pool, titles: full.titles, rivalCompanies: full.rivalCompanies, rivalTitles: full.rivalTitles, perUseRoster: full.perUseRoster };
        await window.storage.set("booked-save", JSON.stringify(core), false);
        setSaveActionMsg(`Full save failed (${e && e.message ? e.message : String(e)}) — saved a core backup instead (bank, roster, titles only; no news/history/deals).`);
        refreshSaveSlots();
      } catch (e2) {
        setSaveActionMsg(`Save failed entirely: ${e2 && e2.message ? e2.message : String(e2)}`);
      }
      setTimeout(() => setSaveActionMsg(""), 8000);
    }
  };
  const loadGame = async () => {
    setSaveActionMsg("Loading...");
    try {
      const res = await window.storage.get("booked-save", false);
      if (res) applySaveSnapshot(JSON.parse(res.value));
      setSaveActionMsg("");
    } catch (e) {
      setSaveActionMsg("Load failed.");
      setTimeout(() => setSaveActionMsg(""), 2500);
    }
  };
  const loadAutoSave = async () => {
    setSaveActionMsg("Loading...");
    try {
      const res = await window.storage.get("booked-autosave", false);
      if (res) applySaveSnapshot(JSON.parse(res.value));
      setSaveActionMsg("");
    } catch (e) {
      setSaveActionMsg("Load failed.");
      setTimeout(() => setSaveActionMsg(""), 2500);
    }
  };
  const deleteSavedGame = async () => {
    try {
      await window.storage.delete("booked-save", false);
      refreshSaveSlots();
    } catch (e) {}
  };
  // Silent autosave after every show — separate key from the manual save,
  // so it never overwrites a save you made on purpose. No status message; if
  // it fails, the player can still save manually, so we just retry next show.
  const autoSaveGame = async () => {
    try {
      const payload = JSON.stringify(buildSaveSnapshot());
      if (payload.length <= 4_500_000) await window.storage.set("booked-autosave", payload, false);
    } catch (e) {}
  };
  // Archives a run into Previous Games — used both when you get fired and when
  // you voluntarily retire, with a reason so the history reads correctly either way.
  const archiveGame = async (reason) => {
    const summary = {
      companyName, endedAt: new Date().toISOString(), weeksSurvived: weekCount - 1,
      showsRun: totalShowsRun, peakPopularity: Math.round(peakPopularity), titlesCreated: titles.length,
      finalTier: popularityTier(popularity), reason,
    };
    try {
      const res = await window.storage.get("booked-previous-games", false);
      const list = res ? JSON.parse(res.value) : [];
      await window.storage.set("booked-previous-games", JSON.stringify([summary, ...list].slice(0, 20)), false);
    } catch (e) {}
  };
  const retireAndStartNew = async () => {
    await archiveGame("retired");
    setHasRetiredOnce(true);
    resetGame();
    setRetiring(false);
  };
  // Wipes every trace of this game from storage — the manual save, the
  // autosave, and the entire Previous Games history. Irreversible.
  const wipeAllProgress = async () => {
    try { await window.storage.delete("booked-save", false); } catch (e) {}
    try { await window.storage.delete("booked-autosave", false); } catch (e) {}
    try { await window.storage.delete("booked-previous-games", false); } catch (e) {}
    setSaveInfo(null); setAutoSaveInfo(null); setPreviousGames([]);
    setUnlockedAchievements([]);
    setHasEverTakenLoan(false); setHasEverRepaidLoanFully(false); setHasSurvivedCatastrophe(false);
    setHasBeenFired(false); setHasRetiredOnce(false); setHasCreatedStableManually(false); setHasCreatedRivalryManually(false);
    setHasSeenLegacyDebut(false);
    setHasRenamedWrestler(false); setBookedFatal4Ever(false); setBookedCageEver(false);
    setMaxAttendanceEver(0); setHasSoldOutEver(false); setMaxShowRatingEver(0);
    setHallOfFame({ bestMatch: null, biggestShow: null, longestReign: null, bestMatchRival: null, biggestShowRival: null, longestReignRival: null });
    setWrestlerReignCounts({});
    resetGame();
    setRetiring(false);
    setConfirmingWipe(false);
  };

  useEffect(() => {
    if (tab === "saves") { refreshSaveSlots(); refreshPreviousGames(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Just look up what's in storage, on mount — the landing menu (CONTINUE /
  // LOAD GAME) reads saveInfo/autoSaveInfo to decide what to offer; nothing
  // is actually loaded into live state until the player picks something.
  useEffect(() => {
    refreshSaveSlots();
    refreshPreviousGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whichever of the manual save / autosave is more recent — what CONTINUE
  // loads, and what a fresh New Game (from the menu, before anything's been
  // loaded) safely leaves behind untouched in storage.
  const newestSave = (() => {
    if (!saveInfo && !autoSaveInfo) return null;
    if (!saveInfo) return autoSaveInfo;
    if (!autoSaveInfo) return saveInfo;
    return new Date(autoSaveInfo.savedAt) > new Date(saveInfo.savedAt) ? autoSaveInfo : saveInfo;
  })();
  const continueGame = () => { if (newestSave) { applySaveSnapshot(newestSave); setView("game"); } };
  const startNewGameFromMenu = () => { resetGame(); setView("game"); };
  // Take over an existing rival company instead of starting a brand new
  // small promotion — inherits its starting roster (from ROSTER_DATA's
  // promo assignments), funds, and reputation. Built as one self-contained
  // pass rather than resetGame() + follow-up tweaks: chaining more setState
  // calls after resetGame() in the same handler would read its own stale
  // pre-reset closures (pool, rivalCompanies, etc. don't update until the
  // next render), so every piece here is computed locally first.
  const takeOverCompanyFromMenu = (co) => {
    const freshPool = buildInitialPool(); // also (re)populates _initialChampions as a side effect
    const rivalIdx = RIVAL_COMPANIES.findIndex((c) => c.id === co.id);
    const startingFunds = RIVAL_STARTING_FUNDS[rivalIdx] ?? 25000;
    const transferredPool = freshPool.map((w) => (w.contractedTo === co.id ? { ...w, contractedTo: "player", contractExpiresWeek: 53 } : w));
    const freshStaff = buildStaffPool().map((s) => (s.contractedTo === co.id ? { ...s, contractedTo: "player" } : s));
    const remainingRivals = RIVAL_COMPANIES.filter((c) => c.id !== co.id).map((c, i) => ({ ...c, funds: RIVAL_STARTING_FUNDS[RIVAL_COMPANIES.indexOf(c)] ?? 25000, showsRun: 0, lastTier: popularityTier(c.popularity) }));
    const remainingRivalTitles = RIVAL_COMPANIES.filter((c) => c.id !== co.id).map((c) => ({ id: `${c.id}-title`, name: c.titleName, companyId: c.id, holder: _initialChampions[c.id] || null }));
    // Seed enough visited cities (at the company's own popularity level) that
    // the city-diversity cap doesn't immediately clip their inherited
    // reputation down — see popularity/cityDiversityCap below.
    const citiesNeeded = co.popularity <= 15 ? 1 : Math.min(CITIES.length, Math.ceil((co.popularity - 15) / 14) + 1);
    const seededCities = CITIES.slice(0, citiesNeeded);
    const champion = _initialChampions[co.id] || null;

    setBank(startingFunds);
    setWeekCount(1);
    setTotalShowsRun(0);
    setTotalMatchesRun(0);
    setCompanyName(co.name);
    setPlayerName(co.bookerName); setPlayerAge(""); setPlayerSex("");
    setCityPopularity({ ...Object.fromEntries(CITIES.map((c) => [c, 0])), ...Object.fromEntries(seededCities.map((c) => [c, co.popularity])) });
    setCityVisits({ ...Object.fromEntries(CITIES.map((c) => [c, 0])), ...Object.fromEntries(seededCities.map((c) => [c, 1])) });
    setPool(transferredPool);
    setRivalCompanies(remainingRivals);
    setPlayerLastTier(popularityTier(co.popularity));
    setRivalTitles(remainingRivalTitles);
    setNextReserveIndex(BULK_DEBUT_COUNT);
    setNextStaggeredDebutIndex(0);
    setPerUseRoster([]);
    setTitles([{ id: "world", name: co.titleName, type: "singles", holders: champion ? [champion] : [], reignStartWeek: champion ? 1 : null, totalDefenses: 0, currentReignDefenses: 0, prestige: 0, history: [] }]);
    setNumber1Contenders([]);
    setShowHistory([]);
    setRivalShowHistory([]);
    setRivalFinanceHistory([]);
    setFinanceHistory([{ weekNumber: 0, year: 1, weekOfYear: 0, bank: startingFunds }]);
    setUniverseFeed([{ id: "takeover-1", showNumber: 1, date: new Date(), text: `${co.name} has new ownership — fresh leadership takes the reins.`, type: "title", companyId: "player" }]);
    setStorylines({});
    setStables(PRESET_STABLES.map((s, i) => ({ id: `preset-stable-${i}`, name: s.name, members: s.members, matches: 0, wins: 0, losses: 0, rivalStableIds: [] })));
    setStableStorylines({});
    setShowResult(null);
    setNetworkDeal(null); setNetworkOffers([]);
    setSponsorDeal(null); setSponsorOffers([]);
    setBankruptWeeks(0);
    setLoan(null);
    setRequests([]);
    setPeakPopularity(co.popularity);
    setArenaIdx(1);
    setShowMinutesTarget(ARENAS[1].showMinutes);
    setCity(null);
    setStartingCity(seededCities[0] || null);
    setMerchStock(0); setMerchQualityTier(0); setWrestlerMerchSales({});
    setRecentMatchups([]);
    setScheduledEvents([]);
    setEventTemplates([]);
    setWorkingAgreements([]);
    setFeederCompany(null);
    setDevelopmentalAlumni([]);
    setProductionTier(0);
    setFanTrendKey(FAN_TRENDS[rand(0, FAN_TRENDS.length - 1)].key);
    setPendingLegacies([]);
    setPendingOffers([]);
    setShortlist([]);
    setShowsDoneThisWeek([]);
    setStaffPool(freshStaff);
    setSegments([]);
    setDarkMatches([]);
    setNotes("");
    setTab("company");
    setGameOver(false);
    setMenuNewGameOpen(false);
    setView("game");
  };
  const loadSaveFromMenu = async (which) => {
    if (which === "manual") await loadGame(); else await loadAutoSave();
    setView("game");
  };
  const openWorldEditorFromMenu = () => { setTab("backoffice"); setBackOfficeSubTab("worldeditor"); setView("game"); };
  const backToMenu = () => { refreshSaveSlots(); refreshPreviousGames(); setView("menu"); };

  useEffect(() => {
    // weekCount only advances once a show has actually been run — skips the
    // initial mount (weekCount === 1) so we don't autosave an empty new game.
    if (weekCount > 1) autoSaveGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekCount]);

  // A scheduled event template due this week pre-sets the Book screen's show
  // level and venue — the player still builds and runs the card themselves,
  // this just saves re-picking the same weekly/monthly/PPV setup every time.
  useEffect(() => {
    if (activeEventTemplate) {
      const due = activeEventTemplate;
      setShowLevel(due.level);
      setArenaIdx(due.arenaIdx);
      setTicketPrice(ARENAS[due.arenaIdx].ticketMin);
      setAdCampaign("none");
      setShowMinutesTarget(due.showMinutes || ARENAS[due.arenaIdx].showMinutes);
      setCity(due.preferredCity || startingCity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekCount, showsDoneThisWeek]);

  const checkAchievements = () => {
    const ctx = {
      tier: popularityTier(popularity), avgRosterOverall, rosterCount: roster.length, roster,
      companyName, playerName, hasRenamedWrestler, titles, bank, weekCount,
      hasCreatedStableManually, hasCreatedRivalryManually,
      hasEverTakenLoan, hasEverRepaidLoanFully, hasSurvivedCatastrophe, hasBeenFired, hasRetiredOnce,
      hasSeenLegacyDebut,
      bookedFatal4Ever, bookedCageEver, maxAttendanceEver, hasSoldOutEver, maxShowRatingEver,
      unlockedCitiesCount: unlockedCities.length,
      totalMerchRevenue: Object.values(wrestlerMerchSales).reduce((s, v) => s + v, 0),
      merchQualityTier,
    };
    const newly = ACHIEVEMENTS.filter((a) => !unlockedAchievements.some((u) => u.id === a.id) && a.check(ctx));
    if (newly.length > 0) {
      setUnlockedAchievements((prev) => [...prev, ...newly.map((a) => ({ id: a.id, unlockedAtWeek: weekCount }))]);
      setUniverseFeed((feed) => [...newly.map((a, i) => ({ id: `ach-${weekCount}-${i}`, showNumber: weekCount, date: new Date(), text: `Achievement unlocked: ${a.name} — ${a.desc}`, type: "title", companyId: "player" })), ...feed].slice(0, 300));
    }
  };
  useEffect(() => {
    if (weekCount > 1) checkAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekCount]);

  const resetGame = () => {
    if (gameOver) { archiveGame("fired"); setHasBeenFired(true); }
    setBank(20000);
    setWeekCount(1);
    setTotalShowsRun(0);
    setTotalMatchesRun(0);
    setCompanyName("Ringside Empire Wrestling");
    setPlayerName(""); setPlayerAge(""); setPlayerSex("");
    setCityPopularity(Object.fromEntries(CITIES.map((c) => [c, 0])));
    setCityVisits(Object.fromEntries(CITIES.map((c) => [c, 0])));
    setPool(buildInitialPool());
    setRivalCompanies(RIVAL_COMPANIES.map((c, i) => ({ ...c, funds: RIVAL_STARTING_FUNDS[i] ?? 25000, showsRun: 0, lastTier: popularityTier(c.popularity) })));
    setPlayerLastTier("Unknown");
    setRivalTitles(RIVAL_COMPANIES.map((c) => ({ id: `${c.id}-title`, name: c.titleName, companyId: c.id, holder: _initialChampions[c.id] || null })));
    setNextReserveIndex(BULK_DEBUT_COUNT);
    setNextStaggeredDebutIndex(0);
    setPerUseRoster([]);
    setTitles([{ id: "world", name: "World Championship", type: "singles", holders: [], reignStartWeek: null, totalDefenses: 0, currentReignDefenses: 0, prestige: 0, history: [] }]);
    setNumber1Contenders([]);
    setShowHistory([]);
    setRivalShowHistory([]);
    setRivalFinanceHistory([]);
    setFinanceHistory([{ weekNumber: 0, year: 1, weekOfYear: 0, bank: 20000 }]);
    setUniverseFeed([]);
    setStorylines({});
    setStables(PRESET_STABLES.map((s, i) => ({ id: `preset-stable-${i}`, name: s.name, members: s.members, matches: 0, wins: 0, losses: 0, rivalStableIds: [] })));
    setStableStorylines({});
    setShowResult(null);
    setNetworkDeal(null); setNetworkOffers([]);
    setSponsorDeal(null); setSponsorOffers([]);
    setBankruptWeeks(0);
    setLoan(null);
    setRequests([]);
    setPeakPopularity(0);
    setArenaIdx(1);
    setShowMinutesTarget(ARENAS[1].showMinutes);
    setCity(null);
    setStartingCity(null);
    setMerchStock(0); setMerchQualityTier(0); setWrestlerMerchSales({});
    setRecentMatchups([]);
    setScheduledEvents([]);
    setEventTemplates([]);
    setWorkingAgreements([]);
    setFeederCompany(null);
    setDevelopmentalAlumni([]);
    setProductionTier(0);
    setFanTrendKey(FAN_TRENDS[rand(0, FAN_TRENDS.length - 1)].key);
    setPendingLegacies([]);
    setPendingOffers([]);
    setShortlist([]);
    setShowsDoneThisWeek([]);
    setStaffPool(buildStaffPool());
    setSegments([]);
    setDarkMatches([]);
    setNotes("");
    setTab("company");
    setGameOver(false);
  };

  const yearsAvailable = [...new Set(financeHistory.map((f) => f.year))];
  const financeChartData = financeHistory.filter((f) => f.year === financeYear);

  // Shared top-N active-storylines list — used by the Office dashboard widget
  // and the booking screen's side panel so a booker can see what's hot without
  // leaving the Book tab.
  const renderStorylinesMini = (limit) => {
    const yourNames = new Set([...roster, ...perUseWrestlers].map((w) => w.name));
    const seen = new Set();
    const list = [];
    pool.forEach((w) => {
      if (!yourNames.has(w.name)) return;
      w.rivals.forEach((otherName) => {
        const other = pool.find((x) => x.name === otherName);
        if (!other || !other.rivals.includes(w.name)) return;
        const key = [w.name, otherName].sort().join("|");
        if (seen.has(key)) return;
        seen.add(key);
        const story = storylines[key] || { intensity: 20 };
        list.push({ key, a: w.name, b: otherName, intensity: story.intensity });
      });
    });
    const seenStable = new Set();
    stables.forEach((s) => {
      (s.rivalStableIds || []).forEach((otherId) => {
        const other = stables.find((x) => x.id === otherId);
        if (!other || !(other.rivalStableIds || []).includes(s.id)) return;
        const key = [s.id, otherId].sort().join("|");
        if (seenStable.has(key)) return;
        seenStable.add(key);
        const story = stableStorylines[key] || { intensity: 20 };
        list.push({ key, a: s.name, b: other.name, intensity: story.intensity });
      });
    });
    list.sort((x, y) => y.intensity - x.intensity);
    if (list.length === 0) return <div className="text-xs text-[#8B8593] italic">None involving your roster yet.</div>;
    return (
      <div className="space-y-2">
        {list.slice(0, limit).map((r) => {
          const stage = feudStage(r.intensity);
          const readyToBlow = stage.label === "Ready to Blow Off";
          return (
            <div key={r.key} className="text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1">{readyToBlow && <Flame size={11} style={{ color: "var(--gold)" }} />} {r.a} <span className="text-[#8B6BC0]">vs</span> {r.b}</span>
                <span className="text-[10px] font-bold" style={{ color: readyToBlow ? "var(--gold)" : "#8B8593" }}>{stage.label}</span>
              </div>
              <div className="h-1 bg-[#232029] rounded-full overflow-hidden mt-1">
                <div className="h-full bg-gradient-to-r from-[#5B3B8C] to-red-500" style={{ width: `${r.intensity}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Shared between Roster > Rivalries (full management: create/remove) and the
  // standalone Storylines screen (overview only) — same data, same cards,
  // just whether the create-rivalry controls show. Mirrors the existing
  // renderTagTeamsPanel(onlyMine) pattern just below.
  const renderRivalriesPanel = (showCreateControls) => (
    <div>
      <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">ACTIVE RIVALRIES</div>
      <div className="text-[10px] text-[#8B8593] mb-3">Book two rivals against each other for a rating boost — keep it up and the feud can blow off into a big payoff match. They also form on their own from locker-room news.</div>

      {showCreateControls && (
        !creatingRivalry ? (
          <button onClick={() => setCreatingRivalry(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 mb-3 text-xs font-bold border border-dashed border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#17151C] rounded-lg">
            <Plus size={13} /> Create Rivalry
          </button>
        ) : (
          <div className="bg-[#17151C] border border-[#5B3B8C] rounded-lg p-4 space-y-3 mb-3">
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">NEW RIVALRY</div>
            <div className="flex gap-2">
              {["singles", "tag"].map((t) => (
                <button key={t} onClick={() => { setNewRivalryType(t); setNewRivalryA(""); setNewRivalryB(""); }} className={`px-3 py-1.5 rounded text-[11px] font-bold border ${newRivalryType === t ? "bg-[#5B3B8C] border-[#5B3B8C] text-[#F2ECDD]" : "border-[#2B2733] text-[#8B8593]"}`} style={newRivalryType === t ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C", color: "#F2ECDD" } : undefined}>
                  {t === "singles" ? "Singles" : "Tag Team"}
                </button>
              ))}
            </div>
            {newRivalryType === "singles" ? (
              <div className="grid grid-cols-2 gap-2">
                <select value={newRivalryA} onChange={(e) => setNewRivalryA(e.target.value)} className="bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                  <option value="">Wrestler A...</option>
                  {bookable.map((w) => <option key={w.name} value={w.name} disabled={w.name === newRivalryB}>{w.name}</option>)}
                </select>
                <select value={newRivalryB} onChange={(e) => setNewRivalryB(e.target.value)} className="bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                  <option value="">Wrestler B...</option>
                  {bookable.map((w) => <option key={w.name} value={w.name} disabled={w.name === newRivalryA}>{w.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <select value={newRivalryA} onChange={(e) => setNewRivalryA(e.target.value)} className="bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                  <option value="">Tag team A...</option>
                  {stables.map((s) => <option key={s.id} value={s.id} disabled={s.id === newRivalryB}>{s.name}</option>)}
                </select>
                <select value={newRivalryB} onChange={(e) => setNewRivalryB(e.target.value)} className="bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                  <option value="">Tag team B...</option>
                  {stables.map((s) => <option key={s.id} value={s.id} disabled={s.id === newRivalryA}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={confirmCreateRivalry} disabled={!newRivalryA || !newRivalryB} className="flex-1 py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded">
                Create
              </button>
              <button onClick={() => { setCreatingRivalry(false); setNewRivalryA(""); setNewRivalryB(""); }} className="px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Cancel</button>
            </div>
          </div>
        )
      )}

      <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5">SINGLES</div>
      <div className="space-y-2 mb-4">
        {(() => {
          const yourNames = new Set([...roster, ...perUseWrestlers].map((w) => w.name));
          const seen = new Set();
          const rivalryList = [];
          pool.forEach((w) => {
            if (!yourNames.has(w.name)) return;
            w.rivals.forEach((otherName) => {
              const other = pool.find((x) => x.name === otherName);
              if (!other || !other.rivals.includes(w.name)) return;
              const key = [w.name, otherName].sort().join("|");
              if (seen.has(key)) return;
              seen.add(key);
              const story = storylines[key] || { intensity: 20, matchesFought: 0 };
              rivalryList.push({ key, a: w.name, b: otherName, intensity: story.intensity, matchesFought: story.matchesFought });
            });
          });
          rivalryList.sort((x, y) => y.intensity - x.intensity);
          if (rivalryList.length === 0) return <div className="text-xs text-[#8B8593] italic">None involving your wrestlers yet.</div>;
          return rivalryList.map((r) => {
            const stage = feudStage(r.intensity);
            const readyToBlow = stage.label === "Ready to Blow Off";
            return (
              <div key={r.key} className="bg-[#17151C] rounded-lg p-3" style={{ border: `1px solid ${readyToBlow ? "#C9A227" : "#2B2733"}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm flex items-center gap-1.5">{readyToBlow && <Flame size={13} style={{ color: "var(--gold)" }} />} {r.a} <span className="text-[#8B6BC0]">vs</span> {r.b}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#8B8593]">{r.matchesFought} fought</span>
                    {showCreateControls && <button onClick={() => removeWrestlerRivalry(r.a, r.b)} className="text-[#8B8593] hover:text-red-400"><X size={14} /></button>}
                  </div>
                </div>
                <div className="flex justify-between text-[9px] text-[#8B8593] mb-1"><span>INTENSITY &middot; <span className="font-bold" style={{ color: readyToBlow ? "var(--gold)" : "#8B6BC0" }}>{stage.label.toUpperCase()}</span></span><span className="text-[#F2ECDD] font-bold">{r.intensity}/100</span></div>
                <div className="h-1.5 bg-[#232029] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#5B3B8C] to-red-500" style={{ width: `${r.intensity}%` }} />
                </div>
                <div className="text-[9px] text-[#8B8593] italic mt-1">{stage.hint}</div>
              </div>
            );
          });
        })()}
      </div>

      <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5">TAG TEAM</div>
      <div className="space-y-2">
        {(() => {
          const seen = new Set();
          const rivalryList = [];
          stables.forEach((s) => {
            (s.rivalStableIds || []).forEach((otherId) => {
              const other = stables.find((x) => x.id === otherId);
              if (!other || !(other.rivalStableIds || []).includes(s.id)) return;
              const key = [s.id, otherId].sort().join("|");
              if (seen.has(key)) return;
              seen.add(key);
              const story = stableStorylines[key] || { intensity: 20, matchesFought: 0 };
              rivalryList.push({ key, a: s, b: other, intensity: story.intensity, matchesFought: story.matchesFought });
            });
          });
          rivalryList.sort((x, y) => y.intensity - x.intensity);
          if (rivalryList.length === 0) return <div className="text-xs text-[#8B8593] italic">None yet.</div>;
          return rivalryList.map((r) => {
            const stage = feudStage(r.intensity);
            const readyToBlow = stage.label === "Ready to Blow Off";
            return (
              <div key={r.key} className="bg-[#17151C] rounded-lg p-3" style={{ border: `1px solid ${readyToBlow ? "#C9A227" : "#2B2733"}` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm flex items-center gap-1.5">{readyToBlow && <Flame size={13} style={{ color: "var(--gold)" }} />} {r.a.name} <span className="text-[#8B6BC0]">vs</span> {r.b.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#8B8593]">{r.matchesFought} fought</span>
                    {showCreateControls && <button onClick={() => removeStableRivalry(r.a.id, r.b.id)} className="text-[#8B8593] hover:text-red-400"><X size={14} /></button>}
                  </div>
                </div>
                <div className="flex justify-between text-[9px] text-[#8B8593] mb-1"><span>INTENSITY &middot; <span className="font-bold" style={{ color: readyToBlow ? "var(--gold)" : "#8B6BC0" }}>{stage.label.toUpperCase()}</span></span><span className="text-[#F2ECDD] font-bold">{r.intensity}/100</span></div>
                <div className="h-1.5 bg-[#232029] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#5B3B8C] to-red-500" style={{ width: `${r.intensity}%` }} />
                </div>
                <div className="text-[9px] text-[#8B8593] italic mt-1">{stage.hint}</div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );

  const renderTagTeamsPanel = (onlyMine) => (
    <div>
      <div className="text-[10px] text-[#8B8593] mb-3">A stable is up to 5 wrestlers. The first two you add become the core tag team — the pairing that tracks a win-loss record and can challenge for tag titles. Booking a tag match filters the second slot to stablemates once you've picked the first.</div>

      {!creatingStable ? (
        <button onClick={() => setCreatingStable(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 mb-3 text-xs font-bold border border-dashed border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#17151C] rounded-lg">
          <Plus size={13} /> Create Tag Team or Stable
        </button>
      ) : (
        <div className="bg-[#17151C] border border-[#5B3B8C] rounded-lg p-4 space-y-3 mb-3">
          <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">NEW STABLE</div>
          <input value={newStableName} onChange={(e) => setNewStableName(e.target.value)} placeholder="Stable name" className="w-full border border-[#2B2733] rounded px-3 py-2 text-xs" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
          <div className="text-[9px] text-[#8B8593]">Pick {STABLE_MIN_MEMBERS}-{STABLE_MAX_MEMBERS} members — first two picked become the core tag team ({newStableMembers.length}/{STABLE_MAX_MEMBERS} selected)</div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {bookable.map((w) => (
              <button key={w.name} onClick={() => toggleStableMember(w.name)} disabled={!newStableMembers.includes(w.name) && newStableMembers.length >= STABLE_MAX_MEMBERS} className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs border ${newStableMembers.includes(w.name) ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]"} disabled:opacity-40`} style={newStableMembers.includes(w.name) ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C" } : undefined}>
                <span>{w.name}</span>
                {newStableMembers.includes(w.name) && <span className="text-[9px]">{newStableMembers.indexOf(w.name) < 2 ? "Tag team" : `#${newStableMembers.indexOf(w.name) + 1}`}</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={confirmCreateStable} disabled={!newStableName.trim() || newStableMembers.length < STABLE_MIN_MEMBERS} className="flex-1 py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded">
              Create
            </button>
            <button onClick={() => { setCreatingStable(false); setNewStableName(""); setNewStableMembers([]); }} className="px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {stables.filter((s) => !onlyMine || s.members.slice(0, 2).every((n) => bookable.some((w) => w.name === n))).map((s) => {
          const coreTeam = s.members.slice(0, 2);
          const extras = s.members.slice(2);
          const winPct = s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : 0;
          const addable = bookable.filter((w) => !s.members.includes(w.name) && s.members.length < STABLE_MAX_MEMBERS);
          return (
            <div key={s.id} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {editingStableId === s.id ? (
                  <>
                    <input value={editingStableName} onChange={(e) => setEditingStableName(e.target.value)} className="flex-1 border border-[#5B3B8C] rounded px-2 py-1 text-sm font-bold" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} autoFocus />
                    <button onClick={confirmRenameStable} className="text-[#8B6BC0] hover:text-[#F2ECDD]"><Check size={16} /></button>
                    <button onClick={() => setEditingStableId(null)} className="text-[#8B8593] hover:text-[#F2ECDD]"><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <Users2 size={16} className="text-[#8B6BC0]" />
                    <div className="font-black text-base flex-1" style={{ fontFamily: "Anton, sans-serif" }}>{s.name}</div>
                    <button onClick={() => startRenameStable(s)} className="text-[#8B8593] hover:text-[#F2ECDD]"><Pencil size={13} /></button>
                    <button onClick={() => disbandStable(s.id)} className="text-[#8B8593] hover:text-red-400"><X size={16} /></button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {coreTeam.map((name) => (
                  <span key={name} className="flex items-center gap-1 bg-[#241B33] border border-[#5B3B8C] rounded-full px-2 py-0.5 text-[10px] font-bold text-[#8B6BC0]">
                    {name} <button onClick={() => removeStableMember(s.id, name)}><X size={10} /></button>
                  </span>
                ))}
              </div>
              <div className="text-[10px] text-[#8B8593] mb-2">
                Tag team record: <span className="text-[#F2ECDD] font-bold">{s.wins}-{s.losses}</span> ({s.matches} matches, {winPct}% win rate)
              </div>

              {extras.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {extras.map((name) => (
                    <span key={name} className="flex items-center gap-1 bg-[#131117] border border-[#2B2733] rounded-full px-2 py-0.5 text-[10px] text-[#CFC9BB]">
                      {name} <button onClick={() => removeStableMember(s.id, name)}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}

              {addable.length > 0 && s.members.length < STABLE_MAX_MEMBERS && (
                <select value="" onChange={(e) => e.target.value && addStableMember(s.id, e.target.value)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                  <option value="">+ Add member ({s.members.length}/{STABLE_MAX_MEMBERS})...</option>
                  {addable.map((w) => <option key={w.name} value={w.name}>{w.name}</option>)}
                </select>
              )}
            </div>
          );
        })}
        {stables.filter((s) => !onlyMine || s.members.slice(0, 2).every((n) => bookable.some((w) => w.name === n))).length === 0 && !creatingStable && <div className="text-xs text-[#8B8593] italic">{onlyMine ? "None of your signed wrestlers are on a tag team yet." : "No stables yet."}</div>}
      </div>
    </div>
  );

  if (view === "menu") {
    const menuButtonClass = "w-full py-3 rounded-lg font-bold text-sm border border-[#2B2733] text-[#CFC9BB] hover:border-[#5B3B8C] hover:text-[#F2ECDD] transition-colors";
    const describeSlot = (s) => `${s.companyName} · Wk ${s.weekCount} · £${s.bank.toLocaleString()} · ${formatDate(new Date(s.savedAt))}`;
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4"
        style={{
          color: "#F2ECDD",
          background: `
            radial-gradient(ellipse 100% 65% at 20% -5%, rgba(91,59,140,0.65), transparent 65%),
            radial-gradient(ellipse 80% 60% at 100% 15%, rgba(139,107,192,0.45), transparent 65%),
            radial-gradient(ellipse 110% 75% at 50% 115%, rgba(91,59,140,0.55), transparent 70%),
            linear-gradient(180deg, rgba(58,34,101,0.35), rgba(10,10,12,0.1) 55%),
            #0A0A0C
          `,
        }}
      >
        <style>{FONT_IMPORT}</style>
        <div className="max-w-sm w-full">
          <div className="text-center mb-10">
            <div className="text-5xl tracking-tight leading-none" style={{ fontFamily: "Anton, sans-serif" }}>BOOKED<span className="text-[#8B6BC0]">!</span></div>
            <div className="text-[10px] tracking-[0.3em] text-[#8B8593] font-semibold mt-1">RINGSIDE EMPIRE</div>
          </div>
          <div className="space-y-2.5">
            {newestSave && (
              <button onClick={continueGame} className="w-full py-3.5 rounded-lg font-black text-sm tracking-widest" style={{ backgroundColor: "#5B3B8C", color: "#F2ECDD", fontFamily: "Anton, sans-serif" }}>
                CONTINUE — {newestSave.companyName}
              </button>
            )}
            <button onClick={() => { setMenuNewGameOpen((o) => !o); setMenuLoadOpen(false); setMenuSettingsOpen(false); }} className={menuButtonClass}>NEW GAME</button>
            {menuNewGameOpen && (
              <div className="bg-[#131117] border border-[#2B2733] rounded-lg p-3 space-y-2">
                <button onClick={startNewGameFromMenu} className="w-full py-2.5 rounded-lg font-bold text-xs border border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#241B33]">
                  Start Fresh — a brand new small promotion
                </button>
                <div className="text-[9px] text-[#8B8593] tracking-widest font-bold pt-1">OR TAKE OVER AN EXISTING PROMOTION</div>
                {RIVAL_COMPANIES.map((co, i) => (
                  <button key={co.id} onClick={() => takeOverCompanyFromMenu(co)} className="w-full text-left px-3 py-2 rounded-lg border border-[#2B2733] hover:border-[#5B3B8C] transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">{co.name}</span>
                      <span className="text-[10px] text-[#8B8593]">{popularityTier(co.popularity)} ({co.popularity})</span>
                    </div>
                    <div className="text-[10px] text-[#8B8593] mt-0.5">Booker: {co.bookerName} &middot; Starting funds £{(RIVAL_STARTING_FUNDS[i] ?? 25000).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => { setMenuLoadOpen((o) => !o); setMenuSettingsOpen(false); setMenuNewGameOpen(false); }} className={menuButtonClass}>LOAD GAME</button>
            {menuLoadOpen && (
              <div className="bg-[#131117] border border-[#2B2733] rounded-lg p-3 space-y-2">
                {saveInfo ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] text-[#8B8593]">{describeSlot(saveInfo)}</div>
                    <button onClick={() => loadSaveFromMenu("manual")} className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded bg-[#5B3B8C] hover:bg-[#6C47A3]">Load Save</button>
                  </div>
                ) : <div className="text-[10px] text-[#8B8593] italic">No manual save yet.</div>}
                {autoSaveInfo ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] text-[#8B8593]">{describeSlot(autoSaveInfo)}</div>
                    <button onClick={() => loadSaveFromMenu("auto")} className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded border border-[#5B3B8C] text-[#8B6BC0]">Load Autosave</button>
                  </div>
                ) : <div className="text-[10px] text-[#8B8593] italic">No autosave yet.</div>}
              </div>
            )}
            <button onClick={openWorldEditorFromMenu} className={menuButtonClass}>WORLD EDITOR</button>
            <button onClick={() => { setMenuSettingsOpen((o) => !o); setMenuLoadOpen(false); setMenuNewGameOpen(false); }} className={menuButtonClass}>SETTINGS</button>
            {menuSettingsOpen && (
              <div className="bg-[#2A1414] border border-red-500 rounded-lg p-3">
                <div className="text-[10px] text-red-200 mb-2">Wipes your save, autosave, and entire Previous Games history. There is no undo.</div>
                {!confirmingWipe ? (
                  <button onClick={() => setConfirmingWipe(true)} className="w-full py-2 rounded font-bold text-xs border border-red-500 text-red-300">Reset All Data</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={async () => { await wipeAllProgress(); setMenuSettingsOpen(false); }} className="flex-1 py-2 rounded bg-red-700 hover:bg-red-600 font-bold text-xs text-white">Yes, Wipe Everything</button>
                    <button onClick={() => setConfirmingWipe(false)} className="flex-1 py-2 rounded border border-[#2B2733] text-xs text-[#8B8593]">Cancel</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-full w-full text-[#F2ECDD] p-3 sm:p-6 dt:pl-[264px]"
      style={{
        color: "#F2ECDD",
        background: `
          radial-gradient(ellipse 100% 65% at 20% -5%, rgba(91,59,140,0.65), transparent 65%),
          radial-gradient(ellipse 80% 60% at 100% 15%, rgba(139,107,192,0.45), transparent 65%),
          radial-gradient(ellipse 110% 75% at 50% 115%, rgba(91,59,140,0.55), transparent 70%),
          linear-gradient(180deg, rgba(58,34,101,0.35), rgba(10,10,12,0.1) 55%),
          #0A0A0C
        `,
      }}
    >
      <style>{FONT_IMPORT}</style>

      <aside className="hidden dt:flex dt:flex-col fixed left-0 top-0 bottom-0 w-[240px] p-4 overflow-y-auto z-30" style={{ backgroundColor: "#0A0A0C", borderRight: "1px solid #2B2733" }}>
        <button onClick={backToMenu} className="mb-6 text-left" title="Back to main menu">
          <div className="text-xl tracking-tight leading-none" style={{ fontFamily: "Anton, sans-serif" }}>BOOKED<span className="text-[#8B6BC0]">!</span></div>
          <div className="text-[8px] tracking-[0.3em] text-[#8B8593] font-semibold">RINGSIDE EMPIRE</div>
        </button>
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="text-[9px] tracking-widest text-[#8B8593] font-bold mb-1.5 px-2">{section.title.toUpperCase()}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs font-semibold transition-colors"
                    style={{ color: active ? "#F2ECDD" : "#8B8593", backgroundColor: active ? "#241B33" : "transparent" }}
                  >
                    <item.icon size={15} className={active ? "text-[#8B6BC0]" : ""} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      <WrestlerDetailModal wrestler={detailWrestler} pool={pool} titles={titles} weekNumber={weekNumber} perUseRoster={perUseRoster} companyName={companyName} onRename={renameWrestler} onSetAlignment={setAlignment} onSetPush={setPush} onClose={() => setDetailWrestler(null)} />

      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.97)" }}>
          <div className="booked-modal-card border rounded-lg p-6 sm:p-8 max-w-md w-full text-center" style={{ backgroundColor: "#17151C", color: "#F2ECDD", borderColor: "#5B3B8C" }}>
            <Skull size={40} className="text-[#8B6BC0] mx-auto mb-3" />
            <div className="text-3xl font-black mb-1" style={{ fontFamily: "Anton, sans-serif" }}>YOU'VE BEEN FIRED</div>
            <div className="text-xs text-[#8B8593] mb-6">{companyName} ran out of money for {FIRED_THRESHOLD} weeks straight. The board has let you go.</div>
            <div className="grid grid-cols-2 gap-3 mb-6 text-left">
              <div className="bg-[#131117] rounded-lg p-3"><div className="text-[9px] text-[#8B8593] tracking-wide">WEEKS SURVIVED</div><div className="text-lg font-black">{weekCount - 1}</div></div>
              <div className="bg-[#131117] rounded-lg p-3"><div className="text-[9px] text-[#8B8593] tracking-wide">SHOWS RUN</div><div className="text-lg font-black">{totalShowsRun}</div></div>
              <div className="bg-[#131117] rounded-lg p-3"><div className="text-[9px] text-[#8B8593] tracking-wide">PEAK POPULARITY</div><div className="text-lg font-black">{Math.round(peakPopularity)}</div></div>
              <div className="bg-[#131117] rounded-lg p-3"><div className="text-[9px] text-[#8B8593] tracking-wide">TITLES CREATED</div><div className="text-lg font-black">{titles.length}</div></div>
            </div>
            <button onClick={resetGame} className="w-full py-3 bg-[#5B3B8C] hover:bg-[#6C47A3] text-sm font-black tracking-widest rounded" style={{ fontFamily: "Anton, sans-serif" }}>
              START A NEW PROMOTION
            </button>
          </div>
        </div>
      )}
      <PopularityModal open={showPopularityModal} cityPopularity={cityPopularity} cityVisits={cityVisits} popularity={popularity} onClose={() => setShowPopularityModal(false)} />



      {viewingTitleHistory && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setViewingTitleHistory(null)}>
          <div className="booked-modal-card border rounded-lg p-5 max-w-sm w-full max-h-[85vh] overflow-y-auto" style={{ backgroundColor: "#17151C", color: "#F2ECDD" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div className="text-lg font-black" style={{ fontFamily: "Anton, sans-serif" }}>{viewingTitleHistory.name}</div>
              <button onClick={() => setViewingTitleHistory(null)} className="text-[#8B8593] hover:text-[#F2ECDD]"><X size={18} /></button>
            </div>
            <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-2">TITLE HISTORY</div>
            <div className="space-y-1.5">
              {[...viewingTitleHistory.history].reverse().map((h, i) => (
                <div key={i} className="text-xs bg-[#131117] rounded px-2.5 py-2 flex justify-between">
                  <span className="text-[#CFC9BB] font-semibold">{h.holderNames.join(" & ")}</span>
                  <span className="text-[#8B8593]">{h.reignWeeks} week{h.reignWeeks === 1 ? "" : "s"} &middot; {h.defenses || 0} defense{(h.defenses || 0) === 1 ? "" : "s"} (wk {h.wonWeek}&ndash;{h.lostWeek})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {notesOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setNotesOpen(false)}>
          <div className="booked-modal-card border rounded-lg p-5 max-w-md w-full" style={{ backgroundColor: "#17151C", color: "#F2ECDD" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-black flex items-center gap-2" style={{ fontFamily: "Anton, sans-serif" }}><NotebookPen size={18} className="text-[#8B6BC0]" /> NOTES</div>
              <button onClick={() => setNotesOpen(false)} className="text-[#8B8593] hover:text-[#F2ECDD]"><X size={18} /></button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Storyline ideas, booking plans, reminders..."
              rows={10}
              className="w-full border border-[#2B2733] rounded px-3 py-2 text-xs resize-none"
              style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }}
            />
          </div>
        </div>
      )}

      {negotiatingTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setNegotiatingTarget(null)}>
          <div className="booked-modal-card border rounded-lg p-5 max-w-sm w-full" style={{ backgroundColor: "#17151C", color: "#F2ECDD", borderColor: "#5B3B8C" }} onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-black mb-1" style={{ fontFamily: "Anton, sans-serif" }}>NEGOTIATE WITH {negotiatingTarget.name.toUpperCase()}</div>
            <div className="text-[10px] text-[#8B8593] mb-3">Offers are re-rolled fresh each time. A lower fee is more likely to be turned down — though a refusal sometimes comes back as a counteroffer instead of a flat no.</div>
            {negotiationResult === "refused" && <div className="text-xs text-red-400 mb-3">{negotiatingTarget.name} turned that down. They're off-limits for a few weeks.</div>}
            {negotiationResult === "accepted" && <div className="text-xs text-[#8B6BC0] mb-3">Deal struck! Added to your per-use roster.</div>}
            {negotiationResult === "countered" && negotiationCounter && (
              <div className="text-xs text-[#8B6BC0] mb-3">
                {negotiatingTarget.name} turned that down, but says they'd sign for £{negotiationCounter.fee.toLocaleString()}/show instead.
                <div className="flex gap-2 mt-2">
                  <button onClick={acceptNegotiationCounter} className="flex-1 py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] text-xs font-bold rounded text-[#F2ECDD]">Accept £{negotiationCounter.fee.toLocaleString()}</button>
                  <button onClick={walkAwayFromNegotiationCounter} className="flex-1 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Walk Away</button>
                </div>
              </div>
            )}
            {!negotiationResult && (
              <div className="space-y-2">
                {negotiationOffers.map((o) => (
                  <button key={o.key} onClick={() => pickPerUseOffer(o)} className="w-full flex items-center justify-between px-3 py-2.5 rounded border border-[#2B2733] hover:border-[#5B3B8C] text-left">
                    <span className="text-xs font-bold">{o.label}</span>
                    <span className="text-xs text-[#8B8593]">£{o.fee.toLocaleString()}/show &middot; {Math.round(o.refusalChance * 100)}% refuse</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setNegotiatingTarget(null)} className="w-full mt-3 px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Close</button>
          </div>
        </div>
      )}

      <div className="max-w-4xl dt:max-w-6xl mx-auto mb-4 sm:mb-6 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={backToMenu} className="text-left" title="Back to main menu">
            <div className="text-2xl sm:text-3xl tracking-tight leading-none" style={{ fontFamily: "Anton, sans-serif" }}>
              BOOKED<span className="text-[#8B6BC0]">!</span>
            </div>
            <div className="text-[9px] sm:text-[10px] tracking-[0.3em] text-[#8B8593] font-semibold">RINGSIDE EMPIRE</div>
          </button>
          <button onClick={() => setNotesOpen(true)} className="text-[#8B8593] hover:text-[#8B6BC0] p-1.5 self-start" title="Notes">
            <NotebookPen size={18} />
          </button>
          {requests.filter((r) => r.status === "pending").length > 0 && (
            <button onClick={() => { setTab("roster"); setRosterSubTab("requests"); }} className="relative text-[#8B8593] hover:text-[#8B6BC0] p-1.5 self-start" title="Pending requests">
              <HeartPulse size={18} />
              <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {requests.filter((r) => r.status === "pending").length}
              </span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-[#17151C] border border-[#2B2733] rounded-lg px-3 py-2">
            <Calendar size={18} className="text-[#8B6BC0] shrink-0" />
            <div className="leading-tight">
              <div className="font-bold text-sm">Y{currentYear} &middot; Wk {weekOfYear(weekNumber)}{isPPVWeek && <span className="text-[#8B6BC0]"> &middot; PPV</span>}</div>
              <div className="text-[10px] text-[#8B8593]">{formatDate(scheduledDate)}</div>
            </div>
          </div>
          <button onClick={() => setShowPopularityModal(true)} className="flex items-center gap-1.5 bg-[#17151C] border border-[#2B2733] hover:border-[#5B3B8C] rounded-lg px-3 py-2 text-[11px] transition-colors">
            <BarChart3 size={14} className="text-[#8B6BC0]" />
            <span className="font-bold">{popularity}</span>
          </button>
          <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${bankruptWeeks > 0 ? "border-red-500 bg-[#2A1414]" : "bg-[#17151C] border-[#2B2733]"}`}>
            <Wallet size={16} className={bankruptWeeks > 0 ? "text-red-400" : "text-[#8B6BC0]"} />
            <span className="font-bold text-sm sm:text-base booked-mono" style={{ color: bankruptWeeks > 0 ? "#F87171" : "var(--gold)" }}>£{formatMoneyShort(bank)}</span>
            {bankruptWeeks > 0 && <span className="text-[9px] text-red-400 font-bold">{FIRED_THRESHOLD - bankruptWeeks} wk to fired</span>}
          </div>
          {universeFeed.length > 0 && universeFeed[0].id !== dismissedNewsId && (
            <button
              onClick={() => { setTab("news"); setDismissedNewsId(universeFeed[0].id); }}
              className="relative bg-[#17151C] border rounded-lg p-2.5"
              style={{ borderColor: universeFeed[0].type === "injury" ? "#EF4444" : "#5B3B8C" }}
              title={universeFeed[0].text}
            >
              <Newspaper size={16} className={universeFeed[0].type === "injury" ? "text-red-400" : "text-[#8B6BC0]"} />
              <span className="absolute -top-1 -right-1 bg-red-600 rounded-full w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl dt:max-w-6xl mx-auto pt-5">
        {tab === "guide" && (
          <div className="space-y-4">
            <div className="bg-[#17151C] border border-[#5B3B8C] rounded-lg p-4">
              <div className="text-lg font-black mb-2" style={{ fontFamily: "Anton, sans-serif" }}>WELCOME TO BOOKED<span className="text-[#8B6BC0]">!</span> RINGSIDE EMPIRE</div>
              <div className="text-xs text-[#CFC9BB] leading-relaxed space-y-2">
                <p>Originally starting out as a tracker for whilst playing other wrestling games, I realised that I could take it one step further. This was during the 2020 lockdown, so with plenty of time, I jumped into creating a wrestling manager/booker game on spreadsheets.</p>
                <p>Over the next 5+ years I kept going back and improving it. I was happy with what I created, as it was fully playable and featured everything that you will see in this game. There are only a handful of additional items that I didn't get around to including yet but have since included them here.</p>
                <p className="text-[#8B6BC0] font-semibold">Below is a full guide to every section — read through it, or just dive in and come back if you get stuck.</p>
              </div>
            </div>

            {GUIDE_SECTIONS.map((section) => {
              const open = guideOpenSections.has(section.key);
              return (
                <div key={section.key} className="bg-[#17151C] border border-[#2B2733] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setGuideOpenSections((prev) => { const next = new Set(prev); next.has(section.key) ? next.delete(section.key) : next.add(section.key); return next; })}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <span className="font-bold text-sm flex items-center gap-2"><section.icon size={14} className="text-[#8B6BC0]" /> {section.title}</span>
                    <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="px-3 pb-3 space-y-2 border-t border-[#2B2733] pt-3 text-xs text-[#CFC9BB]">
                      {section.body.map((p, i) => <p key={i} className="leading-relaxed">{p}</p>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "company" && (
          <div>
            <div className="flex gap-2 mb-4">
              <SubTabButton active={companySubTab === "overview"} onClick={() => setCompanySubTab("overview")} icon={Landmark} label="Overview" />
              <SubTabButton active={companySubTab === "finance"} onClick={() => setCompanySubTab("finance")} icon={LineChartIcon} label="Finance" />
            </div>

            {companySubTab === "overview" && (
              <div className="space-y-5">
                <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                  <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">COMPANY</div>
                  <div className="mb-3">
                    <div className="text-[10px] text-[#8B8593] mb-1">COMPANY NAME</div>
                    <div className="text-sm font-bold">{companyName} <span className="text-[10px] text-[#8B8593] font-normal">— edit under Menu &middot; Back Office</span></div>
                  </div>
                  <div className="mb-3">
                    <div className="text-[10px] text-[#8B8593] mb-1">BOOKER</div>
                    <div className="text-sm font-bold">{playerName.trim() || "Unnamed"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#131117] rounded-lg p-3">
                      <div className="text-[9px] text-[#8B8593] tracking-wide mb-0.5">BANK BALANCE</div>
                      <div className="font-black text-lg booked-mono" style={{ color: "var(--gold)" }}>£{bank.toLocaleString()}</div>
                    </div>
                    <div className="bg-[#131117] rounded-lg p-3">
                      <div className="text-[9px] text-[#8B8593] tracking-wide mb-0.5">WEEKLY PAYROLL</div>
                      <div className="font-black text-lg booked-mono" style={{ color: "var(--gold)" }}>£{roster.reduce((s, w) => s + weeklyWage(w), 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-[#131117] rounded-lg p-3">
                      <div className="text-[9px] text-[#8B8593] tracking-wide mb-0.5">COMPANY LEVEL</div>
                      <div className="font-black text-lg">{popularityTier(popularity)} <span className="text-[10px] text-[#8B8593] font-normal">({popularity})</span></div>
                    </div>
                    <div className="bg-[#131117] rounded-lg p-3">
                      <div className="text-[9px] text-[#8B8593] tracking-wide mb-0.5">ROSTER SIZE</div>
                      <div className="font-black text-lg">{roster.length}</div>
                    </div>
                    <div className="bg-[#131117] rounded-lg p-3">
                      <div className="text-[9px] text-[#8B8593] tracking-wide mb-0.5">AVG. ROSTER OVERALL</div>
                      <div className="font-black text-lg">{roster.length > 0 ? avgRosterOverall : "—"} <span className="text-[10px] text-[#8B8593] font-normal">(expect ~{EXPECTED_ROSTER_OVERALL[popularityTier(popularity)]}+)</span></div>
                      {roster.length === 0 && TIER_RANK[popularityTier(popularity)] > 0 && <div className="text-[9px] text-red-400 mt-0.5">No exclusive roster — growth is slowed (0.65x) until you sign someone</div>}
                      {roster.length > 0 && roster.length < 5 && <div className="text-[9px] text-[#8B8593] mt-0.5">Doesn't affect growth until 5 signed ({roster.length}/5)</div>}
                    </div>
                    <div className="bg-[#131117] rounded-lg p-3">
                      <div className="text-[9px] text-[#8B8593] tracking-wide mb-0.5">TOTAL SHOWS RUN</div>
                      <div className="font-black text-lg">{totalShowsRun}</div>
                    </div>
                    <div className="bg-[#131117] rounded-lg p-3">
                      <div className="text-[9px] text-[#8B8593] tracking-wide mb-0.5">TOTAL MATCHES RUN</div>
                      <div className="font-black text-lg">{totalMatchesRun}</div>
                    </div>
                    <div className="bg-[#131117] rounded-lg p-3">
                      <div className="text-[9px] text-[#8B8593] tracking-wide mb-0.5">TITLES IN COMPANY</div>
                      <div className="font-black text-lg">{titles.length}</div>
                    </div>
                    <div className="bg-[#131117] rounded-lg p-3" title={fanTrend.desc}>
                      <div className="text-[9px] text-[#8B8593] tracking-wide mb-0.5">FANS WANT</div>
                      <div className="font-black text-sm">{fanTrend.label}</div>
                    </div>
                  </div>
                </div>

                <div className="dt:grid dt:grid-cols-2 dt:gap-4 space-y-5 dt:space-y-0">
                  <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                    <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">UPCOMING</div>
                    {(() => {
                      const items = [];
                      roster.forEach((w) => {
                        if (w.contractExpiresWeek == null) return;
                        const left = w.contractExpiresWeek - weekNumber;
                        if (left >= 0 && left <= 4) items.push({ key: `c-${w.name}`, urgent: left <= 1, text: `${w.name}'s contract expires in ${left === 0 ? "this show" : `${left} week${left === 1 ? "" : "s"}`}` });
                      });
                      titles.forEach((t) => {
                        if (t.holders.length === 0) return;
                        const lastActive = t.lastDefendedWeek ?? t.reignStartWeek;
                        if (lastActive === null) return;
                        const left = TITLE_VACATE_WEEKS - (weekNumber - lastActive);
                        if (left >= 0 && left <= 3) items.push({ key: `t-${t.id}`, urgent: left <= 1, text: `${t.name} vacates in ${left} week${left === 1 ? "" : "s"} without a defense` });
                      });
                      if (networkDeal) {
                        const left = networkDeal.expiresWeek - weekNumber;
                        if (left >= 0 && left <= 4) items.push({ key: "net", urgent: left <= 1, text: `TV deal with ${networkDeal.name} expires in ${left} week${left === 1 ? "" : "s"}` });
                      }
                      if (sponsorDeal) {
                        const left = sponsorDeal.expiresWeek - weekNumber;
                        if (left >= 0 && left <= 4) items.push({ key: "spo", urgent: left <= 1, text: `Sponsorship with ${sponsorDeal.name} expires in ${left} week${left === 1 ? "" : "s"}` });
                      }
                      if (loan) items.push({ key: "loan", urgent: loan.weeksRemaining <= 2, text: `Loan: £${loan.weeklyPayment.toLocaleString()}/wk, ${loan.weeksRemaining} week${loan.weeksRemaining === 1 ? "" : "s"} remaining` });
                      if (items.length === 0) return <div className="text-xs text-[#8B8593] italic">Nothing needs attention this week.</div>;
                      return (
                        <div className="space-y-2">
                          {items.map((it) => (
                            <div key={it.key} className={`text-xs flex items-start gap-1.5 ${it.urgent ? "text-red-300" : "text-[#CFC9BB]"}`}>
                              <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${it.urgent ? "bg-red-400" : "bg-[#8B6BC0]"}`} />
                              {it.text}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                    <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">RECENT SHOWS</div>
                    {showHistory.length === 0 ? (
                      <div className="text-xs text-[#8B8593] italic">No shows run yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {showHistory.slice(0, 4).map((r) => (
                          <div key={r.id} className="flex items-center justify-between text-xs">
                            <div>
                              <div className="font-semibold">{r.city} &middot; {r.arena}</div>
                              <div className="text-[10px] text-[#8B8593]">Y{r.year} Wk{r.weekOfYear} &middot; {formatDate(r.date)}</div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 justify-end font-bold"><Trophy size={11} className="text-[#8B6BC0]" />{r.fullRating}</div>
                              <div className={`text-[10px] ${r.profit >= 0 ? "text-[#8B6BC0]" : "text-red-400"}`}>{r.profit >= 0 ? "+" : ""}£{r.profit.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">ACTIVE STORYLINES</div>
                      <button onClick={() => setTab("storylines")} className="text-[10px] text-[#8B8593] hover:text-[#F2ECDD]">View all</button>
                    </div>
                    {renderStorylinesMini(3)}
                  </div>

                  <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 dt:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">NEWS</div>
                      <button onClick={() => setTab("news")} className="text-[10px] text-[#8B8593] hover:text-[#F2ECDD]">View all</button>
                    </div>
                    {universeFeed.length === 0 ? (
                      <div className="text-xs text-[#8B8593] italic">Nothing to report yet — keep running shows and the story will start writing itself.</div>
                    ) : (
                      <div className="space-y-2.5">
                        {universeFeed.slice(0, 5).map((item) => (
                          <div key={item.id}>
                            <div className="flex items-center gap-1.5 text-[9px] text-[#8B8593] mb-0.5">
                              {item.type === "title" && <Award size={11} className="text-[#8B6BC0]" />}
                              {item.type === "rival" && <Globe2 size={11} className="text-[#8B8593]" />}
                              {item.type === "injury" && <Skull size={11} className="text-red-400" />}
                              <span>Y{yearOf(item.showNumber)} Wk{weekOfYear(item.showNumber)} &middot; {formatDate(item.date)}</span>
                            </div>
                            <div className={`text-xs ${item.type === "title" ? "text-[#F2ECDD] font-semibold" : item.type === "injury" ? "text-red-300 font-semibold" : "text-[#CFC9BB]"}`}>{flavorizeNews(item)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {companySubTab === "finance" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">FINANCES</div>
                  <select value={financeYear} onChange={(e) => setFinanceYear(Number(e.target.value))} className="bg-[#17151C] border border-[#2B2733] rounded px-2 py-1 text-xs">
                    {yearsAvailable.map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4" style={{ height: 280 }}>
                  {financeChartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={financeChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2B2733" />
                        <XAxis dataKey="weekOfYear" stroke="#8B8593" fontSize={10} label={{ value: "Week", position: "insideBottom", offset: -3, fill: "#8B8593", fontSize: 10 }} />
                        <YAxis stroke="#8B8593" fontSize={10} tickFormatter={(v) => `£${Math.round(v / 1000)}k`} />
                        <Tooltip contentStyle={{ background: "#131117", border: "1px solid #2B2733", fontSize: 11 }} formatter={(v) => [`£${v.toLocaleString()}`, "Bank"]} labelFormatter={(l) => `Week ${l}`} />
                        <Line type="monotone" dataKey="bank" stroke="#C9A227" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#8B8593] italic">Run a few shows this year to start plotting the graph.</div>
                  )}
                </div>

                <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 mt-4">
                  <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">LOANS</div>
                  <div className="text-[10px] text-[#8B8593] mb-3">20% flat interest, repaid automatically out of profit every week for the term.</div>
                  {loan ? (
                    <div className="bg-[#131117] rounded-lg p-3">
                      <div className="text-sm font-bold booked-mono mb-1" style={{ color: "var(--gold)" }}>£{loan.principal.toLocaleString()} borrowed</div>
                      <div className="text-[10px] text-[#8B8593]">£{loan.weeklyPayment.toLocaleString()}/week &middot; {loan.weeksRemaining} weeks remaining</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {LOAN_OPTIONS.map((opt, i) => {
                        const totalOwed = Math.round(opt.amount * (1 + LOAN_INTEREST_RATE));
                        const locked = TIER_RANK[popularityTier(popularity)] < TIER_RANK[opt.minTier];
                        return (
                          <button key={i} onClick={() => !locked && takeLoan(opt)} disabled={locked} className={`text-left px-3 py-2 rounded border ${locked ? "border-[#2B2733] text-[#5A5660] cursor-not-allowed" : "border-[#2B2733] hover:border-[#5B3B8C]"}`}>
                            <div className="text-sm font-bold">£{opt.amount.toLocaleString()}{locked ? ` (${opt.minTier}+)` : ""}</div>
                            <div className="text-[9px] text-[#8B8593]">£{Math.round(totalOwed / opt.weeks).toLocaleString()}/wk &middot; {opt.weeks}wk &middot; £{totalOwed.toLocaleString()} total</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {tab === "saves" && !retiring && (
          <div className="space-y-6">
            <div>
              <div className="mb-1">
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">SAVE</div>
              </div>
              {saveActionMsg && (
                <div className={`text-[10px] mb-2 ${saveActionMsg.startsWith("Save failed") || saveActionMsg.startsWith("Save too large") || saveActionMsg.startsWith("Load failed") ? "text-red-400" : "text-[#8B6BC0]"}`}>
                  {saveActionMsg}
                </div>
              )}
              <div className="text-[10px] text-[#8B8593] mb-3">Saved to your own private storage — nobody else playing this game can see or overwrite your save.</div>

              <div className="bg-[#17151C] border border-[#5B3B8C] rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold flex items-center gap-1.5"><BatteryCharging size={13} className="text-[#8B6BC0]" /> Autosave</span>
                  {autoSaveInfo === undefined && <span className="text-[10px] text-[#8B8593]">Loading...</span>}
                </div>
                {autoSaveInfo ? (
                  <div className="text-[10px] text-[#8B8593] mb-2">
                    {autoSaveInfo.companyName} &middot; Week {autoSaveInfo.weekCount} &middot; £{autoSaveInfo.bank.toLocaleString()} &middot; Saved {formatDate(new Date(autoSaveInfo.savedAt))}
                  </div>
                ) : autoSaveInfo === null ? (
                  <div className="text-[10px] text-[#8B8593] italic mb-2">Nothing yet — happens automatically after your first show.</div>
                ) : null}
                <div className="text-[10px] text-[#8B8593] mb-2">Updates automatically after every show — a safety net, not a substitute for saving yourself.</div>
                {autoSaveInfo && <button onClick={loadAutoSave} className="w-full py-1.5 border border-[#2B2733] text-[11px] text-[#8B8593] hover:text-[#F2ECDD] rounded">Load Autosave</button>}
              </div>

              {saveInfo && (
                <div className="text-[10px] text-[#8B8593] mb-2">
                  Your save: {saveInfo.companyName} &middot; Week {saveInfo.weekCount} &middot; £{saveInfo.bank.toLocaleString()} &middot; Saved {formatDate(new Date(saveInfo.savedAt))}
                </div>
              )}
              <button onClick={saveGame} className="w-full py-3 rounded-lg font-bold text-sm" style={{ backgroundColor: "#5B3B8C", color: "#F2ECDD" }}>
                SAVE GAME
              </button>
              {saveInfo && (
                <div className="flex gap-2 mt-2">
                  <button onClick={loadGame} className="flex-1 py-1.5 border border-[#2B2733] text-[11px] text-[#8B8593] hover:text-[#F2ECDD] rounded">Load Save</button>
                  <button onClick={deleteSavedGame} className="px-3 py-1.5 border border-[#2B2733] text-[#8B8593] hover:text-red-400 rounded"><X size={13} /></button>
                </div>
              )}
            </div>

            <button
              onClick={() => setRetiring(true)}
              className="w-full flex items-center gap-3 bg-[#17151C] border border-[#2B2733] hover:border-[#5B3B8C] rounded-lg p-4 text-left transition-colors"
            >
              <Flag size={20} className="text-[#8B8593] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">Retire</div>
                <div className="text-[11px] text-[#8B8593]">End this run, or wipe everything and start fresh</div>
              </div>
              <ChevronDown size={16} className="text-[#8B8593] -rotate-90 shrink-0" />
            </button>

            <div>
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">PREVIOUS GAMES</div>
              <div className="text-[10px] text-[#8B8593] mb-3">A brief record of past promotions that ended — by getting fired, or by choice.</div>
              <div className="space-y-2">
                {previousGames === undefined && <div className="text-xs text-[#8B8593] italic">Loading...</div>}
                {previousGames && previousGames.length === 0 && <div className="text-xs text-[#8B8593] italic">No finished games yet.</div>}
                {previousGames && previousGames.map((g, i) => (
                  <div key={i} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3 text-xs">
                    <div className="font-bold mb-1 flex items-center gap-1.5">
                      {g.companyName}
                      <span className={`text-[9px] font-normal px-1.5 py-0.5 rounded ${g.reason === "fired" ? "text-red-300 bg-[#2A1414]" : "text-[#8B6BC0] bg-[#241B33]"}`}>
                        {g.reason === "fired" ? "Fired" : "Retired"}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#8B8593]">
                      {g.weeksSurvived} weeks &middot; {g.showsRun} shows &middot; peak popularity {g.peakPopularity} ({g.finalTier}) &middot; {g.titlesCreated} title{g.titlesCreated === 1 ? "" : "s"} created &middot; ended {formatDate(new Date(g.endedAt))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "saves" && retiring && (
          <div>
            <button onClick={() => { setRetiring(false); setConfirmingRetire(false); setConfirmingWipe(false); }} className="flex items-center gap-1 text-xs text-[#8B8593] hover:text-[#F2ECDD] mb-4">
              <ChevronDown size={14} className="rotate-90" /> Back
            </button>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">THROWING IN THE TOWEL</div>
            <div className="text-[10px] text-[#8B8593] mb-4">Two very different options — read carefully before picking one.</div>

            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 mb-4">
              <div className="font-bold text-sm mb-1">Retire {companyName}</div>
              <div className="text-xs text-[#8B8593] mb-3">Ends this run and files it under Previous Games with its final stats — same as being fired, just on your own terms. Starts a brand new promotion straight after. Your save and autosave are untouched.</div>
              {!confirmingRetire ? (
                <button onClick={() => setConfirmingRetire(true)} className="w-full py-2.5 rounded-lg font-bold text-sm border border-[#5B3B8C] text-[#8B6BC0]">Retire & Start New Promotion</button>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-[#8B6BC0]">Sure? This ends your current run permanently.</div>
                  <div className="flex gap-2">
                    <button onClick={retireAndStartNew} className="flex-1 py-2 rounded font-bold text-xs" style={{ backgroundColor: "#5B3B8C", color: "#F2ECDD" }}>Yes, Retire</button>
                    <button onClick={() => setConfirmingRetire(false)} className="flex-1 py-2 rounded border border-[#2B2733] text-xs text-[#8B8593]">Cancel</button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#2A1414] border border-red-500 rounded-lg p-4">
              <div className="font-bold text-sm mb-1 text-red-300">Reset Full Progress</div>
              <div className="text-xs text-red-200 mb-3">Wipes absolutely everything — your save, your autosave, and your entire Previous Games history. There is no undo. Only use this if you want to erase all record you ever played.</div>
              {!confirmingWipe ? (
                <button onClick={() => setConfirmingWipe(true)} className="w-full py-2.5 rounded-lg font-bold text-sm border border-red-500 text-red-300">Reset Full Progress</button>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-red-300 font-bold">This cannot be undone. Everything goes.</div>
                  <div className="flex gap-2">
                    <button onClick={wipeAllProgress} className="flex-1 py-2 rounded bg-red-700 hover:bg-red-600 font-bold text-xs text-white">Yes, Wipe Everything</button>
                    <button onClick={() => setConfirmingWipe(false)} className="flex-1 py-2 rounded border border-[#2B2733] text-xs text-[#8B8593]">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "roster" && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <SubTabButton active={rosterSubTab === "roster"} onClick={() => setRosterSubTab("roster")} icon={Users} label="Roster" />
              <SubTabButton active={rosterSubTab === "rivalries"} onClick={() => setRosterSubTab("rivalries")} icon={Flame} label="Rivalries" />
              <SubTabButton active={rosterSubTab === "stables"} onClick={() => setRosterSubTab("stables")} icon={Users2} label="Tag Teams" />
              <SubTabButton active={rosterSubTab === "requests"} onClick={() => setRosterSubTab("requests")} icon={HeartPulse} label={`Requests${requests.filter((r) => r.status === "pending").length > 0 ? ` (${requests.filter((r) => r.status === "pending").length})` : ""}`} />
            </div>

            {rosterSubTab === "roster" && (
              <div className="space-y-6">
            <div className="flex items-center gap-3 text-[9px] text-[#8B8593]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#EF4444" }} /> Injured</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#F59E0B" }} /> Nearly recovered</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: "#C9A227" }} /> Champion</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">EXCLUSIVE ({roster.length})</div>
                {roster.length > 0 && <div className="text-[10px] text-[#8B8593]">Avg. Overall: <span className="text-[#F2ECDD] font-bold">{avgRosterOverall}</span> <span className="opacity-70">(expect ~{EXPECTED_ROSTER_OVERALL[popularityTier(popularity)]}+ at {popularityTier(popularity)})</span>{roster.length < 5 && <span className="opacity-70"> — doesn't affect growth until 5 signed ({roster.length}/5)</span>}</div>}
              </div>
              <div className="text-[10px] text-[#8B8593] mb-3">Billed a standing weekly wage, available every show, guaranteed — no per-appearance fee.</div>
              <div className="grid sm:grid-cols-2 dt:grid-cols-3 gap-2">
                {roster.map((w) => {
                  const statusColor = rosterStatusColor(w);
                  return (
                  <div key={w.name} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3" style={statusColor ? { borderLeftColor: statusColor, borderLeftWidth: 4 } : undefined}>
                    <div className="flex items-center justify-between mb-1">
                      <button onClick={() => setDetailWrestler(w)} className="font-black text-sm flex items-center gap-1.5 text-left" style={{ fontFamily: "Anton, sans-serif" }}>
                        {w.name}
                        {(w.holdsTitles || []).length > 0 && <Award size={13} className="text-[#8B6BC0]" />}
                      </button>
                      <span onClick={() => setFiringTarget(w)} className="text-[#8B8593] hover:text-red-400 p-0.5 cursor-pointer"><X size={14} /></span>
                    </div>
                    <div className="text-[10px] text-[#8B6BC0] font-semibold mb-1">
                      OVR {Math.round(attrOf(w))} &middot; {w.sex} &middot; {w.wins}-{w.losses}
                      {w.injuryWeeksRemaining && <span className="text-red-400"> &middot; {w.injuryType ? `${w.injuryType.toUpperCase()} ` : ""}INJURED ({w.injuryWeeksRemaining}wk)</span>}
                    </div>
                    <div className="text-[10px] text-[#8B8593]">£{weeklyWage(w).toLocaleString()}/wk &middot; {w.contractExpiresWeek - weekNumber}wk left</div>
                    {w.contractExpiresWeek - weekNumber <= RENEWAL_WINDOW_WEEKS && (() => {
                      const entry = pendingOffers.find((e) => e.wrestlerName === w.name);
                      const rivalBidder = entry?.offers.find((o) => o.companyId !== "player");
                      const rivalName = rivalBidder ? (RIVAL_COMPANIES.find((c) => c.id === rivalBidder.companyId)?.name || "A rival") : null;
                      return (
                        <div className="text-[9px] text-yellow-400 mt-1">
                          Contract expiring soon{rivalName ? ` — ${rivalName} is already circling` : " — extend now or risk losing them to a rival"}.
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${(w.rosterLevel || "main") === "main" ? "bg-[#5B3B8C] text-[#F2ECDD]" : "bg-[#241B33] text-[#8B6BC0]"}`}>
                        {(w.rosterLevel || "main") === "main" ? "MAIN ROSTER" : "DEVELOPMENTAL"}
                      </span>
                      {(w.rosterLevel || "main") === "main" ? (
                        <button
                          onClick={() => feederCompany && setRosterLevel(w.name, "developmental")}
                          disabled={!feederCompany}
                          title={!feederCompany ? "Found a feeder promotion from Back Office first" : undefined}
                          className="text-[9px] font-bold text-[#8B8593] hover:text-[#F2ECDD] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Demote to Developmental
                        </button>
                      ) : (
                        <button onClick={() => setRosterLevel(w.name, "main")} className="text-[9px] font-bold text-[#8B6BC0] hover:text-[#F2ECDD]">
                          Promote to Main Roster
                        </button>
                      )}
                    </div>
                    {(w.rosterLevel || "main") === "developmental" && (() => {
                      const pot = Math.round(potentialOf(w));
                      const cur = Math.round(avgStats(w));
                      const pct = Math.min(100, Math.round((cur / Math.max(1, pot)) * 100));
                      const done = cur >= pot - 0.5;
                      return (
                        <div className="mt-1.5">
                          <div className="flex justify-between text-[9px] text-[#8B8593] mb-0.5"><span>Training &middot; Potential {pot}</span><span className="text-[#F2ECDD] font-bold">{done ? "Maxed out" : `${pct}%`}</span></div>
                          <div className="h-1 bg-[#0A0A0C] rounded-full overflow-hidden"><div className="h-full bg-[#8B6BC0]" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })()}
                    <button onClick={() => startExtending(w)} className="mt-2 text-[10px] font-bold text-[#8B6BC0] hover:text-[#F2ECDD]">Extend contract</button>
                  </div>
                  );
                })}
                {roster.length === 0 && <div className="text-xs text-[#8B8593] italic">No wrestlers signed exclusively yet.</div>}
              </div>
            </div>

            <div>
              <div className="text-[11px] tracking-widest text-[#8B8593] font-bold mb-1">PER-USE ({perUseWrestlers.length})</div>
              <div className="text-[10px] text-[#8B8593] mb-3">Your regular freelance picks — stay bookable every week, but cost a fee whenever you actually use them.</div>
              <div className="grid sm:grid-cols-2 dt:grid-cols-3 gap-2">
                {perUseWrestlers.map((w) => {
                  const statusColor = rosterStatusColor(w);
                  return (
                  <div key={w.name} className="bg-[#131117] border border-[#2B2733] rounded-lg p-3" style={statusColor ? { borderLeftColor: statusColor, borderLeftWidth: 4 } : undefined}>
                    <div className="flex items-center justify-between mb-1">
                      <button onClick={() => setDetailWrestler(w)} className="font-black text-sm text-left" style={{ fontFamily: "Anton, sans-serif" }}>{w.name.toUpperCase()}</button>
                      <span onClick={() => removePerUse(w.name)} className="text-[#8B8593] hover:text-[#F2ECDD] p-0.5 cursor-pointer"><X size={14} /></span>
                    </div>
                    <div className="text-[10px] text-[#8B6BC0] font-semibold mb-1">OVR {Math.round(attrOf(w))} &middot; {w.sex} &middot; {w.wins}-{w.losses}{w.injuryWeeksRemaining && <span className="text-red-400"> &middot; {w.injuryType ? `${w.injuryType.toUpperCase()} ` : ""}INJURED ({w.injuryWeeksRemaining}wk)</span>}</div>
                    <div className="text-[10px] text-[#8B8593]">£{(w.perUseFee ?? baseFreelanceFee(w)).toLocaleString()}/show when booked</div>
                  </div>
                  );
                })}
                {perUseWrestlers.length === 0 && <div className="text-xs text-[#8B8593] italic">None yet — add freelancers from the Wrestlers tab.</div>}
              </div>
            </div>
              </div>
            )}

            {rosterSubTab === "rivalries" && renderRivalriesPanel(true)}

            {rosterSubTab === "stables" && renderTagTeamsPanel(true)}

            {rosterSubTab === "requests" && (
              <div>
                <div className="text-[10px] text-[#8B8593] mb-3">Wrestlers occasionally ask for something. Promise it and follow through, or decline — either way it affects their happiness.</div>
                <div className="space-y-2">
                  {requests.map((r) => {
                    const w = pool.find((x) => x.name === r.wrestlerName);
                    return (
                      <div key={r.id} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm">{r.text}</span>
                          {w && <span className="text-[9px] text-[#8B8593]">Happiness: {w.happiness}</span>}
                        </div>
                        {r.status === "pending" ? (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => promiseRequest(r)} className="flex-1 py-1.5 bg-[#5B3B8C] hover:bg-[#6C47A3] text-[11px] font-bold rounded">Promise</button>
                            <button onClick={() => declineRequest(r)} className="flex-1 py-1.5 border border-[#2B2733] text-[11px] text-[#8B8593] hover:text-[#F2ECDD] rounded">Decline</button>
                          </div>
                        ) : ["push", "title-shot", "match"].includes(r.type) ? (
                          <div className="text-[10px] text-[#8B6BC0] mt-2">Promised — due by week {r.deadlineWeek}. Completes automatically once you book it.</div>
                        ) : (
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-[#8B6BC0]">Promised — due by week {r.deadlineWeek}</span>
                            <button onClick={() => fulfillRequest(r)} className="text-[11px] font-bold px-2 py-1 rounded bg-[#5B3B8C] hover:bg-[#6C47A3]">Mark Fulfilled</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {requests.length === 0 && <div className="text-xs text-[#8B8593] italic">No requests right now.</div>}
                </div>
              </div>
            )}

            {extendingTarget && (
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setExtendingTarget(null)}>
                <div className="booked-modal-card border rounded-lg p-5 max-w-sm w-full" style={{ backgroundColor: "#17151C", color: "#F2ECDD", borderColor: "#5B3B8C" }} onClick={(e) => e.stopPropagation()}>
                  <div className="text-lg font-black mb-1" style={{ fontFamily: "Anton, sans-serif" }}>EXTEND {extendingTarget.name.toUpperCase()}</div>
                  <div className="text-[10px] text-[#8B8593] mb-3">£{weeklyWage(extendingTarget).toLocaleString()}/week &middot; there's a chance they turn down the extension.</div>
                  {extendResult === "refused" && <div className="text-xs text-red-400 mb-3">{extendingTarget.name} declined the extension. Their existing contract still runs its course.</div>}
                  {extendResult === "accepted" && <div className="text-xs text-[#8B6BC0] mb-3">Extension signed!</div>}
                  {!extendResult && (
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {CONTRACT_OPTIONS.map((wk) => (
                          <button key={wk} onClick={() => setExtendWeeks(wk)} className={`px-3 py-2 rounded text-xs font-bold border ${extendWeeks === wk ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`} style={extendWeeks === wk ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C" } : undefined}>
                            {wk} weeks
                          </button>
                        ))}
                      </div>
                      <button onClick={confirmExtend} className="w-full py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] text-xs font-bold rounded">
                        Offer extension
                      </button>
                    </>
                  )}
                  <button onClick={() => setExtendingTarget(null)} className="w-full mt-2 px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Close</button>
                </div>
              </div>
            )}

            {firingTarget && (
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setFiringTarget(null)}>
                <div className="booked-modal-card border rounded-lg p-5 max-w-sm w-full" style={{ backgroundColor: "#17151C", color: "#F2ECDD", borderColor: "#5B3B8C" }} onClick={(e) => e.stopPropagation()}>
                  <div className="text-lg font-black mb-1" style={{ fontFamily: "Anton, sans-serif" }}>RELEASE {firingTarget.name.toUpperCase()}</div>
                  <div className="text-xs text-[#8B8593] mb-4">
                    Buying out the remaining {Math.max(0, firingTarget.contractExpiresWeek - weekNumber)} weeks of their contract at 50% costs{" "}
                    <span className="font-bold booked-mono" style={{ color: "var(--gold)" }}>£{buyoutCost(firingTarget).toLocaleString()}</span>.
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { release(firingTarget); setFiringTarget(null); }} className="flex-1 py-2 bg-red-900 hover:bg-red-800 text-xs font-bold rounded">
                      Confirm Release
                    </button>
                    <button onClick={() => setFiringTarget(null)} className="px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {acquiringTarget && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setAcquiringTarget(null)}>
            <div className="booked-modal-card border rounded-lg p-5 max-w-sm w-full" style={{ backgroundColor: "#17151C", color: "#F2ECDD", borderColor: "#5B3B8C" }} onClick={(e) => e.stopPropagation()}>
              <div className="text-lg font-black mb-1" style={{ fontFamily: "Anton, sans-serif" }}>ACQUIRE {acquiringTarget.name.toUpperCase()}</div>
              <div className="text-xs text-[#8B8593] mb-4">
                This is permanent — {acquiringTarget.name} stops operating as a rival for good. Their signed roster becomes free agents you can sign. Cost:{" "}
                <span className="font-bold booked-mono" style={{ color: "var(--gold)" }}>£{companyPurchaseCost(acquiringTarget).toLocaleString()}</span>.
              </div>
              <div className="flex gap-2">
                <button onClick={() => { acquireCompany(acquiringTarget); setAcquiringTarget(null); }} disabled={bank < companyPurchaseCost(acquiringTarget)} className="flex-1 py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded">
                  Confirm Acquisition
                </button>
                <button onClick={() => setAcquiringTarget(null)} className="px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {editingWrestlerDraft && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setEditingWrestlerDraft(null)}>
            <div className="booked-modal-card border rounded-lg p-5 max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "#17151C", color: "#F2ECDD", borderColor: "#5B3B8C" }} onClick={(e) => e.stopPropagation()}>
              <div className="text-lg font-black mb-3" style={{ fontFamily: "Anton, sans-serif" }}>{editingWrestlerDraft._isNew ? "NEW WRESTLER" : "EDIT WRESTLER"}</div>
              <div className="space-y-3">
                <div>
                  <div className="text-[9px] text-[#8B8593] mb-1">NAME</div>
                  <input value={editingWrestlerDraft.name} onChange={(e) => setEditingWrestlerDraft((d) => ({ ...d, name: e.target.value }))} className="w-full border border-[#2B2733] rounded px-3 py-2 text-sm" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[9px] text-[#8B8593] mb-1">AGE</div>
                    <input type="number" value={editingWrestlerDraft.age} onChange={(e) => setEditingWrestlerDraft((d) => ({ ...d, age: e.target.value }))} className="w-full border border-[#2B2733] rounded px-2 py-1.5 text-xs" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
                  </div>
                  <div>
                    <div className="text-[9px] text-[#8B8593] mb-1">SEX</div>
                    <select value={editingWrestlerDraft.sex} onChange={(e) => setEditingWrestlerDraft((d) => ({ ...d, sex: e.target.value }))} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#8B8593] mb-1">ALIGNMENT</div>
                    <select value={editingWrestlerDraft.alignment} onChange={(e) => setEditingWrestlerDraft((d) => ({ ...d, alignment: e.target.value }))} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                      {ALIGNMENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-[#8B8593] mb-1">WEIGHT CLASS</div>
                  <select value={editingWrestlerDraft.weightClass} onChange={(e) => setEditingWrestlerDraft((d) => ({ ...d, weightClass: e.target.value }))} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                    {WEIGHT_CLASSES.map((wc) => <option key={wc} value={wc}>{wc}</option>)}
                  </select>
                </div>
                <div className="pt-2 border-t border-[#2B2733]">
                  <div className="text-[9px] tracking-widest text-[#8B8593] font-bold mb-2">STATS (0&ndash;100) &middot; OVR {Math.round(avgStats(editingWrestlerDraft))}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {STAT_KEYS.map((k) => (
                      <div key={k}>
                        <div className="flex justify-between text-[9px] text-[#8B8593] mb-0.5"><span>{STAT_LABELS[k]}</span><span className="font-bold text-[#F2ECDD]">{editingWrestlerDraft[k]}</span></div>
                        <input type="range" min={0} max={100} value={editingWrestlerDraft[k]} onChange={(e) => setEditingWrestlerDraft((d) => ({ ...d, [k]: Number(e.target.value) }))} className="w-full accent-[#8B6BC0]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={saveWrestlerDraft} disabled={!editingWrestlerDraft.name.trim()} className="flex-1 py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded">
                  {editingWrestlerDraft._isNew ? "Create" : "Save Changes"}
                </button>
                {!editingWrestlerDraft._isNew && (
                  <button onClick={() => { deleteWrestlerByName(editingWrestlerDraft._originalName); setEditingWrestlerDraft(null); }} className="px-3 py-2 border border-red-900 text-red-300 hover:bg-red-950 rounded"><Trash2 size={14} /></button>
                )}
                <button onClick={() => setEditingWrestlerDraft(null)} className="px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {editingCompanyDraft && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setEditingCompanyDraft(null)}>
            <div className="booked-modal-card border rounded-lg p-5 max-w-sm w-full" style={{ backgroundColor: "#17151C", color: "#F2ECDD", borderColor: "#5B3B8C" }} onClick={(e) => e.stopPropagation()}>
              <div className="text-lg font-black mb-3" style={{ fontFamily: "Anton, sans-serif" }}>{editingCompanyDraft._isNew ? "NEW COMPANY" : "EDIT COMPANY"}</div>
              <div className="space-y-3">
                <div>
                  <div className="text-[9px] text-[#8B8593] mb-1">COMPANY NAME</div>
                  <input value={editingCompanyDraft.name} onChange={(e) => setEditingCompanyDraft((d) => ({ ...d, name: e.target.value }))} className="w-full border border-[#2B2733] rounded px-3 py-2 text-sm" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
                </div>
                <div>
                  <div className="text-[9px] text-[#8B8593] mb-1">BOOKER NAME</div>
                  <input value={editingCompanyDraft.bookerName} onChange={(e) => setEditingCompanyDraft((d) => ({ ...d, bookerName: e.target.value }))} className="w-full border border-[#2B2733] rounded px-3 py-2 text-sm" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
                </div>
                <div>
                  <div className="text-[9px] text-[#8B8593] mb-1">TITLE NAME</div>
                  <input value={editingCompanyDraft.titleName} onChange={(e) => setEditingCompanyDraft((d) => ({ ...d, titleName: e.target.value }))} placeholder={`${editingCompanyDraft.name || "Company"} Championship`} className="w-full border border-[#2B2733] rounded px-3 py-2 text-sm" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[9px] text-[#8B8593] mb-1">POPULARITY (0&ndash;100)</div>
                    <input type="number" value={editingCompanyDraft.popularity} onChange={(e) => setEditingCompanyDraft((d) => ({ ...d, popularity: e.target.value }))} className="w-full border border-[#2B2733] rounded px-2 py-1.5 text-xs" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
                  </div>
                  <div>
                    <div className="text-[9px] text-[#8B8593] mb-1">FUNDS (£)</div>
                    <input type="number" value={editingCompanyDraft.funds} onChange={(e) => setEditingCompanyDraft((d) => ({ ...d, funds: e.target.value }))} className="w-full border border-[#2B2733] rounded px-2 py-1.5 text-xs" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={saveCompanyDraft} disabled={!editingCompanyDraft.name.trim()} className="flex-1 py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded">
                  {editingCompanyDraft._isNew ? "Create" : "Save Changes"}
                </button>
                {!editingCompanyDraft._isNew && (
                  <button onClick={() => { deleteCompanyById(editingCompanyDraft.id); setEditingCompanyDraft(null); }} className="px-3 py-2 border border-red-900 text-red-300 hover:bg-red-950 rounded"><Trash2 size={14} /></button>
                )}
                <button onClick={() => setEditingCompanyDraft(null)} className="px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {tab === "storylines" && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">STORYLINES</div>
            <div className="text-[10px] text-[#8B8593] mb-4">Every feud involving your roster, at a glance — gold border and flame mean it's hot enough for a blow-off match. Create or end a rivalry from Roster &middot; Rivalries.</div>
            {renderRivalriesPanel(false)}
          </div>
        )}

        {tab === "calendar" && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">CALENDAR</div>
            <div className="text-[10px] text-[#8B8593] mb-4">Advance time on its own, or schedule a reminder for a future week — one-off or recurring. Running a show still only happens from the Book tab.</div>

            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-lg font-black" style={{ fontFamily: "Anton, sans-serif" }}>YEAR {currentYear} &middot; WEEK {weekOfYear(weekNumber)}</div>
                  <div className="text-[10px] text-[#8B8593]">{formatDate(scheduledDate)}</div>
                </div>
                <button
                  onClick={() => runShow(true)}
                  disabled={running || gameOver}
                  className="px-4 py-2.5 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-[#F2ECDD] font-black tracking-wide text-xs rounded transition-colors"
                >
                  {running ? "ADVANCING..." : "ADVANCE WITHOUT A SHOW"}
                </button>
              </div>
              <div className="text-[9px] text-[#8B8593] italic mt-2">Wages, loan payments, aging, injury recovery, and the rest of the wrestling world keep moving — you just won't run a show or earn gate/merch revenue this week. Any card you've started booking stays exactly as you left it.</div>
            </div>

            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 mb-4">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">SHOW EVENTS</div>
              <div className="text-[10px] text-[#8B8593] mb-3">Set up your recurring shows here — level, venue, city, length, day, and cadence (weekly TV, a monthly special, a quarterly PPV). This is the only place any of that gets chosen — the Book screen just shows what's due and lets you build and run the card.</div>

              {!startingCity ? (
                <div className="text-[10px] text-[#8B8593] italic">Pick your home city from the Book tab first, then come back here to set up your shows.</div>
              ) : (
              <>
              {eventTemplates.length > 0 && (
                <div className="space-y-2 mb-3">
                  {[...eventTemplates].sort((a, b) => a.nextWeekNumber - b.nextWeekNumber).map((t) => (
                    <div key={t.id} className="bg-[#131117] rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold">{t.name} {networkDeal?.eventTemplateId === t.id && <Tv size={11} className="inline text-[#8B6BC0] ml-1" />}</div>
                          <div className="text-[9px] text-[#8B8593]">
                            {t.level === "main" ? "Main Roster" : "Developmental"} &middot; {ARENAS[t.arenaIdx].name} &middot; {t.showMinutes || ARENAS[t.arenaIdx].showMinutes} min{t.preferredCity ? ` (${t.preferredCity})` : ""} &middot; {t.dayOfWeek || "Monday"}s &middot; every {t.intervalWeeks} week(s) &middot; next: {formatDate(addWeeks(START_DATE, t.nextWeekNumber - 1))}{t.nextWeekNumber <= weekNumber ? " (this week)" : ""}
                          </div>
                        </div>
                        <button onClick={() => removeEventTemplate(t.id)} className="text-[#8B8593] hover:text-red-400"><X size={14} /></button>
                      </div>
                      {networkDeal && (
                        <button
                          onClick={() => setNetworkDealEvent(networkDeal.eventTemplateId === t.id ? null : t.id)}
                          className={`mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded border ${networkDeal.eventTemplateId === t.id ? "bg-[#5B3B8C] border-[#5B3B8C] text-[#F2ECDD]" : "border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]"}`}
                        >
                          {networkDeal.eventTemplateId === t.id ? "TV deal attached — click to detach" : `Attach ${networkDeal.name} TV deal`}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <input
                type="text" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g. Monday Night Mayhem"
                className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs mb-2"
              />
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {["main", "developmental"].map((lvl) => {
                  const devLocked = lvl === "developmental" && !feederCompany;
                  return (
                    <button
                      key={lvl}
                      disabled={devLocked}
                      onClick={() => { if (devLocked) return; setNewTemplateLevel(lvl); if (lvl === "developmental" && newTemplateArenaIdx > DEVELOPMENTAL_MAX_ARENA_IDX) setNewTemplateArenaIdx(0); }}
                      title={devLocked ? "Found a feeder promotion from Back Office first" : undefined}
                      className={`px-2 py-1 rounded text-[10px] font-bold border ${devLocked ? "text-[#5A5660] border-[#2B2733] cursor-not-allowed" : newTemplateLevel === lvl ? "bg-[#5B3B8C] border-[#5B3B8C] text-[#F2ECDD]" : "border-[#2B2733] text-[#8B8593]"}`}
                    >
                      {lvl === "main" ? "Main Roster" : "Developmental"}
                    </button>
                  );
                })}
                <select value={newTemplateArenaIdx} onChange={(e) => setNewTemplateArenaIdx(Number(e.target.value))} className="bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  {ARENAS.map((ar, i) => {
                    const tierLocked = TIER_RANK[popularityTier(popularity)] < TIER_RANK[ar.minTier];
                    const levelLocked = newTemplateLevel === "developmental" && i > DEVELOPMENTAL_MAX_ARENA_IDX;
                    return <option key={ar.name} value={i} disabled={tierLocked || levelLocked}>{ar.name}{tierLocked ? ` (${ar.minTier}+)` : levelLocked ? " (Main Roster only)" : ""}</option>;
                  })}
                </select>
                <select value={newTemplateShowMinutes} onChange={(e) => setNewTemplateShowMinutes(Number(e.target.value))} title="How long this show runs — independent of venue; a weekly TV show and a monthly PPV can use the same venue but very different runtimes." className="bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  {[15, 30, 45, 60, 90, 120, 150, 180].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
                <select value={newTemplateIntervalWeeks} onChange={(e) => setNewTemplateIntervalWeeks(Number(e.target.value))} className="bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  <option value={1}>Weekly</option>
                  <option value={4}>Monthly</option>
                  <option value={13}>Quarterly (PPV-style)</option>
                </select>
                <select value={newTemplateDayOfWeek} onChange={(e) => setNewTemplateDayOfWeek(e.target.value)} className="bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={newTemplatePreferredCity} onChange={(e) => setNewTemplatePreferredCity(e.target.value)} className="bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  <option value="" disabled>Choose a city...</option>
                  {unlockedCities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={addEventTemplate} disabled={!newTemplateName.trim() || !newTemplatePreferredCity} className="ml-auto px-3 py-1.5 rounded text-[10px] font-bold bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-[#F2ECDD]">
                  Add
                </button>
              </div>
              {eventTemplates.some((t) => t.intervalWeeks === newTemplateIntervalWeeks && t.dayOfWeek === newTemplateDayOfWeek) && (
                <div className="text-[9px] text-yellow-400 italic mb-2">Same day and cadence as another show already on your schedule — when both are due the same week, this one comes first; otherwise each runs as its own show, same week or not.</div>
              )}
              </>
              )}
            </div>

            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 mb-4">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">SCHEDULE A REMINDER</div>
              <input
                type="text" value={newEventLabel} onChange={(e) => setNewEventLabel(e.target.value)}
                placeholder="e.g. Renew Jordan's contract"
                className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs mb-2"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-[#8B8593]">In</span>
                <input
                  type="number" min={1} value={newEventWeeksOut}
                  onChange={(e) => setNewEventWeeksOut(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-xs text-center"
                />
                <span className="text-[10px] text-[#8B8593]">week(s){newEventRecurring ? ", repeating" : ""}</span>
                <label className="flex items-center gap-1.5 text-[10px] text-[#8B8593] ml-2 cursor-pointer">
                  <input type="checkbox" checked={newEventRecurring} onChange={(e) => setNewEventRecurring(e.target.checked)} />
                  Recurring
                </label>
                <button onClick={addScheduledEvent} disabled={!newEventLabel.trim()} className="ml-auto px-3 py-1.5 rounded text-[10px] font-bold bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-[#F2ECDD]">
                  Add
                </button>
              </div>
            </div>

            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">UPCOMING</div>
              {scheduledEvents.length === 0 ? (
                <div className="text-xs text-[#8B8593] italic">Nothing scheduled — add a reminder above.</div>
              ) : (
                <div className="space-y-2">
                  {[...scheduledEvents].sort((a, b) => a.weekNumber - b.weekNumber).map((e) => (
                    <div key={e.id} className="flex items-center justify-between bg-[#131117] rounded-lg px-3 py-2">
                      <div>
                        <div className="text-xs font-semibold">{e.label}</div>
                        <div className="text-[9px] text-[#8B8593]">
                          {formatDate(addWeeks(START_DATE, e.weekNumber - 1))} &middot; {e.weekNumber - weekNumber <= 0 ? "due" : `in ${e.weekNumber - weekNumber} week(s)`}
                          {e.recurring ? ` · repeats every ${e.intervalWeeks} week(s)` : ""}
                        </div>
                      </div>
                      <button onClick={() => removeScheduledEvent(e.id)} className="text-[#8B8593] hover:text-red-400"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "wrestlers" && (
          <div>
            <div className="flex gap-2 mb-4">
              <SubTabButton active={wrestlersSubTab === "list"} onClick={() => setWrestlersSubTab("list")} icon={UserPlus} label="Wrestlers" />
              <SubTabButton active={wrestlersSubTab === "stables"} onClick={() => setWrestlersSubTab("stables")} icon={Users2} label="Tag Teams" />
            </div>
            {wrestlersSubTab === "stables" && renderTagTeamsPanel(false)}
            {wrestlersSubTab === "list" && (
          <div>
            <div className="flex items-center justify-between mb-1 gap-2">
              <div className="text-[11px] tracking-widest text-[#8B8593] font-bold">WRESTLERS ({pool.filter(passesFilters).length}/{pool.length})</div>
              <div className="flex items-center gap-1.5">
                <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="bg-[#131117] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  <option value="overall">Sort: Overall</option>
                  <option value="ranking">Sort: Ranking Pts</option>
                  {STAT_KEYS.map((k) => <option key={k} value={k}>Sort: {STAT_LABELS[k]}</option>)}
                </select>
                <button onClick={() => setShowFilters((s) => !s)} className={`text-[10px] font-bold px-2 py-1 rounded border ${filtersActive ? "border-[#5B3B8C] text-[#8B6BC0]" : "border-[#2B2733] text-[#8B8593]"}`}>
                  {showFilters ? "Hide filters" : "Filters"}{filtersActive ? " •" : ""}
                </button>
              </div>
            </div>
            <div className="text-[10px] text-[#8B8593] mb-3">Add to Per-Use for a standing freelance pick, or sign Exclusive for a weekly-wage contract. {feederCompany ? "Young or undersized talent signed to a rival can be Scouted straight into your Developmental system." : "Found a feeder promotion from Back Office to unlock Scouting rival prospects into Developmental."}</div>
            <input value={wrestlerSearch} onChange={(e) => setWrestlerSearch(e.target.value)} placeholder="Search wrestlers by name..." className="w-full border border-[#2B2733] rounded px-3 py-1.5 text-xs mb-3" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />

            {(() => {
              const targets = [...pool]
                .filter((w) => w.contractedTo === null && !(w.hireCooldownUntil && weekNumber < w.hireCooldownUntil) && !exceedsHireCap(w) && !shortlist.includes(w.name))
                .sort((a, b) => attrOf(b) - attrOf(a))
                .slice(0, 4);
              if (targets.length === 0) return null;
              return (
                <div className="bg-[#131117] border border-[#2B2733] rounded-lg p-3 mb-3">
                  <div className="text-[10px] tracking-widest text-[#8B6BC0] font-bold mb-1.5">WHO TO CHASE NEXT</div>
                  <div className="text-[9px] text-[#8B8593] mb-2">Top free agents within your reach — not already on your shortlist.</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {targets.map((w) => (
                      <div key={w.name} className="flex items-center justify-between gap-2 bg-[#0A0A0C] border border-[#2B2733] rounded px-2.5 py-1.5">
                        <button onClick={() => setDetailWrestler(w)} className="text-xs font-bold text-left hover:text-[#8B6BC0] truncate">{w.name}</button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] text-[#8B6BC0]">OVR {Math.round(attrOf(w))} &middot; {w.tier}</span>
                          <button onClick={() => toggleShortlist(w.name)} className="text-[#8B8593] hover:text-yellow-400" title="Add to shortlist"><Star size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {showFilters && (
              <div className="bg-[#131117] border border-[#2B2733] rounded-lg p-3 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[9px] text-[#8B8593] mb-1">GENDER</div>
                    <select value={filters.gender} onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                      <option value="all">All</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#8B8593] mb-1">WEIGHT CLASS</div>
                    <select value={filters.weightClass} onChange={(e) => setFilters((f) => ({ ...f, weightClass: e.target.value }))} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                      <option value="all">All</option>
                      {WEIGHT_CLASSES.map((wc) => <option key={wc} value={wc}>{wc}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#8B8593] mb-1">PROMOTION</div>
                    <select value={filters.promotion} onChange={(e) => setFilters((f) => ({ ...f, promotion: e.target.value }))} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                      <option value="all">All</option>
                      <option value="freelance">Freelance</option>
                      <option value="player">{companyName}</option>
                      {rivalCompanies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[10px] text-[#8B8593] cursor-pointer">
                  <input type="checkbox" checked={filters.availableOnly} onChange={(e) => setFilters((f) => ({ ...f, availableOnly: e.target.checked }))} className="accent-[#8B6BC0]" />
                  Available to hire only
                </label>
                <label className="flex items-center gap-2 text-[10px] text-[#8B8593] cursor-pointer">
                  <input type="checkbox" checked={filters.shortlistOnly} onChange={(e) => setFilters((f) => ({ ...f, shortlistOnly: e.target.checked }))} className="accent-[#8B6BC0]" />
                  Shortlisted only
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[9px] text-[#8B8593] mb-1"><span>MIN RANKING PTS</span><span className="text-[#F2ECDD] font-bold">{filters.minRanking}</span></div>
                    <input type="range" min={-100} max={200} value={filters.minRanking} onChange={(e) => setFilters((f) => ({ ...f, minRanking: Number(e.target.value) }))} className="w-full accent-[#8B6BC0]" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] text-[#8B8593] mb-1"><span>MAX RANKING PTS</span><span className="text-[#F2ECDD] font-bold">{filters.maxRanking}</span></div>
                    <input type="range" min={-100} max={200} value={filters.maxRanking} onChange={(e) => setFilters((f) => ({ ...f, maxRanking: Number(e.target.value) }))} className="w-full accent-[#8B6BC0]" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] text-[#8B8593] mb-1"><span>MIN OVERALL RATING</span><span className="text-[#F2ECDD] font-bold">{filters.minOverall}</span></div>
                    <input type="range" min={0} max={100} value={filters.minOverall} onChange={(e) => setFilters((f) => ({ ...f, minOverall: Number(e.target.value) }))} className="w-full accent-[#8B6BC0]" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] text-[#8B8593] mb-1"><span>MAX OVERALL RATING</span><span className="text-[#F2ECDD] font-bold">{filters.maxOverall}</span></div>
                    <input type="range" min={0} max={100} value={filters.maxOverall} onChange={(e) => setFilters((f) => ({ ...f, maxOverall: Number(e.target.value) }))} className="w-full accent-[#8B6BC0]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {STAT_KEYS.map((k) => (
                    <div key={k}>
                      <div className="flex justify-between text-[9px] text-[#8B8593] mb-0.5"><span>{STAT_LABELS[k]} MIN&ndash;MAX</span><span className="text-[#F2ECDD] font-bold">{filters.stats[k]}&ndash;{filters.statsMax[k]}</span></div>
                      <div className="flex gap-1.5">
                        <input type="range" min={0} max={100} value={filters.stats[k]} onChange={(e) => setFilters((f) => ({ ...f, stats: { ...f.stats, [k]: Number(e.target.value) } }))} className="w-full accent-[#8B6BC0]" />
                        <input type="range" min={0} max={100} value={filters.statsMax[k]} onChange={(e) => setFilters((f) => ({ ...f, statsMax: { ...f.statsMax, [k]: Number(e.target.value) } }))} className="w-full accent-[#8B6BC0]" />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={resetFilters} className="text-[10px] font-bold text-[#8B8593] hover:text-[#F2ECDD]">Reset filters</button>
              </div>
            )}

            <div className="grid sm:grid-cols-2 dt:grid-cols-3 gap-2">
              {[...pool].filter(passesFilters).sort((a, b) => {
                const valOf = (w) => (sortField === "overall" ? attrOf(w) : sortField === "ranking" ? w.rankingPts : w[sortField]);
                return valOf(b) - valOf(a);
              }).map((w) => {
                const rival = w.contractedTo && w.contractedTo !== "player" ? RIVAL_COMPANIES.find((c) => c.id === w.contractedTo) : null;
                const isPlayerSigned = w.contractedTo === "player";
                const isPerUse = perUseRoster.includes(w.name);
                const onCooldown = w.hireCooldownUntil && weekNumber < w.hireCooldownUntil;
                const weeksLeft = w.contractExpiresWeek != null ? w.contractExpiresWeek - weekNumber : null;
                const inRenewalWindow = weeksLeft !== null && weeksLeft >= 0 && weeksLeft <= RENEWAL_WINDOW_WEEKS;
                const poachableFromRival = !!rival && inRenewalWindow;
                const inBiddingWar = pendingOffers.some((e) => e.wrestlerName === w.name);
                const statusColor = rosterStatusColor(w);
                return (
                  <div key={w.name} className="bg-[#131117] border border-[#2B2733] rounded-lg p-3" style={statusColor ? { borderLeftColor: statusColor, borderLeftWidth: 4 } : undefined}>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-1 min-w-0">
                        <button onClick={() => toggleShortlist(w.name)} className={shortlist.includes(w.name) ? "text-yellow-400 shrink-0" : "text-[#8B8593] hover:text-yellow-400 shrink-0"} title={shortlist.includes(w.name) ? "Remove from shortlist" : "Add to shortlist"}>
                          <Star size={13} fill={shortlist.includes(w.name) ? "currentColor" : "none"} />
                        </button>
                        <button onClick={() => setDetailWrestler(w)} className="font-black text-sm text-left hover:text-[#8B6BC0] transition-colors truncate" style={{ fontFamily: "Anton, sans-serif" }}>{w.name.toUpperCase()}</button>
                      </div>
                      {(!rival || poachableFromRival) && !isPlayerSigned && !onCooldown && (
                        <div className="flex gap-1 shrink-0">
                          {!isPerUse && !rival && (
                            <button onClick={() => startNegotiating(w)} className="text-[10px] font-bold px-2 py-1 rounded border border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#241B33]">Per Use</button>
                          )}
                          {exceedsHireCap(w) ? (
                            <span className="text-[9px] text-[#8B8593] italic px-1 self-center" title={`Too big a name to sign exclusively at ${popularityTier(popularity)} level`}>Above your level</span>
                          ) : (
                            <button onClick={() => startHiring(w)} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-[#5B3B8C] hover:bg-[#6C47A3]"><Plus size={11} /> {rival ? "Bid" : "Exclusive"}</button>
                          )}
                        </div>
                      )}
                      {rival && !onCooldown && feederCompany && isScoutProspect(w) && (
                        <button onClick={() => startScouting(w)} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#241B33] shrink-0" title="Poach this prospect into your Developmental system"><Plus size={11} /> Scout</button>
                      )}
                      {onCooldown && <span className="text-[9px] text-[#8B8593] shrink-0">Cooldown {w.hireCooldownUntil - weekNumber}wk</span>}
                    </div>
                    <div className="text-[10px] font-semibold flex items-center gap-1 flex-wrap">
                      <span className="text-[#8B6BC0]">OVR {Math.round(attrOf(w))} &middot; {w.sex} &middot; {w.wins}-{w.losses}</span>{w.injuryWeeksRemaining && <span className="text-red-400 text-[9px]"> &middot; INJURED</span>}
                      {rival ? <span className="text-[9px] text-[#8B8593]">&middot; Signed: {rival.name}{inRenewalWindow ? ` (exp ${weeksLeft}wk)` : ""}</span> : isPlayerSigned ? <span className="text-[9px] text-[#8B8593]">&middot; Exclusive to you{inRenewalWindow ? ` (exp ${weeksLeft}wk)` : ""}</span> : isPerUse ? <span className="text-[9px] text-[#8B8593]">&middot; Per-use (yours)</span> : <span className="text-[9px] text-[#8B8593]">&middot; Freelance</span>}
                      {rival && isScoutProspect(w) && <span className="text-[9px] text-[#8B6BC0] italic">&middot; Prospect</span>}
                      {inBiddingWar && <span className="text-[9px] text-yellow-400 italic">&middot; Bidding war</span>}
                    </div>
                  </div>
                );
              })}
              {pool.filter(passesFilters).length === 0 && (
                <div className="text-xs text-[#8B8593] italic col-span-2">No wrestlers match these filters.</div>
              )}
            </div>

            {hiringTarget && (() => {
              const entry = pendingOffers.find((e) => e.wrestlerName === hiringTarget.name);
              const myOffer = entry?.offers.find((o) => o.companyId === "player");
              const rivalBidderNames = (entry?.offers || []).filter((o) => o.companyId !== "player").map((o) => rivalCompanies.find((c) => c.id === o.companyId)?.name || "a rival promotion");
              const weeksLeft = entry ? Math.max(0, entry.resolveWeek - weekNumber) : null;
              return (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setHiringTarget(null)}>
                  <div className="booked-modal-card border rounded-lg p-5 max-w-sm w-full" style={{ backgroundColor: "#17151C", color: "#F2ECDD", borderColor: "#5B3B8C" }} onClick={(e) => e.stopPropagation()}>
                    <div className="text-lg font-black mb-1" style={{ fontFamily: "Anton, sans-serif" }}>SIGN {hiringTarget.name.toUpperCase()}</div>
                    <div className="text-[10px] text-[#8B8593] mb-3">An offer opens a bidding war rather than resolving on the spot — it settles in {NEGOTIATION_WEEKS} weeks, time enough for a rival to notice and counter-bid. They'll weigh every offer on the table (money, room to grow, your reputation, contract length) and pick whichever suits them best. Weekly wage is billed automatically once signed.</div>
                    {entry && (
                      <div className="bg-[#131117] border border-[#2B2733] rounded-lg p-2.5 mb-3 text-xs">
                        <div className="text-[#8B6BC0] font-bold mb-1">Bidding war in progress &middot; settles in {weeksLeft} week{weeksLeft === 1 ? "" : "s"}</div>
                        {myOffer && <div className="text-[#8B8593]">Your offer: £{Math.round(weeklyWage(hiringTarget) * myOffer.wageMult).toLocaleString()}/wk &middot; {myOffer.contractWeeks} weeks</div>}
                        <div className={rivalBidderNames.length > 0 ? "text-yellow-400 mt-1" : "text-[#8B8593] mt-1"}>
                          {rivalBidderNames.length > 0 ? `Also bidding: ${rivalBidderNames.join(", ")}` : "No other bidders yet."}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {CONTRACT_OPTIONS.map((wk) => (
                        <button key={wk} onClick={() => setHireWeeks(wk)} className={`px-3 py-2 rounded text-xs font-bold border ${hireWeeks === wk ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`} style={hireWeeks === wk ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C" } : undefined}>
                          {wk} weeks
                        </button>
                      ))}
                    </div>
                    <div className="text-[9px] text-[#8B8593] mb-1">WAGE OFFER</div>
                    <div className="space-y-2 mb-3">
                      {HIRE_WAGE_OFFERS.map((o) => (
                        <button key={o.key} onClick={() => setHireWageKey(o.key)} className={`w-full flex items-center justify-between px-3 py-2 rounded border text-left ${hireWageKey === o.key ? "border-[#5B3B8C] bg-[#241B33]" : "border-[#2B2733] hover:border-[#5B3B8C]"}`}>
                          <span className="text-xs font-bold">{o.label}</span>
                          <span className="text-[10px] text-[#8B8593]">£{Math.round(weeklyWage(hiringTarget) * o.mult).toLocaleString()}/wk</span>
                        </button>
                      ))}
                    </div>
                    <div className="text-[9px] text-[#8B8593] mb-1">SIGN TO</div>
                    <div className="flex gap-2 mb-3">
                      {["main", "developmental"].map((lvl) => {
                        const devLocked = lvl === "developmental" && !feederCompany;
                        return (
                          <button
                            key={lvl}
                            disabled={devLocked}
                            onClick={() => { if (!devLocked) setHireLevel(lvl); }}
                            title={devLocked ? "Found a feeder promotion from Back Office first" : undefined}
                            className={`flex-1 px-3 py-1.5 rounded text-[11px] font-bold border ${devLocked ? "text-[#5A5660] border-[#2B2733] cursor-not-allowed" : hireLevel === lvl ? "bg-[#5B3B8C] border-[#5B3B8C] text-[#F2ECDD]" : "border-[#2B2733] text-[#8B8593]"}`}
                          >
                            {lvl === "main" ? "Main Roster" : "Developmental"}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[9px] text-[#8B8593] mb-1">CARD POSITION</div>
                    <select value={hirePushLevel || ""} onChange={(e) => setHirePushLevel(e.target.value || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs mb-4">
                      <option value="">Auto (from ability: {hiringTarget.tier})</option>
                      {TIER_ORDER.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={confirmHire} className="w-full py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] text-xs font-bold rounded">{entry ? "Raise Your Offer" : "Make An Offer"}</button>
                    <button onClick={() => setHiringTarget(null)} className="w-full mt-2 px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Close</button>
                  </div>
                </div>
              );
            })()}

            {scoutingTarget && (
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setScoutingTarget(null)}>
                <div className="booked-modal-card border rounded-lg p-5 max-w-sm w-full" style={{ backgroundColor: "#17151C", color: "#F2ECDD", borderColor: "#5B3B8C" }} onClick={(e) => e.stopPropagation()}>
                  <div className="text-lg font-black mb-1" style={{ fontFamily: "Anton, sans-serif" }}>SCOUT {scoutingTarget.name.toUpperCase()}</div>
                  <div className="text-[10px] text-[#8B8593] mb-3">
                    Currently signed to {RIVAL_COMPANIES.find((c) => c.id === scoutingTarget.contractedTo)?.name || "a rival promotion"} — a {scoutingTarget.age}-year-old {scoutingTarget.tier.toLowerCase()} talent. Buying them out and signing them to your Developmental system costs £{scoutCost(scoutingTarget).toLocaleString()}, paid only if they say yes. They might say no — if so, they're off-limits for 2-4 weeks.
                  </div>
                  {scoutResult === "refused" && <div className="text-xs text-red-400 mb-3">{scoutingTarget.name} isn't interested in leaving right now. Try again in a few weeks.</div>}
                  {scoutResult === "accepted" && <div className="text-xs text-[#8B6BC0] mb-3">Scouted! {scoutingTarget.name} joins your Developmental system.</div>}
                  {!scoutResult && (
                    <button onClick={confirmScout} disabled={bank < scoutCost(scoutingTarget)} className="w-full py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded">
                      {bank < scoutCost(scoutingTarget) ? "Not enough funds" : `Make the move (£${scoutCost(scoutingTarget).toLocaleString()})`}
                    </button>
                  )}
                  <button onClick={() => setScoutingTarget(null)} className="w-full mt-2 px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Close</button>
                </div>
              </div>
            )}

          </div>
            )}
          </div>
        )}

        {tab === "staff" && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">STAFF</div>
            <div className="text-[10px] text-[#8B8593] mb-3">Behind-the-scenes hires with no rival bidding — pick straight from the candidate pool. Your best hire per role is the one that counts.</div>

            <div className="bg-[#131117] border border-[#2B2733] rounded-lg p-3 mb-4 grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex justify-between"><span className="text-[#8B8593]">Match rating bonus</span><span className="font-bold text-[#8B6BC0]">+{staffRatingBonus}</span></div>
              <div className="flex justify-between"><span className="text-[#8B8593]">Injury chance</span><span className="font-bold text-[#8B6BC0]">&minus;{Math.round((1 - medicalInjuryFactor) * 100)}%</span></div>
              <div className="flex justify-between"><span className="text-[#8B8593]">Catastrophe chance</span><span className="font-bold text-[#8B6BC0]">&minus;{Math.round((1 - ringCrewCatastropheFactor) * 100)}%</span></div>
              <div className="flex justify-between"><span className="text-[#8B8593]">Security incident chance</span><span className="font-bold text-[#8B6BC0]">&minus;{Math.round((1 - securityIncidentFactor) * 100)}%</span></div>
              <div className="flex justify-between"><span className="text-[#8B8593]">Developmental growth odds</span><span className="font-bold text-[#8B6BC0]">+{Math.round((bestTrainerSkill / 100) * 12)}pp</span></div>
              <div className="flex justify-between"><span className="text-[#8B8593]">Staff payroll (weekly)</span><span className="font-bold">£{staffWeeklyPayroll.toLocaleString()}</span></div>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {STAFF_ROLES.map((r) => (
                <SubTabButton key={r.key} active={staffSubTab === r.key} onClick={() => setStaffSubTab(r.key)} icon={HardHat} label={r.label} />
              ))}
            </div>

            {STAFF_ROLES.filter((r) => r.key === staffSubTab).map((role) => (
              <div key={role.key}>
                <div className="text-[10px] text-[#8B8593] mb-3">{role.desc}</div>

                <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-2">HIRED</div>
                <div className="grid sm:grid-cols-2 dt:grid-cols-3 gap-2 mb-4">
                  {hiredStaff.filter((s) => s.role === role.key).map((s) => (
                    <div key={s.id} className="bg-[#241B33] border border-[#5B3B8C] rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-sm">{s.name}</div>
                        <button onClick={() => releaseStaff(s)} className="text-[9px] font-bold px-2 py-1 rounded border border-[#2B2733] text-[#8B8593] hover:text-red-400 hover:border-red-400">Release</button>
                      </div>
                      <div className="text-[10px] text-[#8B8593] mt-1">Skill {s.skill} &middot; £{staffWeeklyWage(s.skill).toLocaleString()}/wk &middot; under contract {Math.max(0, (s.contractExpiresWeek ?? weekNumber) - weekNumber)}wk</div>
                    </div>
                  ))}
                  {hiredStaff.filter((s) => s.role === role.key).length === 0 && (
                    <div className="text-xs text-[#8B8593] italic col-span-2">No one hired for this role yet.</div>
                  )}
                </div>

                <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-2">CANDIDATES</div>
                <div className="grid sm:grid-cols-2 dt:grid-cols-3 gap-2">
                  {staffPool.filter((s) => s.role === role.key && s.contractedTo === null).map((s) => (
                    <div key={s.id} className="bg-[#131117] border border-[#2B2733] rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-sm">{s.name}</div>
                        <button onClick={() => startHiringStaff(s)} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-[#5B3B8C] hover:bg-[#6C47A3]"><Plus size={11} /> Hire</button>
                      </div>
                      <div className="text-[10px] text-[#8B8593] mt-1">Skill {s.skill} &middot; £{staffWeeklyWage(s.skill).toLocaleString()}/wk</div>
                    </div>
                  ))}
                  {/* Rivals compete for the same pool — shown greyed-out, not just
                      silently missing, so it's visible that someone else got there first. */}
                  {staffPool.filter((s) => s.role === role.key && s.contractedTo && s.contractedTo !== "player").map((s) => (
                    <div key={s.id} className="bg-[#131117] border border-[#2B2733] rounded-lg p-3 opacity-50">
                      <div className="font-bold text-sm">{s.name}</div>
                      <div className="text-[10px] text-[#8B8593] mt-1">Skill {s.skill} &middot; hired by {rivalCompanies.find((c) => c.id === s.contractedTo)?.name || "a rival promotion"}</div>
                    </div>
                  ))}
                  {staffPool.filter((s) => s.role === role.key && s.contractedTo === null).length === 0 && (
                    <div className="text-xs text-[#8B8593] italic col-span-2">No free candidates right now — check back after a few weeks.</div>
                  )}
                </div>
              </div>
            ))}

            {hiringStaffTarget && (
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setHiringStaffTarget(null)}>
                <div className="booked-modal-card border rounded-lg p-5 max-w-sm w-full" style={{ backgroundColor: "#17151C", color: "#F2ECDD", borderColor: "#5B3B8C" }} onClick={(e) => e.stopPropagation()}>
                  <div className="text-lg font-black mb-1" style={{ fontFamily: "Anton, sans-serif" }}>HIRE {hiringStaffTarget.name.toUpperCase()}</div>
                  <div className="text-[10px] text-[#8B8593] mb-3">£{staffWeeklyWage(hiringStaffTarget.skill).toLocaleString()}/week, billed automatically while under contract.</div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {CONTRACT_OPTIONS.map((wk) => (
                      <button key={wk} onClick={() => setStaffHireWeeks(wk)} className={`px-3 py-2 rounded text-xs font-bold border ${staffHireWeeks === wk ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`} style={staffHireWeeks === wk ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C" } : undefined}>
                        {wk} weeks
                      </button>
                    ))}
                  </div>
                  <button onClick={confirmHireStaff} className="w-full py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] text-xs font-bold rounded">Offer contract</button>
                  <button onClick={() => setHiringStaffTarget(null)} className="w-full mt-2 px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Close</button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "promotions" && !viewingCompany && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">PROMOTIONS LEADERBOARD</div>
            <div className="text-[10px] text-[#8B8593] mb-3">Fictional rival companies, ranked by popularity. Tap one for more detail.</div>
            <div className="space-y-2 dt:space-y-0 dt:grid dt:grid-cols-2 dt:gap-2">
              {[{ id: "player", name: companyName, popularity, isPlayer: true, bookerName: playerName || "You", funds: bank, showsRun: totalShowsRun }, ...rivalCompanies]
                .sort((a, b) => b.popularity - a.popularity)
                .map((co, i) => {
                  const rosterSize = co.isPlayer ? roster.length : pool.filter((w) => w.contractedTo === co.id).length;
                  const champ = co.isPlayer ? null : rivalTitles.find((t) => t.companyId === co.id);
                  return (
                    <button
                      key={co.id}
                      onClick={() => (co.isPlayer ? setShowPopularityModal(true) : setViewingCompany(co))}
                      className={`w-full text-left rounded-lg p-3 border transition-colors ${co.isPlayer ? "bg-[#241B33] border-[#5B3B8C]" : "bg-[#17151C] border-[#2B2733] hover:border-[#5B3B8C]"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#8B8593] w-4">#{i + 1}</span>
                          <span className="font-bold text-sm">{co.name}{co.isPlayer && <span className="text-[10px] text-[#8B6BC0]"> (You)</span>}{co.acquired && <span className="text-[10px] text-[#8B6BC0]"> (Acquired by you)</span>}{workingAgreements.includes(co.id) && <span className="text-[10px] text-green-400"> (Working agreement)</span>}</span>
                        </div>
                        <span className="text-[11px] text-[#8B8593]">{popularityTier(co.popularity)} ({Math.round(co.popularity)})</span>
                      </div>
                      <div className="text-[10px] text-[#8B8593] mt-1">
                        Booker: {co.bookerName} &middot; Funds: £{Math.round(co.funds).toLocaleString()} &middot; Shows run: {co.showsRun} &middot; Roster: {rosterSize}
                        {champ && <> &middot; Champion: {champ.holder || "Vacant"}</>}
                      </div>
                    </button>
                  );
                })}
            </div>

            {feederCompany && (() => {
              const feederShows = showHistory.filter((r) => r.showLevel === "developmental");
              const trainees = roster.filter((w) => w.rosterLevel === "developmental");
              const avgRating = feederShows.length ? Math.round(feederShows.reduce((s, r) => s + r.fullRating, 0) / feederShows.length) : 0;
              const trainers = staffPool.filter((s) => s.role === "trainer" && s.contractedTo === "player");
              // A rough, clearly-labeled ETA — not a promise — mirroring the real
              // weekly training-roll odds (see the aging/training pass in runShow):
              // chance of a hit, how many stats move on a hit, averaged per show,
              // assuming they're actually kept on the card every time out.
              const perShowGain = (Math.min(0.97, 0.85 + (bestTrainerSkill / 100) * 0.12) * (1 + (0.4 + (bestTrainerSkill / 100) * 0.3)) * 2) / 10;
              const traineeETA = (w) => {
                const gap = Math.max(0, potentialOf(w) - avgStats(w));
                return gap <= 0.5 ? 0 : Math.max(1, Math.ceil(gap / perShowGain));
              };
              const nextGraduation = trainees.length > 0
                ? [...trainees].map((w) => ({ name: w.name, eta: traineeETA(w) })).sort((a, b) => a.eta - b.eta)[0]
                : null;
              return (
                <div className="mt-4">
                  <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-2">YOUR TRAINING FACILITY</div>
                  <div className="bg-[#241B33] border border-[#5B3B8C] rounded-lg p-3 mb-3">
                    <div className="font-bold text-sm mb-1">{feederCompany.name}</div>
                    <div className="text-[10px] text-[#8B8593]">
                      Founded Y{yearOf(feederCompany.foundedWeek)} Wk{weekOfYear(feederCompany.foundedWeek)} &middot; Trainees: {trainees.length} &middot; Shows run: {feederShows.length} &middot; Avg. rating: {avgRating}
                    </div>
                    {nextGraduation && (
                      <div className="text-[10px] text-[#8B8593] mt-1">Next Graduation: <span className="text-[#F2ECDD] font-semibold">{nextGraduation.name}</span>{nextGraduation.eta > 0 ? <> — ~{nextGraduation.eta} more show{nextGraduation.eta === 1 ? "" : "s"} if kept booked every time</> : <> — any show now</>}</div>
                    )}
                    <div className="text-[10px] text-[#8B8593] mt-1">
                      {trainers.length > 0 ? <>Trainer{trainers.length === 1 ? "" : "s"}: <span className="text-[#F2ECDD] font-semibold">{trainers.map((t) => `${t.name} (${t.skill})`).join(", ")}</span></> : <span className="italic">No Trainer hired yet — one on Staff raises every trainee's odds of closing the gap each week.</span>}
                    </div>
                    <div className="text-[9px] text-[#8B8593] italic mt-1">Built from shows booked at the Developmental level — manage it from Book &middot; Show Level and Roster &middot; Developmental. Booking a trainee against a noticeably more experienced opponent (a veteran per-use name) adds an extra boost.</div>
                  </div>

                  {trainees.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5">CURRENT TRAINEES</div>
                      <div className="space-y-1.5">
                        {trainees.map((w) => {
                          const pot = Math.round(potentialOf(w));
                          const cur = Math.round(avgStats(w));
                          const pct = Math.min(100, Math.round((cur / Math.max(1, pot)) * 100));
                          const eta = traineeETA(w);
                          return (
                            <div key={w.name} className="bg-[#131117] rounded-lg p-2">
                              <div className="flex justify-between text-[10px] mb-0.5"><span className="font-semibold">{w.name}</span><span className="text-[#8B8593]">Potential {pot}</span></div>
                              <div className="h-1 bg-[#0A0A0C] rounded-full overflow-hidden"><div className="h-full bg-[#8B6BC0]" style={{ width: `${pct}%` }} /></div>
                              <div className="text-[9px] text-[#8B8593] mt-0.5">{eta > 0 ? `~${eta} more show${eta === 1 ? "" : "s"} if kept booked every time` : "Ready to graduate any show now"}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5">ALUMNI</div>
                    {developmentalAlumni.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {developmentalAlumni.map((a, i) => (
                          <span key={`${a.name}-${a.graduatedWeek}-${i}`} className="text-[11px] bg-[#131117] border border-[#2B2733] rounded-full px-2 py-1" title={`Graduated Y${a.year} Wk${a.weekOfYear} at ${a.overall} overall (${a.tier})`}>
                            {a.name}
                          </span>
                        ))}
                      </div>
                    ) : <div className="text-xs text-[#8B8593] italic">No graduates yet — a trainee shows up here once they train up to their potential and move to the main roster.</div>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {tab === "promotions" && viewingCompany && (() => {
          // Re-derive from the live array by id — viewingCompany is a snapshot
          // taken when the leaderboard row was clicked, so funds/showsRun/
          // acquired status would otherwise go stale the moment an action
          // here (acquire, propose/end agreement) changes the real data.
          const co = rivalCompanies.find((c) => c.id === viewingCompany.id) || viewingCompany;
          const signedRoster = pool.filter((w) => w.contractedTo === co.id);
          const signedNames = new Set(signedRoster.map((w) => w.name));
          const rivalHiredStaff = staffPool.filter((s) => s.contractedTo === co.id);
          const champ = rivalTitles.find((t) => t.companyId === co.id);
          const coStables = stables.filter((s) => s.members.slice(0, 2).length === 2 && s.members.slice(0, 2).every((n) => signedNames.has(n)));
          return (
            <div>
              <button onClick={() => setViewingCompany(null)} className="flex items-center gap-1 text-xs text-[#8B8593] hover:text-[#F2ECDD] mb-3">
                <ChevronDown size={14} className="rotate-90" /> Back to Promotions
              </button>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-lg font-black" style={{ fontFamily: "Anton, sans-serif" }}>{co.name}</div>
                  <div className="text-[10px] text-[#8B8593]">{popularityTier(co.popularity)} &middot; Score {Math.round(co.popularity)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 dt:grid-cols-6 gap-2 mb-3 text-xs">
                <div className="bg-[#131117] rounded-lg p-2.5"><div className="text-[9px] text-[#8B8593]">BOOKER</div><div className="font-bold">{co.bookerName}</div></div>
                <div className="bg-[#131117] rounded-lg p-2.5"><div className="text-[9px] text-[#8B8593]">FUNDS</div><div className="font-bold booked-mono" style={{ color: "var(--gold)" }}>£{Math.round(co.funds).toLocaleString()}</div></div>
                <div className="bg-[#131117] rounded-lg p-2.5"><div className="text-[9px] text-[#8B8593]">SHOWS RUN</div><div className="font-bold">{co.showsRun}</div></div>
                <div className="bg-[#131117] rounded-lg p-2.5"><div className="text-[9px] text-[#8B8593]">CHAMPION</div><div className="font-bold">{champ?.holder || "Vacant"}</div></div>
                <div className="bg-[#131117] rounded-lg p-2.5" title="Backstage staff quality — they hire and lose people from the same candidate pool you do, so this moves over time rather than just tracking their size."><div className="text-[9px] text-[#8B8593]">PRODUCTION</div><div className="font-bold">{rivalProductionLabel(rivalStaffBonus(co.popularity, rivalHiredStaff.map((s) => s.skill)))} <span className="text-[9px] text-[#8B8593] font-normal">({rivalHiredStaff.length}/{STAFF_ROLES.length} roles)</span></div></div>
                <div className="bg-[#131117] rounded-lg p-2.5" title="Their typical show length — bigger promotions run longer, more match-heavy cards."><div className="text-[9px] text-[#8B8593]">SHOW LENGTH</div><div className="font-bold">~{rivalShowMinutes(co.popularity)} min</div></div>
              </div>

              {co.acquired ? (
                <div className="bg-[#241B33] border border-[#5B3B8C] rounded-lg p-3 text-xs mb-3 flex items-center gap-2">
                  <Award size={14} className="text-[#8B6BC0]" /> Acquired by {companyName} — no longer an independent rival.
                </div>
              ) : (
                <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3 mb-3">
                  <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-2">RELATIONSHIP</div>
                  <div className="flex flex-wrap gap-2">
                    {workingAgreements.includes(co.id) ? (
                      <button onClick={() => endAgreement(co)} className="px-3 py-1.5 rounded text-[11px] font-bold border border-[#5B3B8C] bg-[#5B3B8C] text-[#F2ECDD]">
                        End Working Agreement
                      </button>
                    ) : canProposeAgreement(co) ? (
                      <button onClick={() => proposeAgreement(co)} className="px-3 py-1.5 rounded text-[11px] font-bold border border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#241B33]">
                        Propose Working Agreement
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#8B8593] italic self-center">
                        Too big a gap in status for a working agreement {popularityTier(co.popularity) !== popularityTier(popularity) ? `(they're ${popularityTier(co.popularity)}, you're ${popularityTier(popularity)})` : ""}
                      </span>
                    )}
                    <button onClick={() => setAcquiringTarget(co)} disabled={bank < companyPurchaseCost(co)} className="px-3 py-1.5 rounded text-[11px] font-bold border border-red-900 text-red-300 hover:bg-red-950 disabled:opacity-40 disabled:cursor-not-allowed">
                      Acquire (£{companyPurchaseCost(co).toLocaleString()})
                    </button>
                  </div>
                  {workingAgreements.includes(co.id) && (
                    <div className="text-[9px] text-[#8B8593] italic mt-2">Their signed roster can now be booked as guest talent on your shows, at a discounted loan fee ({Math.round(AGREEMENT_TALENT_FEE_MULT * 100)}% of a normal per-use fee) rather than free.</div>
                  )}
                </div>
              )}

              {coStables.length > 0 && (
                <>
                  <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5">TAG TEAMS</div>
                  <div className="space-y-1 mb-3">
                    {coStables.map((s) => (
                      <div key={s.id} className="text-xs bg-[#131117] rounded px-2 py-1.5">
                        <span className="font-semibold">{s.name}</span> <span className="text-[#8B8593]">— {s.members.slice(0, 2).join(" & ")} ({s.wins}-{s.losses})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {(() => {
                const regions = regionPopularity(co);
                return (
                  <div className="mb-3">
                    <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5">POPULARITY BY REGION</div>
                    <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3 space-y-1.5">
                      {REGIONS.map((r) => (
                        <div key={r} className="flex items-center gap-2 text-[10px]">
                          <span className="w-28 shrink-0 text-[#8B8593]">{r}</span>
                          <div className="flex-1 h-2 bg-[#0A0A0C] rounded-full overflow-hidden"><div className="h-full bg-[#8B6BC0]" style={{ width: `${regions[r]}%` }} /></div>
                          <span className="w-7 text-right font-bold text-[#F2ECDD]">{regions[r]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const coFinance = rivalFinanceHistory.filter((h) => h.companyId === co.id).sort((a, b) => a.weekNumber - b.weekNumber);
                return coFinance.length > 1 ? (
                  <div className="mb-3">
                    <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5">FUNDS &amp; POPULARITY TREND</div>
                    <div className="grid dt:grid-cols-2 gap-2">
                      <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-2" style={{ height: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={coFinance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2B2733" />
                            <XAxis dataKey="weekNumber" stroke="#8B8593" fontSize={9} tick={false} />
                            <YAxis stroke="#8B8593" fontSize={9} tickFormatter={(v) => `£${Math.round(v / 1000)}k`} width={40} />
                            <Tooltip contentStyle={{ background: "#131117", border: "1px solid #2B2733", fontSize: 11 }} formatter={(v) => [`£${Math.round(v).toLocaleString()}`, "Funds"]} labelFormatter={(l, p) => (p && p[0] ? `Y${p[0].payload.year} Wk${p[0].payload.weekOfYear}` : "")} />
                            <Line type="monotone" dataKey="funds" stroke="#C9A227" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-2" style={{ height: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={coFinance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2B2733" />
                            <XAxis dataKey="weekNumber" stroke="#8B8593" fontSize={9} tick={false} />
                            <YAxis stroke="#8B8593" fontSize={9} domain={[0, 100]} width={28} />
                            <Tooltip contentStyle={{ background: "#131117", border: "1px solid #2B2733", fontSize: 11 }} formatter={(v) => [Math.round(v), "Popularity"]} labelFormatter={(l, p) => (p && p[0] ? `Y${p[0].payload.year} Wk${p[0].payload.weekOfYear}` : "")} />
                            <Line type="monotone" dataKey="popularity" stroke="#8B6BC0" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
              {(() => {
                const rivalTrainees = pool.filter((w) => w.contractedTo === co.id && w.rosterLevel === "developmental");
                const rivalTrainers = staffPool.filter((s) => s.role === "trainer" && s.contractedTo === co.id);
                const rivalAlumni = developmentalAlumni.filter((a) => (a.companyId || "player") === co.id);
                if (rivalTrainees.length === 0 && rivalTrainers.length === 0 && rivalAlumni.length === 0) return null;
                const rivalBestTrainerSkill = rivalTrainers.reduce((max, s) => Math.max(max, s.skill), 0);
                const perShowGain = (Math.min(0.97, 0.5 + (rivalBestTrainerSkill / 100) * 0.12) * (1 + (0.4 + (rivalBestTrainerSkill / 100) * 0.3)) * 2) / 10;
                return (
                  <div className="mb-3">
                    <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5">{co.name.toUpperCase()} TRAINING FACILITY</div>
                    <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3 space-y-2">
                      <div className="text-[10px] text-[#8B8593]">
                        {rivalTrainers.length > 0 ? <>Trainer{rivalTrainers.length === 1 ? "" : "s"}: <span className="text-[#F2ECDD] font-semibold">{rivalTrainers.map((t) => `${t.name} (${t.skill})`).join(", ")}</span></> : <span className="italic">No Trainer hired yet.</span>}
                      </div>
                      {rivalTrainees.length > 0 && (
                        <div className="space-y-1.5">
                          {rivalTrainees.map((w) => {
                            const pot = Math.round(potentialOf(w));
                            const cur = Math.round(avgStats(w));
                            const pct = Math.min(100, Math.round((cur / Math.max(1, pot)) * 100));
                            const gap = Math.max(0, pot - cur);
                            const eta = gap <= 0.5 ? 0 : Math.max(1, Math.ceil(gap / perShowGain));
                            return (
                              <div key={w.name} className="bg-[#131117] rounded-lg p-2">
                                <div className="flex justify-between text-[10px] mb-0.5"><span className="font-semibold">{w.name}</span><span className="text-[#8B8593]">Potential {pot}</span></div>
                                <div className="h-1 bg-[#0A0A0C] rounded-full overflow-hidden"><div className="h-full bg-[#8B6BC0]" style={{ width: `${pct}%` }} /></div>
                                <div className="text-[9px] text-[#8B8593] mt-0.5">{eta > 0 ? `~${eta} more show${eta === 1 ? "" : "s"} if kept booked every time` : "Ready to graduate any show now"}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {rivalAlumni.length > 0 && (
                        <div>
                          <div className="text-[9px] text-[#8B8593] font-bold mb-1">ALUMNI</div>
                          <div className="flex flex-wrap gap-1.5">
                            {rivalAlumni.map((a, i) => (
                              <span key={`${a.name}-${a.graduatedWeek}-${i}`} className="text-[11px] bg-[#131117] border border-[#2B2733] rounded-full px-2 py-1" title={`Graduated Y${a.year} Wk${a.weekOfYear} at ${a.overall} overall (${a.tier})`}>
                                {a.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5">SIGNED ROSTER ({signedRoster.length}) BY CARD POSITION</div>
              <div className="space-y-2 mb-1">
                {[...TIER_ORDER].reverse().map((t) => {
                  const inTier = signedRoster.filter((w) => effectiveTier(w) === t);
                  if (inTier.length === 0) return null;
                  return (
                    <div key={t} className="bg-[#131117] rounded-lg p-2">
                      <div className="text-[9px] text-[#8B8593] font-bold mb-1">{t.toUpperCase()} ({inTier.length})</div>
                      <div className="flex flex-wrap gap-1.5">
                        {inTier.map((w) => (
                          <span key={w.name} className="text-[11px] bg-[#17151C] border border-[#2B2733] rounded-full px-2 py-0.5">
                            {w.name === champ?.holder && <Award size={10} className="text-[#8B6BC0] inline mr-1" />}{w.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {signedRoster.length === 0 && <div className="text-xs text-[#8B8593] italic">No wrestlers signed yet.</div>}
              </div>

              <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5 mt-3">SHOWS</div>
              <div className="text-[10px] text-[#8B8593] mb-2">
                {(() => {
                  const { weekly, ppv, runsWeekly } = rivalEventTemplates(co);
                  if (!runsWeekly) return `${weekly[0]} — an occasional small show, roughly once a month.`;
                  return `${weekly.join(", ")}${ppv ? ` · ${ppv} (monthly special)` : ""}`;
                })()}
              </div>
              <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5">RECENT SHOWS</div>
              <div className="space-y-2">
                {rivalShowHistory.filter((r) => r.companyId === co.id).slice(0, 5).map((r) => (
                  <div key={r.id} className="bg-[#131117] border border-[#2B2733] rounded-lg p-3">
                    <div className="text-xs font-bold mb-1">{r.eventName || co.name} &middot; Y{r.year} Wk{r.weekOfYear} &middot; ~{r.attendance.toLocaleString()} attendance{r.wasPPV && <span className="text-[#8B6BC0]"> &middot; PPV</span>}</div>
                    <div className="space-y-1">
                      {r.matches.map((m, i) => (
                        <div key={i} className="text-[11px] text-[#8B8593] flex items-center justify-between">
                          <span><span className={m.winner === m.a ? "text-[#CFC9BB] font-semibold" : "line-through"}>{m.a}</span> vs <span className={m.winner === m.b ? "text-[#CFC9BB] font-semibold" : "line-through"}>{m.b}</span></span>
                          <span className="flex items-center gap-1"><Star size={9} className="text-[#8B6BC0]" />{m.rating}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {rivalShowHistory.filter((r) => r.companyId === co.id).length === 0 && (
                  <div className="text-xs text-[#8B8593] italic">No shows run yet — check back after a few weeks.</div>
                )}
              </div>
            </div>
          );
        })()}

        {tab === "ratings" && (() => {
          const popularityAt = (companyId, atWeek) => {
            const rows = rivalFinanceHistory.filter((h) => h.companyId === companyId && h.weekNumber <= atWeek);
            if (rows.length > 0) return rows.reduce((best, r) => (r.weekNumber > best.weekNumber ? r : best)).popularity;
            if (companyId === "player") return popularity;
            return RIVAL_COMPANIES.find((c) => c.id === companyId)?.popularity ?? rivalCompanies.find((c) => c.id === companyId)?.popularity ?? 0;
          };
          const playerRows = showHistory.map((r) => {
            const pop = popularityAt("player", r.weekNumber ?? r.showNumber);
            const net = networkDeal || networkFor(pop);
            const viewers = networkDeal ? Math.round(pop * networkDeal.viewerMult * (r.wasPPV ? 1.4 : 1)) : estimatedViewers(pop, r.wasPPV);
            return { key: `p-${r.id}`, event: `${r.city} (${r.arena})`, promotion: companyName, network: net.name, type: r.wasPPV ? "PPV" : "TV", date: r.date, viewers };
          });
          const rivalRows = rivalShowHistory.map((r) => {
            const pop = popularityAt(r.companyId, r.weekNumber);
            const net = networkFor(pop);
            return { key: `r-${r.id}`, event: r.eventName || `${r.companyName} Live Event`, promotion: r.companyName, network: net.name, type: r.wasPPV ? "PPV" : "TV", date: r.date, viewers: estimatedViewers(pop, r.wasPPV) };
          });
          const allRows = [...playerRows, ...rivalRows].sort((a, b) => b.viewers - a.viewers).slice(0, 100);
          return (
            <div>
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">RATINGS</div>
              <div className="text-[10px] text-[#8B8593] mb-4">Every show still on file — yours and every rival's — ranked by estimated viewers. Viewers are worked out from each company's popularity at the time and whichever network tier that would have qualified for, not separately tracked per rival.</div>
              {allRows.length === 0 ? (
                <div className="text-xs text-[#8B8593] italic">Nothing to rank yet — run a few shows first.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-left text-[9px] text-[#8B8593] tracking-widest border-b border-[#2B2733]">
                        <th className="py-2 pr-2">EVENT</th>
                        <th className="py-2 pr-2">PROMOTION</th>
                        <th className="py-2 pr-2">NETWORK</th>
                        <th className="py-2 pr-2">TYPE</th>
                        <th className="py-2 pr-2">DATE</th>
                        <th className="py-2 pr-2 text-right">VIEWERS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRows.map((r) => (
                        <tr key={r.key} className="border-b border-[#17151C] hover:bg-[#131117]">
                          <td className="py-1.5 pr-2 font-semibold">{r.event}</td>
                          <td className="py-1.5 pr-2 text-[#8B8593]">{r.promotion}</td>
                          <td className="py-1.5 pr-2 text-[#8B8593]">{r.network}</td>
                          <td className="py-1.5 pr-2">{r.type === "PPV" && <span className="text-[#8B6BC0] font-bold">PPV</span>}{r.type === "TV" && <span className="text-[#8B8593]">TV</span>}</td>
                          <td className="py-1.5 pr-2 text-[#8B8593]">{formatDate(r.date)}</td>
                          <td className="py-1.5 pr-2 text-right font-bold booked-mono">{r.viewers.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {tab === "deals" && (
          <div className="flex flex-col dt:flex-row gap-5">
          <div className="flex-1 min-w-0 space-y-6 dt:space-y-0 dt:grid dt:grid-cols-2 dt:gap-6 dt:items-start">
            <div>
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">TV NETWORK</div>
              <div className="text-[10px] text-[#8B8593] mb-3">Pays per estimated viewer, based on your popularity, for the length of the deal.</div>
              {networkDeal ? (
                <div className="bg-[#17151C] border border-[#5B3B8C] rounded-lg p-4">
                  <div className="font-black text-base mb-1" style={{ fontFamily: "Anton, sans-serif" }}>{networkDeal.name}</div>
                  <div className="text-xs text-[#8B8593]">
                    £{networkDeal.payPerViewer.toFixed(2)}/viewer &middot; ~{Math.round(popularity * networkDeal.viewerMult).toLocaleString()} viewers &middot; £{Math.round(popularity * networkDeal.viewerMult * networkDeal.payPerViewer).toLocaleString()}/wk
                  </div>
                  <div className="text-[10px] text-[#8B8593] mt-1">{networkDeal.expiresWeek - weekNumber} weeks remaining</div>
                  <div className="text-[9px] text-[#8B8593] mt-1 italic">
                    {networkDeal.eventTemplateId
                      ? `Pays out only when ${eventTemplates.find((t) => t.id === networkDeal.eventTemplateId)?.name ?? "its attached show"} airs — attach/detach from Calendar · Show Events.`
                      : "Pays out every week the deal is active, whether or not you run a show — attach it to a specific show from Calendar · Show Events to only pay out when that show airs."}
                  </div>
                </div>
              ) : networkOffers.length > 0 ? (
                <div className="space-y-2">
                  {networkOffers.map((o) => (
                    <button key={o.id} onClick={() => acceptNetworkOffer(o)} className="w-full flex items-center justify-between bg-[#17151C] border border-[#2B2733] hover:border-[#5B3B8C] rounded-lg px-3 py-2.5 text-left">
                      <div>
                        <div className="font-bold text-sm">{o.name}</div>
                        <div className="text-[10px] text-[#8B8593]">£{o.payPerViewer.toFixed(2)}/viewer &middot; ~{Math.round(popularity * o.viewerMult).toLocaleString()} viewers &middot; {o.weeks} weeks</div>
                      </div>
                      <span className="text-xs font-bold text-[#8B6BC0]">£{Math.round(popularity * o.viewerMult * o.payPerViewer).toLocaleString()}/wk</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#8B8593] italic">No offers on the table right now — keep running good shows and networks will come calling.</div>
              )}
            </div>

            <div>
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">SPONSOR</div>
              <div className="text-[10px] text-[#8B8593] mb-3">A flat weekly fee for the length of the deal.</div>
              {sponsorDeal ? (
                <div className="bg-[#17151C] border border-[#5B3B8C] rounded-lg p-4">
                  <div className="font-black text-base mb-1" style={{ fontFamily: "Anton, sans-serif" }}>{sponsorDeal.name}</div>
                  <div className="text-xs text-[#8B8593]">£{sponsorDeal.weeklyPay.toLocaleString()}/wk</div>
                  <div className="text-[10px] text-[#8B8593] mt-1">{sponsorDeal.expiresWeek - weekNumber} weeks remaining</div>
                </div>
              ) : sponsorOffers.length > 0 ? (
                <div className="space-y-2">
                  {sponsorOffers.map((o) => (
                    <button key={o.id} onClick={() => acceptSponsorOffer(o)} className="w-full flex items-center justify-between bg-[#17151C] border border-[#2B2733] hover:border-[#5B3B8C] rounded-lg px-3 py-2.5 text-left">
                      <div>
                        <div className="font-bold text-sm">{o.name}</div>
                        <div className="text-[10px] text-[#8B8593]">{o.weeks} weeks</div>
                      </div>
                      <span className="text-xs font-bold text-[#8B6BC0]">£{o.weeklyPay.toLocaleString()}/wk</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#8B8593] italic">No offers on the table right now — keep running good shows and sponsors will come calling.</div>
              )}
            </div>
          </div>

          <div className="hidden dt:block dt:w-64 shrink-0">
            <div className="sticky top-4 space-y-4">
              <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">TV NETWORKS BY TIER</div>
                <div className="space-y-1">
                  {NETWORKS.map((n) => {
                    const unlocked = popularity >= n.minPopularity;
                    return (
                      <div key={n.id} className={`flex justify-between text-[10px] ${unlocked ? "text-[#CFC9BB]" : "text-[#5A5660]"}`}>
                        <span>{n.name}</span>
                        <span>{unlocked ? "✓" : `${n.minPopularity}+`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">SPONSORS BY TIER</div>
                <div className="space-y-1">
                  {SPONSORS.map((s) => {
                    const unlocked = popularity >= s.minPopularity;
                    return (
                      <div key={s.id} className={`flex justify-between text-[10px] ${unlocked ? "text-[#CFC9BB]" : "text-[#5A5660]"}`}>
                        <span>{s.name}</span>
                        <span>{unlocked ? "✓" : `${s.minPopularity}+`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {tab === "book" && (
          <div>
            <div className="flex gap-2 mb-4">
              <SubTabButton active={bookSubTab === "book"} onClick={() => setBookSubTab("book")} icon={Ticket} label="Book" />
              <SubTabButton active={bookSubTab === "results"} onClick={() => setBookSubTab("results")} icon={ListChecks} label="Results" />
            </div>

        {bookSubTab === "book" && !showResult && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="text-lg font-black" style={{ fontFamily: "Anton, sans-serif" }}>YEAR {currentYear} &middot; WEEK {weekOfYear(weekNumber)}</div>
              <div className="text-[10px] text-[#8B8593]">{formatDate(scheduledDate)}</div>
            </div>
            {!startingCity ? (
              <div className="bg-[#17151C] border border-[#5B3B8C] rounded-lg p-4">
                <div className="text-sm font-bold mb-1">Choose your home city</div>
                <div className="text-[10px] text-[#8B8593] mb-2">This is where your promotion starts out. Other cities unlock in nearby groups as you build popularity here — pick carefully, it can't be changed later.</div>
                <div className="flex flex-wrap gap-1.5">
                  {CITIES.filter((c) => !FOREIGN_CITIES.includes(c)).map((c) => (
                    <button
                      key={c}
                      onClick={() => { setStartingCity(c); setCity(c); }}
                      className="px-2.5 py-1 rounded text-[10px] font-semibold border border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD] hover:border-[#5B3B8C]"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            ) : !activeEventTemplate ? (
              <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-6 text-center">
                <div className="text-sm font-bold mb-1">No show scheduled this week</div>
                <div className="text-[10px] text-[#8B8593] mb-3">Level, venue, city, and length are all set up from Calendar &middot; Show Events — nothing to book here until one's due. You can also just advance the week without a show.</div>
                <button onClick={() => setTab("calendar")} className="px-4 py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] text-xs font-bold rounded">Go to Calendar</button>
              </div>
            ) : (
            <>
            <div className="flex flex-col dt:flex-row gap-5">
            <div className="flex-1 min-w-0 space-y-5">
            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3"><Ticket size={14} /> THIS WEEK'S SHOW</div>
              <div className="flex items-center justify-between bg-[#131117] rounded-lg px-3 py-2.5 mb-2">
                <div>
                  <div className="text-xs font-bold">{activeEventTemplate.name}</div>
                  <div className="text-[10px] text-[#8B8593]">{showLevel === "main" ? "Main Roster Show" : "Developmental Show"} &middot; {arena.name} &middot; {city}{FOREIGN_CITY_COUNTRY[city] ? ` (${FOREIGN_CITY_COUNTRY[city]})` : ""} &middot; {showMinutesTarget} min &middot; {activeEventTemplate.dayOfWeek || "Monday"}s</div>
                </div>
                <Lock size={14} className="text-[#8B8593] shrink-0" />
              </div>
              <div className="text-[9px] text-[#8B8593]">Set from Calendar &middot; Show Events — change any of this there, not here.</div>
              {travelSurcharge > 0 && (
                <div className="text-[9px] text-[#8B6BC0] mt-1.5">&#9992; Touring {FOREIGN_CITY_COUNTRY[city]} — +£{travelSurcharge.toLocaleString()} travel cost on top of the venue.</div>
              )}
              <div className="text-[10px] text-[#8B8593] mt-2">
                Capacity {arena.crowdMin.toLocaleString()}&ndash;{arena.crowdMax.toLocaleString()} &middot; Booking cost £{arena.cost.toLocaleString()}{travelSurcharge > 0 ? ` + £${travelSurcharge.toLocaleString()} travel` : ""}
              </div>
              <div className="flex items-center gap-1.5 bg-[#131117] rounded-lg px-2.5 py-2 mt-3 text-[10px]" title={fanTrend.desc}>
                <Flame size={12} className="text-[#8B6BC0] shrink-0" />
                <span className="text-[#8B8593]">Fans want</span>
                <span className="font-bold text-[#F2ECDD]">{fanTrend.label}</span>
                <span className="text-[#8B6BC0] font-bold ml-auto">+{FAN_TREND_BONUS} rtg if it fits</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-[#8B8593] mb-1"><span>TICKET PRICE</span><span className="text-[#F2ECDD] font-bold">£{ticketPrice}</span></div>
                <input type="range" min={arena.ticketMin} max={arena.ticketMax} value={ticketPrice} onChange={(e) => setTicketPrice(Number(e.target.value))} className="w-full accent-[#8B6BC0]" />
              </div>
              <div className="mt-3">
                <div className="text-[10px] text-[#8B8593] mb-1">ADVERTISING</div>
                <div className="flex gap-1 flex-wrap">
                  {AD_CAMPAIGNS.map((camp) => (
                    <button key={camp.key} onClick={() => setAdCampaign(camp.key)} className={`px-2 py-1 rounded text-[9px] font-bold border ${adCampaign === camp.key ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`} style={adCampaign === camp.key ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C" } : undefined}>
                      {camp.label}{camp.cost > 0 ? ` · £${camp.cost.toLocaleString()}` : ""}
                    </button>
                  ))}
                </div>
                {activeAdCampaign.key !== "none" && (
                  <div className="text-[9px] text-[#8B8593] italic mt-1">+{Math.round((activeAdCampaign.attendanceMult - 1) * 100)}% attendance, +{Math.round((activeAdCampaign.popularityMult - 1) * 100)}% popularity growth from this show.</div>
                )}
              </div>
            </div>
            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
              {popularity >= MERCH_UNLOCK_POPULARITY && (
                <div className="flex items-center justify-between bg-[#131117] rounded-lg px-3 py-2 text-[11px] mb-3">
                  <span className="text-[#8B8593]">Merch stock on hand</span>
                  <span className={`font-bold ${merchStock === 0 ? "text-red-400" : "text-[#F2ECDD]"}`}>{merchStock} units {merchStock === 0 && "— restock under Menu · Merchandise"}</span>
                </div>
              )}
              <div className="flex items-center justify-between bg-[#131117] rounded-lg px-3 py-2 text-[11px]">
                <span className="text-[#8B8593]">Projected attendance {city ? `(${city} score: ${Math.round(cityPop)})` : ""}</span>
                <span className="font-bold">~{projectedAttendance.toLocaleString()}</span>
              </div>
              {mainDrawParticipants.length > 0 && (
                <div className="text-[9px] text-[#8B8593] mt-1">
                  Main Event draw: <span className={mainDrawAvg >= 60 ? "text-green-400" : mainDrawAvg <= 40 ? "text-red-400" : "text-[#F2ECDD]"}>{Math.round(mainDrawAvg)}/100</span> — {mainDrawAvg >= 60 ? "pulling the crowd up" : mainDrawAvg <= 40 ? "dragging the crowd down" : "roughly neutral"}
                </div>
              )}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-[#8B8593] mb-1">
                  <span>SHOW TIME</span>
                  <span className={totalShowMinutes > showMinutesTarget ? "text-red-400 font-bold" : "text-[#F2ECDD] font-bold"}>{totalShowMinutes} / {showMinutesTarget} min</span>
                </div>
                <div className="h-1.5 bg-[#232029] rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${Math.min(100, (totalShowMinutes / showMinutesTarget) * 100)}%`, backgroundColor: totalShowMinutes > showMinutesTarget ? "#EF4444" : "#8B6BC0" }} />
                </div>
                {totalShowMinutes > showMinutesTarget && <div className="text-[9px] text-red-400 mt-1">Over your show's time budget — trim a segment's minutes, remove one, or extend the show length.</div>}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">CARD</div>
                {SPECIALTY_MATCHES.some((s) => !specialtyUnlocked(s, popularity)) && (
                  <div className="text-[9px] text-[#8B8593] italic">
                    Locked: {SPECIALTY_MATCHES.filter((s) => !specialtyUnlocked(s, popularity)).map((s) => `${s.name} (${s.minTier}+)`).join(", ")}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {segments.map((slot, segIndex) => {
                  const cap = computeSegmentCap(segIndex, segments.length, slot.minutes);
                  const label = segmentLabel(segIndex, segments.length);
                  const eligibleTitles = titles.filter((title) => {
                    if (slot.format !== "match") return false;
                    const isMultiMan = slot.type === "triple" || slot.type === "fatal4";
                    // A singles title can be defended in a scramble match too, not just 1v1.
                    if (isMultiMan ? title.type !== "singles" : title.type !== slot.type) return false;
                    const allParticipants = [...slot.team1, ...slot.team2].filter(Boolean);
                    if (!allParticipants.every((w) => meetsTitleRestrictions(w, title))) return false;
                    const team1Names = slot.team1.filter(Boolean).map((w) => w.name);
                    const team2Names = slot.team2.filter(Boolean).map((w) => w.name);
                    const participants = [...team1Names, ...team2Names];
                    if (title.holders.length === 0) return true; // vacant — open to anyone who meets the restrictions above
                    if (!title.holders.some((h) => participants.includes(h))) return false; // champion must be in this match
                    if (isMultiMan) return true; // scrambles are exempt from the top-3 challenger rule
                    // Only a top-3 ranked contender can challenge — no walk-up shots.
                    const challengerNames = title.holders.some((h) => team1Names.includes(h)) ? team2Names : team1Names;
                    if (challengerNames.length === 0) return false;
                    const contenders = titleContenders(title);
                    if (title.type === "tag") {
                      const challengerStable = stableOf(challengerNames[0]);
                      return !!challengerStable && contenders.some((c) => c.key === challengerStable.id);
                    }
                    return challengerNames.every((n) => contenders.some((c) => c.key === n));
                  });
                  const eligibleSpecialties = SPECIALTY_MATCHES.filter((s) => specialtyUnlocked(s, popularity));
                  // #1 Contender eligibility is deliberately simpler than eligibleTitles
                  // above: no ranking/holder checks, since the whole point of this
                  // stipulation is to let someone skip the ranked-contender queue.
                  // Tag titles are excluded — see n1cInfoFor's note on why.
                  const n1cEligibleTitles = slot.format === "match" ? titles.filter((t) => t.type !== "tag") : [];
                  const partnerOptions = (side) => {
                    const primary = slot[side][0];
                    if (!primary) return bookable;
                    const stable = stableOf(primary.name);
                    if (!stable) return bookable;
                    const stablemates = bookable.filter((w) => stable.members.includes(w.name) && w.name !== primary.name);
                    return stablemates.length > 0 ? stablemates : bookable;
                  };
                  return (
                    <div key={slot.id} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-[10px] text-[#8B8593] font-bold tracking-wide">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#5B3B8C] text-[#F2ECDD] text-[9px] font-black mr-1.5 align-middle">{segIndex + 1}</span>
                          {slot.format === "segment" ? `ANGLE · ${(ANGLE_TYPES.find((at) => at.key === (slot.angleType || "promo")) || ANGLE_TYPES[0]).label.toUpperCase()}` : "MATCH"} &middot; {label.toUpperCase()} <span className="text-[#8B6BC0]">(cap {cap})</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSegmentMinutes(slot.id, slot.minutes - 1)} className="w-5 h-5 flex items-center justify-center rounded border border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]">−</button>
                          <span className="text-[9px] text-[#8B8593] w-12 text-center">{slot.minutes} min</span>
                          <button onClick={() => setSegmentMinutes(slot.id, slot.minutes + 1)} className="w-5 h-5 flex items-center justify-center rounded border border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]">+</button>
                          <button onClick={() => removeSegment(slot.id)} className="ml-1 text-[#8B8593] hover:text-red-400"><X size={14} /></button>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {["match", "segment"].map((f) => (
                          <button key={f} onClick={() => setSegmentFormat(slot.id, f)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${slot.format === f ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`} style={slot.format === f ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C" } : undefined}>
                            {f === "match" ? "Match" : "Segment"}
                          </button>
                        ))}
                        {slot.format === "match" && ["singles", "tag", "triple", "fatal4"].map((t) => (
                          <button key={t} onClick={() => setSegmentType(slot.id, t)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${slot.type === t ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`} style={slot.type === t ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C" } : undefined}>
                            {t === "singles" ? "1v1" : t === "tag" ? "2v2" : t === "triple" ? "Triple Threat" : "Fatal 4-Way"}
                          </button>
                        ))}
                        {slot.format === "segment" && ANGLE_TYPES.map((at) => (
                          <button key={at.key} onClick={() => setSegmentAngleType(slot.id, at.key)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${(slot.angleType || "promo") === at.key ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`} style={(slot.angleType || "promo") === at.key ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C" } : undefined}>
                            {at.label}
                          </button>
                        ))}
                      </div>

                      {slot.format === "segment" ? (
                        <div>
                          <select value={slot.team1[0]?.name || ""} onChange={(e) => setSegmentMember(slot.id, "team1", 0, bookable.find((w) => w.name === e.target.value) || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                            <option value="">Select performer...</option>
                            {bookable.map((w) => (
                              <option key={w.name} value={w.name} disabled={usedNames.has(w.name) && slot.team1[0]?.name !== w.name}>{wrestlerOptionLabel(w)}</option>
                            ))}
                          </select>
                          {slot.team1[0] && <div className="text-[9px] text-[#8B8593] mt-1">ATTR {Math.round(attrOf(slot.team1[0]))} &middot; {slot.angleType === "vignette" ? `ENT ${slot.team1[0].ent}/100` : `CHA ${slot.team1[0].cha}/100`} &middot; {effectiveTier(slot.team1[0])} &middot; <span className={slot.team1[0].alignment === "Heel" ? "text-red-400" : "text-green-400"}>{slot.team1[0].alignment}</span> &middot; STA {slot.team1[0].eng}/100</div>}
                          {slot.angleType === "vignette" && (
                            <select value={slot.hypeTargetId || ""} onChange={(e) => setSegmentHypeTarget(slot.id, e.target.value || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs mt-1.5 text-[#8B6BC0]">
                              <option value="">General atmosphere — no specific hype target</option>
                              {hypeTargets().map((t) => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                              ))}
                            </select>
                          )}
                          {slot.angleType !== "vignette" && (
                            <select value={slot.team2?.[0]?.name || ""} onChange={(e) => setSegmentMember(slot.id, "team2", 0, bookable.find((w) => w.name === e.target.value) || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs mt-1.5">
                              <option value="">{slot.angleType === "confrontation" ? "Select who they face off with..." : "No subject — general promo"}</option>
                              {bookable.filter((w) => w.name !== slot.team1[0]?.name).map((w) => (
                                <option key={w.name} value={w.name} disabled={usedNames.has(w.name) && slot.team2?.[0]?.name !== w.name}>{wrestlerOptionLabel(w)}{w.rivals.includes(slot.team1[0]?.name) ? " (existing rival)" : ""}</option>
                              ))}
                            </select>
                          )}
                          {slot.angleType === "confrontation" && slot.team2?.[0] && <div className="text-[9px] text-[#8B8593] mt-1">ATTR {Math.round(attrOf(slot.team2[0]))} &middot; CHA {slot.team2[0].cha}/100 &middot; {effectiveTier(slot.team2[0])} &middot; <span className={slot.team2[0].alignment === "Heel" ? "text-red-400" : "text-green-400"}>{slot.team2[0].alignment}</span></div>}
                          <div className="text-[9px] text-[#8B8593] italic mt-1">{ANGLE_TYPES.find((at) => at.key === (slot.angleType || "promo"))?.desc} No win/loss, no energy cost either way{slot.angleType === "confrontation" ? " unless it turns physical." : "."}</div>
                          {slot.angleType === "vignette" && slot.hypeTargetId && <div className="text-[9px] text-[#8B6BC0]">Hyping something real — +{HYPE_TARGET_BONUS} rating.</div>}
                        </div>
                      ) : (slot.type === "triple" || slot.type === "fatal4") ? (
                        <>
                          <div className="space-y-1">
                            {(slot.type === "triple" ? [0, 1, 2] : [0, 1, 2, 3]).map((idx) => (
                              <div key={idx}>
                                <select value={slot.team1[idx]?.name || ""} onChange={(e) => setSegmentMember(slot.id, "team1", idx, bookable.find((w) => w.name === e.target.value) || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                                  <option value="">Select wrestler...</option>
                                  {bookable.map((w) => (
                                    <option key={w.name} value={w.name} disabled={usedNames.has(w.name) && slot.team1[idx]?.name !== w.name}>{wrestlerOptionLabel(w)}</option>
                                  ))}
                                </select>
                                {slot.team1[idx] && <div className="text-[9px] text-[#8B8593] mt-0.5">ATTR {Math.round(attrOf(slot.team1[idx]))} &middot; {effectiveTier(slot.team1[idx])} &middot; <span className={slot.team1[idx].alignment === "Heel" ? "text-red-400" : "text-green-400"}>{slot.team1[idx].alignment}</span> &middot; STA {slot.team1[idx].eng}/100</div>}
                              </div>
                            ))}
                          </div>
                          <div className="text-[9px] text-[#8B8593] italic">Everyone's in for themselves — one winner, pinned or submitted by anyone.</div>
                          {isSegmentComplete(slot) && (
                            <>
                              <div className="flex items-start gap-2">
                                <Trophy size={12} className="text-[#8B6BC0] shrink-0 mt-1" />
                                <div className="flex gap-1 flex-wrap">
                                  <button onClick={() => setSegmentWinner(slot.id, null)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${!slot.winnerOverride ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>Auto</button>
                                  {slot.team1.filter(Boolean).map((w) => (
                                    <button key={w.name} onClick={() => setSegmentWinner(slot.id, w.name)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${slot.winnerOverride === w.name ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>{w.name}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <Flag size={12} className="text-[#8B6BC0] shrink-0 mt-1" />
                                <div className="flex gap-1 flex-wrap">
                                  {[null, "Pinfall", "Submission", "Disqualification", "Countout"].map((m) => (
                                    <button key={m || "auto"} onClick={() => setSegmentWinMethod(slot.id, m)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${(slot.winMethodOverride || null) === m ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>{m || "Auto"}</button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                          <div className="flex items-start gap-2">
                            <Sparkles size={12} className="text-[#8B6BC0] shrink-0 mt-1" />
                            <div className="flex gap-1 flex-wrap">
                              {MATCH_PURPOSES.map((p) => (
                                <button key={p.id} onClick={() => setSegmentPurpose(slot.id, p.id)} title={p.desc} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${(slot.purposeId || "competitive") === p.id ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>{p.label}</button>
                              ))}
                            </div>
                          </div>
                          {(slot.purposeId && slot.purposeId !== "competitive") && (
                            <div className="text-[9px] text-[#8B8593] italic">{MATCH_PURPOSE_BY_ID[slot.purposeId]?.desc}</div>
                          )}
                          <div className="flex items-start gap-2">
                            <Swords size={12} className="text-[#8B6BC0] shrink-0 mt-1" />
                            <div className="flex gap-1 flex-wrap">
                              {MATCH_STORIES.map((s) => (
                                <button key={s.id} onClick={() => setSegmentStory(slot.id, s.id)} title={s.desc} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${(slot.storyId || "standard") === s.id ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>{s.label}</button>
                              ))}
                            </div>
                          </div>
                          {(slot.storyId && slot.storyId !== "standard") && (
                            <div className="text-[9px] text-[#8B8593] italic">{MATCH_STORY_BY_ID[slot.storyId]?.desc}</div>
                          )}
                          {eligibleTitles.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Award size={12} className="text-[#8B6BC0] shrink-0" />
                              <select value={slot.titleId || ""} onChange={(e) => setSegmentTitle(slot.id, e.target.value || null)} className="flex-1 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[11px] text-[#8B6BC0]">
                                <option value="">Non-title match</option>
                                {eligibleTitles.map((title) => (
                                  <option key={title.id} value={title.id}>{title.name} {title.holders.length === 0 ? "(vacant)" : `(defending: ${title.holders.join(" & ")})`}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Zap size={12} className="text-[#8B6BC0] shrink-0" />
                            <select value={slot.specialtyId || ""} onChange={(e) => setSegmentSpecialty(slot.id, e.target.value || null)} className="flex-1 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[11px] text-[#8B6BC0]">
                              <option value="">Standard match</option>
                              {eligibleSpecialties.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} &middot; £{s.cost.toLocaleString()} &middot; +{s.ratingBonus} rtg &middot; {STAT_LABELS[s.statKey]}</option>
                              ))}
                            </select>
                          </div>
                          {n1cEligibleTitles.length > 0 && !slot.titleId && (
                            <div className="flex items-center gap-2">
                              <Medal size={12} className="text-[#8B6BC0] shrink-0" />
                              <select value={slot.n1cTitleId || ""} onChange={(e) => setSegmentN1C(slot.id, e.target.value || null)} className="flex-1 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[11px] text-[#8B6BC0]">
                                <option value="">Not a #1 Contender match</option>
                                {n1cEligibleTitles.map((title) => (
                                  <option key={title.id} value={title.id}>Winner becomes #1 contender for the {title.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {slot.n1cTitleId && <div className="text-[9px] text-[#8B8593] italic">The winner skips the ranked queue and earns a guaranteed title shot — cleared the moment they actually cash it in.</div>}
                          <button onClick={() => setSegmentLoserLeaves(slot.id, !slot.loserLeaves)} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border self-start ${slot.loserLeaves ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>
                            <Skull size={12} /> Loser Leaves
                          </button>
                          {slot.loserLeaves && <div className="text-[9px] text-[#8B8593] italic">Whoever loses is released from the promotion outright — no buyout, no negotiation.</div>}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 space-y-1">
                              {[0, ...(slot.type === "tag" ? [1] : [])].map((idx) => {
                                const options = idx === 1 ? partnerOptions("team1") : bookable;
                                return (
                                <div key={idx}>
                                  <select value={slot.team1[idx]?.name || ""} onChange={(e) => setSegmentMember(slot.id, "team1", idx, bookable.find((w) => w.name === e.target.value) || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                                    <option value="">Select wrestler...</option>
                                    {options.map((w) => (
                                      <option key={w.name} value={w.name} disabled={usedNames.has(w.name) && slot.team1[idx]?.name !== w.name}>{wrestlerOptionLabel(w)}</option>
                                    ))}
                                  </select>
                                  {slot.team1[idx] && <div className="text-[9px] text-[#8B8593] mt-0.5">ATTR {Math.round(attrOf(slot.team1[idx]))} &middot; {effectiveTier(slot.team1[idx])} &middot; <span className={slot.team1[idx].alignment === "Heel" ? "text-red-400" : "text-green-400"}>{slot.team1[idx].alignment}</span> &middot; STA {slot.team1[idx].eng}/100</div>}
                                  {idx === 1 && stableOf(slot.team1[0]?.name) && <div className="text-[9px] text-[#8B6BC0] italic">Filtered to {stableOf(slot.team1[0].name).name} stablemates</div>}
                                </div>
                                );
                              })}
                            </div>
                            <span className="text-[10px] text-[#8B6BC0] shrink-0">VS</span>
                            <div className="flex-1 space-y-1">
                              {[0, ...(slot.type === "tag" ? [1] : [])].map((idx) => {
                                const options = idx === 1 ? partnerOptions("team2") : bookable;
                                return (
                                <div key={idx}>
                                  <select value={slot.team2[idx]?.name || ""} onChange={(e) => setSegmentMember(slot.id, "team2", idx, bookable.find((w) => w.name === e.target.value) || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                                    <option value="">Select wrestler...</option>
                                    {options.map((w) => (
                                      <option key={w.name} value={w.name} disabled={usedNames.has(w.name) && slot.team2[idx]?.name !== w.name}>{wrestlerOptionLabel(w)}</option>
                                    ))}
                                  </select>
                                  {slot.team2[idx] && <div className="text-[9px] text-[#8B8593] mt-0.5">ATTR {Math.round(attrOf(slot.team2[idx]))} &middot; {effectiveTier(slot.team2[idx])} &middot; <span className={slot.team2[idx].alignment === "Heel" ? "text-red-400" : "text-green-400"}>{slot.team2[idx].alignment}</span> &middot; STA {slot.team2[idx].eng}/100</div>}
                                  {idx === 1 && stableOf(slot.team2[0]?.name) && <div className="text-[9px] text-[#8B6BC0] italic">Filtered to {stableOf(slot.team2[0].name).name} stablemates</div>}
                                </div>
                                );
                              })}
                            </div>
                          </div>
                          {(() => {
                            const t1 = slot.team1.filter(Boolean), t2 = slot.team2.filter(Boolean);
                            if (t1.length === 1 && t2.length === 1 && t1[0].rivals.includes(t2[0].name) && t2[0].rivals.includes(t1[0].name)) {
                              const key = [t1[0].name, t2[0].name].sort().join("|");
                              const intensity = (storylines[key] || { intensity: 20 }).intensity;
                              return <div className="flex items-center gap-1.5 text-[9px] text-red-300"><Flame size={11} /> Rivals ({feudStage(intensity).label}) — this match gets a rating boost.</div>;
                            }
                            if (slot.type === "tag" && t1.length === 2 && t2.length === 2) {
                              const s1 = stableOf(t1[0].name), s2 = stableOf(t2[0].name);
                              if (s1 && s2 && (s1.rivalStableIds || []).includes(s2.id) && (s2.rivalStableIds || []).includes(s1.id)) {
                                return <div className="flex items-center gap-1.5 text-[9px] text-red-300"><Flame size={11} /> Rival tag teams — this match gets a rating boost.</div>;
                              }
                            }
                            return null;
                          })()}
                          {(() => {
                            const t1 = slot.team1.filter(Boolean), t2 = slot.team2.filter(Boolean);
                            if (t1.length === 0 || t2.length === 0 || (t1.length !== 1 && t1.length !== 2)) return null;
                            const key = [...t1.map((w) => w.name), ...t2.map((w) => w.name)].sort().join("|");
                            const repeats = recentMatchups.filter((k) => k === key).length;
                            if (repeats === 0) return null;
                            const isSinglesRivalry = t1.length === 1 && t2.length === 1 && t1[0].rivals.includes(t2[0].name) && t2[0].rivals.includes(t1[0].name);
                            const penalty = Math.min(25, repeats * 6);
                            const effectivePenalty = isSinglesRivalry ? Math.round(penalty / 2) : penalty;
                            return <div className="text-[9px] text-yellow-400">Booked this exact matchup {repeats}x recently — rating takes a hit (−{effectivePenalty}){isSinglesRivalry ? " (halved, it's an active rivalry)" : ""}.</div>;
                          })()}
                          {isSegmentComplete(slot) && (() => {
                            const t1 = slot.team1.filter(Boolean), t2 = slot.team2.filter(Boolean);
                            const label1 = t1.map((w) => w.name).join(" & ");
                            const label2 = t2.map((w) => w.name).join(" & ");
                            return (
                              <>
                                <div className="flex items-start gap-2">
                                  <Trophy size={12} className="text-[#8B6BC0] shrink-0 mt-1" />
                                  <div className="flex gap-1 flex-wrap">
                                    <button onClick={() => setSegmentWinner(slot.id, null)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${!slot.winnerOverride ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>Auto</button>
                                    <button onClick={() => setSegmentWinner(slot.id, t1[0].name)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${t1.some((w) => w.name === slot.winnerOverride) ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>{label1}</button>
                                    <button onClick={() => setSegmentWinner(slot.id, t2[0].name)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${t2.some((w) => w.name === slot.winnerOverride) ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>{label2}</button>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Flag size={12} className="text-[#8B6BC0] shrink-0 mt-1" />
                                  <div className="flex gap-1 flex-wrap">
                                    {[null, "Pinfall", "Submission", "Disqualification", "Countout"].map((m) => (
                                      <button key={m || "auto"} onClick={() => setSegmentWinMethod(slot.id, m)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${(slot.winMethodOverride || null) === m ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>{m || "Auto"}</button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                          <div className="flex items-start gap-2">
                            <Sparkles size={12} className="text-[#8B6BC0] shrink-0 mt-1" />
                            <div className="flex gap-1 flex-wrap">
                              {MATCH_PURPOSES.map((p) => (
                                <button key={p.id} onClick={() => setSegmentPurpose(slot.id, p.id)} title={p.desc} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${(slot.purposeId || "competitive") === p.id ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>{p.label}</button>
                              ))}
                            </div>
                          </div>
                          {(slot.purposeId && slot.purposeId !== "competitive") && (
                            <div className="text-[9px] text-[#8B8593] italic">{MATCH_PURPOSE_BY_ID[slot.purposeId]?.desc}</div>
                          )}
                          <div className="flex items-start gap-2">
                            <Swords size={12} className="text-[#8B6BC0] shrink-0 mt-1" />
                            <div className="flex gap-1 flex-wrap">
                              {MATCH_STORIES.map((s) => (
                                <button key={s.id} onClick={() => setSegmentStory(slot.id, s.id)} title={s.desc} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${(slot.storyId || "standard") === s.id ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>{s.label}</button>
                              ))}
                            </div>
                          </div>
                          {(slot.storyId && slot.storyId !== "standard") && (
                            <div className="text-[9px] text-[#8B8593] italic">{MATCH_STORY_BY_ID[slot.storyId]?.desc}</div>
                          )}
                          {eligibleTitles.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Award size={12} className="text-[#8B6BC0] shrink-0" />
                              <select value={slot.titleId || ""} onChange={(e) => setSegmentTitle(slot.id, e.target.value || null)} className="flex-1 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[11px] text-[#8B6BC0]">
                                <option value="">Non-title match</option>
                                {eligibleTitles.map((title) => (
                                  <option key={title.id} value={title.id}>{title.name} {title.holders.length === 0 ? "(vacant)" : `(defending: ${title.holders.join(" & ")})`}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {(() => {
                            const participants = [...slot.team1, ...slot.team2].filter(Boolean).map((w) => w.name);
                            const blockedTitle = titles.find((t) => t.type === slot.type && t.holders.length > 0 && t.holders.some((h) => participants.includes(h)) && !eligibleTitles.some((e) => e.id === t.id));
                            return blockedTitle ? (
                              <div className="text-[9px] text-[#8B8593] italic">The other side isn't a top-{CONTENDER_SLOTS} contender for the {blockedTitle.name} yet.</div>
                            ) : null;
                          })()}
                          <div className="flex items-center gap-2">
                            <Zap size={12} className="text-[#8B6BC0] shrink-0" />
                            <select value={slot.specialtyId || ""} onChange={(e) => setSegmentSpecialty(slot.id, e.target.value || null)} className="flex-1 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[11px] text-[#8B6BC0]">
                              <option value="">Standard match</option>
                              {eligibleSpecialties.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} &middot; £{s.cost.toLocaleString()} &middot; +{s.ratingBonus} rtg &middot; {STAT_LABELS[s.statKey]}</option>
                              ))}
                            </select>
                          </div>
                          {n1cEligibleTitles.length > 0 && !slot.titleId && (
                            <div className="flex items-center gap-2">
                              <Medal size={12} className="text-[#8B6BC0] shrink-0" />
                              <select value={slot.n1cTitleId || ""} onChange={(e) => setSegmentN1C(slot.id, e.target.value || null)} className="flex-1 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[11px] text-[#8B6BC0]">
                                <option value="">Not a #1 Contender match</option>
                                {n1cEligibleTitles.map((title) => (
                                  <option key={title.id} value={title.id}>Winner becomes #1 contender for the {title.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {slot.n1cTitleId && <div className="text-[9px] text-[#8B8593] italic">The winner skips the ranked queue and earns a guaranteed title shot — cleared the moment they actually cash it in.</div>}
                          <button onClick={() => setSegmentLoserLeaves(slot.id, !slot.loserLeaves)} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border self-start ${slot.loserLeaves ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`}>
                            <Skull size={12} /> Loser Leaves
                          </button>
                          {slot.loserLeaves && <div className="text-[9px] text-[#8B8593] italic">Whoever loses is released from the promotion outright — no buyout, no negotiation.</div>}
                        </>
                      )}

                      <div className="space-y-1">
                        <input value={slot.customName || ""} onChange={(e) => setSegmentCustomName(slot.id, e.target.value)} placeholder="Segment name (optional)" className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs" />
                        <textarea value={slot.script || ""} onChange={(e) => setSegmentScript(slot.id, e.target.value)} placeholder="Write your own script or notes for this segment (optional) — shown under it in results and show history. Flavor only, no effect on the outcome." rows={2} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs resize-none" />
                      </div>

                      {slot.result && (
                        <div className="bg-[#131117] border border-[#2B2733] rounded-lg p-2.5">
                          <div className="text-[9px] text-[#8B8593] mb-1 flex items-center gap-1"><Check size={11} className="text-[#8B6BC0]" /> RESOLVED {slot.result.specialty ? `· ${slot.result.specialty.name.toUpperCase()}` : ""}{slot.result.winMethod ? ` · VIA ${slot.result.winMethod.toUpperCase()}` : ""}{slot.result.purpose && slot.result.purpose !== "competitive" ? ` · ${MATCH_PURPOSE_BY_ID[slot.result.purpose]?.label.toUpperCase()}` : ""}{slot.result.matchStory && slot.result.matchStory !== "standard" ? ` · ${MATCH_STORY_BY_ID[slot.result.matchStory]?.label.toUpperCase()}${slot.result.matchStory === "underdog" && slot.result.upsetHappened ? " (UPSET!)" : ""}` : ""}</div>
                          {slot.result.customName && <div className="text-xs font-bold text-[#8B6BC0] mb-1">{slot.result.customName}</div>}
                          {slot.result.format === "segment" ? (
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#F2ECDD]">{angleResultText(slot.result)}</span>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#8B8593]"><Star size={11} className="text-[#8B6BC0]" /> {slot.result.rating}</div>
                            </div>
                          ) : slot.result.isMultiMan ? (
                            <div className="flex items-center justify-between">
                              <div className="text-xs flex flex-wrap gap-x-1.5">
                                {slot.result.team1.map((w, wi) => (
                                  <span key={w.name} className={slot.result.winnerTeam[0].name === w.name ? "text-[#F2ECDD] font-bold" : "text-[#8B8593] line-through"}>
                                    {w.name}{wi < slot.result.team1.length - 1 ? "," : ""}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#8B8593]"><Star size={11} className="text-[#8B6BC0]" /> {slot.result.rating}</div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="text-xs">
                                <span className={slot.result.winnerTeam === slot.result.team1 ? "text-[#F2ECDD] font-bold" : "text-[#8B8593] line-through"}>{slot.result.team1.map((w) => w.name).join(" & ")}</span>
                                <span className="text-[#8B6BC0] mx-2">vs</span>
                                <span className={slot.result.winnerTeam === slot.result.team2 ? "text-[#F2ECDD] font-bold" : "text-[#8B8593] line-through"}>{slot.result.team2.map((w) => w.name).join(" & ")}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#8B8593]"><Star size={11} className="text-[#8B6BC0]" /> {slot.result.rating}</div>
                            </div>
                          )}
                          {slot.result.titleInfo && <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-[#8B6BC0]"><Award size={11} /> {slot.result.titleInfo.name} &mdash; {slot.result.titleInfo.label}</div>}
                          {slot.result.n1cInfo && <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-[#8B6BC0]"><Medal size={11} /> {slot.result.n1cInfo.label} is #1 contender for the {slot.result.n1cInfo.name}!</div>}
                          {slot.result.loserLeaves && <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-red-400"><Skull size={11} /> Loser Leaves — {slot.result.loserTeam.map((w) => w.name).join(" & ")} released.</div>}
                          {slot.result.script && <div className="mt-1.5 text-[10px] text-[#CFC9BB] italic whitespace-pre-wrap">{slot.result.script}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => addSegment("match")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold border border-dashed border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#17151C] rounded-lg">
                  <Plus size={13} /> Add Match
                </button>
                <button onClick={() => addSegment("segment")} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold border border-dashed border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#17151C] rounded-lg">
                  <Plus size={13} /> Add Angle
                </button>
              </div>
            </div>

            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">PRE-SHOW / POST-SHOW</div>
              <div className="text-[9px] text-[#8B8593] italic mb-3">Optional dark matches, outside the time budget and the show rating — just reps for someone not on tonight's card. Up to {DARK_MATCH_CAP_PER_TIMING} each.</div>
              {["pre", "post"].map((timing) => (
                <div key={timing} className="mb-3 last:mb-0">
                  <div className="text-[10px] text-[#8B8593] font-bold tracking-wide mb-1.5">{timing === "pre" ? "PRE-SHOW" : "POST-SHOW"}</div>
                  <div className="space-y-2">
                    {darkMatches.filter((d) => d.timing === timing).map((d) => (
                      <div key={d.id} className="bg-[#131117] border border-[#2B2733] rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <select value={d.a?.name || ""} onChange={(e) => setDarkMatchMember(d.id, "a", bookable.find((w) => w.name === e.target.value) || null)} className="flex-1 min-w-0 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                            <option value="">Select wrestler...</option>
                            {bookable.map((w) => (
                              <option key={w.name} value={w.name} disabled={usedNames.has(w.name) && d.a?.name !== w.name}>{wrestlerOptionLabel(w)}</option>
                            ))}
                          </select>
                          <span className="text-[10px] text-[#8B6BC0] shrink-0">VS</span>
                          <select value={d.b?.name || ""} onChange={(e) => setDarkMatchMember(d.id, "b", bookable.find((w) => w.name === e.target.value) || null)} className="flex-1 min-w-0 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                            <option value="">Select wrestler...</option>
                            {bookable.map((w) => (
                              <option key={w.name} value={w.name} disabled={usedNames.has(w.name) && d.b?.name !== w.name}>{wrestlerOptionLabel(w)}</option>
                            ))}
                          </select>
                          <button onClick={() => removeDarkMatch(d.id)} className="text-[#8B8593] hover:text-red-400 shrink-0"><X size={14} /></button>
                        </div>
                        {d.result && (
                          <div className="text-[10px] text-[#8B8593] flex items-center gap-1.5">
                            <Check size={11} className="text-[#8B6BC0]" />
                            <span className={d.result.winner === d.result.a.name ? "text-[#F2ECDD] font-bold" : "text-[#8B8593] line-through"}>{d.result.a.name}</span>
                            <span className="text-[#8B6BC0]">vs</span>
                            <span className={d.result.winner === d.result.b.name ? "text-[#F2ECDD] font-bold" : "text-[#8B8593] line-through"}>{d.result.b.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addDarkMatch(timing)} disabled={darkMatches.filter((d) => d.timing === timing).length >= DARK_MATCH_CAP_PER_TIMING} className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold border border-dashed border-[#2B2733] text-[#8B8593] hover:text-[#8B6BC0] hover:border-[#5B3B8C] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg">
                    <Plus size={12} /> Add {timing === "pre" ? "Pre-Show" : "Post-Show"} Dark Match
                  </button>
                </div>
              ))}
            </div>
            </div>

            <div className="hidden dt:block dt:w-64 shrink-0">
              <div className="sticky top-4 space-y-4">
                <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                  <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">SHOW TIME</div>
                  <div className="flex justify-between text-[10px] text-[#8B8593] mb-1">
                    <span>Booked</span>
                    <span className={totalShowMinutes > showMinutesTarget ? "text-red-400 font-bold" : "text-[#F2ECDD] font-bold"}>{totalShowMinutes} / {showMinutesTarget} min</span>
                  </div>
                  <div className="h-1.5 bg-[#232029] rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${Math.min(100, (totalShowMinutes / showMinutesTarget) * 100)}%`, backgroundColor: totalShowMinutes > showMinutesTarget ? "#EF4444" : "#8B6BC0" }} />
                  </div>
                  <div className="text-[9px] text-[#8B8593] mt-2">{segments.length} segment{segments.length === 1 ? "" : "s"} booked at {arena.name}</div>
                </div>

                <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                  <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">SHOW COSTS</div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between"><span className="text-[#8B8593]">Venue booking</span><span className="font-bold">£{arena.cost.toLocaleString()}</span></div>
                    {travelSurcharge > 0 && <div className="flex justify-between"><span className="text-[#8B8593]">Travel ({FOREIGN_CITY_COUNTRY[city]})</span><span className="font-bold">£{travelSurcharge.toLocaleString()}</span></div>}
                    {activeAdCampaign.cost > 0 && <div className="flex justify-between"><span className="text-[#8B8593]">Advertising</span><span className="font-bold">£{activeAdCampaign.cost.toLocaleString()}</span></div>}
                    {projectedSpecialtyCost > 0 && <div className="flex justify-between"><span className="text-[#8B8593]">Specialty matches</span><span className="font-bold">£{projectedSpecialtyCost.toLocaleString()}</span></div>}
                    {projectedFreelanceCost > 0 && <div className="flex justify-between"><span className="text-[#8B8593]">Freelancer fees</span><span className="font-bold">£{projectedFreelanceCost.toLocaleString()}</span></div>}
                    {projectedAgreementCost > 0 && <div className="flex justify-between"><span className="text-[#8B8593]">Partner loan fees</span><span className="font-bold">£{projectedAgreementCost.toLocaleString()}</span></div>}
                    <div className="flex justify-between pt-1.5 border-t border-[#2B2733]"><span className="text-[#8B6BC0] font-bold">Show total</span><span className="font-bold text-[#8B6BC0]">£{projectedShowCost.toLocaleString()}</span></div>
                    {otherDueTemplatesThisWeek.length === 0 ? (
                      <>
                        <div className="flex justify-between text-[#5A5660]"><span>Roster payroll (weekly)</span><span>£{projectedPayroll.toLocaleString()}</span></div>
                        {staffWeeklyPayroll > 0 && <div className="flex justify-between text-[#5A5660]"><span>Staff payroll (weekly)</span><span>£{staffWeeklyPayroll.toLocaleString()}</span></div>}
                        {productionWeeklyUpkeep > 0 && <div className="flex justify-between text-[#5A5660]"><span>Production upkeep (weekly)</span><span>£{productionWeeklyUpkeep.toLocaleString()}</span></div>}
                      </>
                    ) : (
                      <div className="text-[9px] text-[#8B8593] italic pt-1">{otherDueTemplatesThisWeek.length} more show{otherDueTemplatesThisWeek.length === 1 ? "" : "s"} due this week — weekly payroll, upkeep, and loan payment are billed once, on the last one.</div>
                    )}
                  </div>
                </div>

                <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                  <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">ACTIVE STORYLINES</div>
                  {renderStorylinesMini(3)}
                </div>
              </div>
            </div>
            </div>

            {(() => {
              if (showLevel !== "main" || totalShowMinutes >= showMinutesTarget || TIER_RANK[popularityTier(popularity)] < TIER_RANK.National) return null;
              return <div className="text-[10px] text-red-300 mb-2">Fans at your level expect a full card — only using {totalShowMinutes} of {showMinutesTarget} min will cost you rating and money.</div>;
            })()}
            {runShowError && (
              <div className="bg-[#2A1414] border border-red-500 rounded-lg p-3 text-xs mb-2">
                <div className="font-bold text-red-400 mb-1">Something went wrong running that show.</div>
                <div className="text-red-200 mb-1">Some of it may still have gone through (bank/news can update before an error), but results couldn't be finished. Please screenshot the message below and send it over so this can get fixed.</div>
                <div className="booked-mono text-[10px] text-red-300 whitespace-pre-wrap break-words">{runShowError}</div>
              </div>
            )}
            <button onClick={() => runShow()} disabled={!readyToRun || running} className="w-full py-3.5 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-[#F2ECDD] font-black tracking-widest text-sm rounded transition-colors" style={{ fontFamily: "Anton, sans-serif" }}>
              {running ? "RUNNING THE SHOW..." : "RUN THE SHOW"}
            </button>
            </>
            )}
          </div>
        )}

        {bookSubTab === "book" && showResult && (
          <div className="space-y-4">
            <div className="text-center"><div className="text-[10px] tracking-[0.3em] text-[#8B6BC0] font-bold">{showResult.city.toUpperCase()} &middot; {showResult.arena.toUpperCase()} SHOW{showResult.showLevel === "developmental" ? " · DEVELOPMENTAL" : ""} &middot; RESULTS</div></div>
            <div className="space-y-2">
              {showResult.matches.map((m, i) => (
                <div key={i} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3">
                  <div className="text-[9px] text-[#8B8593] mb-1">{m.slotLabel}{m.format === "segment" ? " · SEGMENT" : ""}{m.specialty ? ` · ${m.specialty.name.toUpperCase()}` : ""}{(m.storyKey || m.stableStoryKey) ? " · RIVALRY" : ""}{m.winMethod ? ` · VIA ${m.winMethod.toUpperCase()}` : ""}</div>
                  {m.customName && <div className="text-xs font-bold text-[#8B6BC0] mb-1">{m.customName}</div>}
                  {m.format === "segment" ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F2ECDD]">{angleResultText(m)}</span>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8B8593]"><Star size={11} className="text-[#8B6BC0]" /> {m.rating}</div>
                    </div>
                  ) : m.isMultiMan ? (
                    <div className="flex items-center justify-between">
                      <div className="text-xs flex flex-wrap gap-x-1.5">
                        {m.team1.map((w, wi) => (
                          <span key={w.name} className={m.winnerTeam[0].name === w.name ? "text-[#F2ECDD] font-bold" : "text-[#8B8593] line-through"}>
                            {w.name}{wi < m.team1.length - 1 ? "," : ""}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8B8593]"><Star size={11} className="text-[#8B6BC0]" /> {m.rating}</div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <span className={m.winnerTeam === m.team1 ? "text-[#F2ECDD] font-bold" : "text-[#8B8593] line-through"}>{m.team1.map((w) => w.name).join(" & ")}</span>
                        <span className="text-[#8B6BC0] mx-2">vs</span>
                        <span className={m.winnerTeam === m.team2 ? "text-[#F2ECDD] font-bold" : "text-[#8B8593] line-through"}>{m.team2.map((w) => w.name).join(" & ")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8B8593]"><Star size={11} className="text-[#8B6BC0]" /> {m.rating}</div>
                    </div>
                  )}
                  {m.titleInfo && <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-[#8B6BC0]"><Award size={11} /> {m.titleInfo.name} &mdash; {m.titleInfo.label}</div>}
                  {m.n1cInfo && <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-[#8B6BC0]"><Medal size={11} /> {m.n1cInfo.label} is #1 contender for the {m.n1cInfo.name}!</div>}
                  {m.loserLeaves && <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-red-400"><Skull size={11} /> Loser Leaves — {m.loserTeam.map((w) => w.name).join(" & ")} released.</div>}
                  {m.script && <div className="mt-1.5 text-[10px] text-[#CFC9BB] italic whitespace-pre-wrap">{m.script}</div>}
                </div>
              ))}
            </div>
            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-[#8B8593]">Attendance</span><div className="font-bold">{showResult.attendance.toLocaleString()}</div></div>
              <div><span className="text-[#8B8593]">Ticket Price</span><div className="font-bold">£{showResult.ticketPrice}</div></div>
              <div><span className="text-[#8B8593]">Revenue</span><div className="font-bold">£{showResult.revenue.toLocaleString()}</div></div>
              <div><span className="text-[#8B8593]">Talent Pay</span><div className="font-bold">£{showResult.wrestlerPay.toLocaleString()}</div></div>
              {showResult.specialtyCost > 0 && <div><span className="text-[#8B8593]">Speciality Costs</span><div className="font-bold">£{showResult.specialtyCost.toLocaleString()}</div></div>}
              {showResult.travelSurcharge > 0 && <div><span className="text-[#8B8593]">Travel Costs</span><div className="font-bold">£{showResult.travelSurcharge.toLocaleString()}</div></div>}
              {showResult.adCost > 0 && <div><span className="text-[#8B8593]">Advertising ({showResult.adCampaignLabel})</span><div className="font-bold">£{showResult.adCost.toLocaleString()}</div></div>}
              {showResult.agreementCost > 0 && <div><span className="text-[#8B8593]">Partner Loan Fees</span><div className="font-bold">£{showResult.agreementCost.toLocaleString()}</div></div>}
              {showResult.loanPayment > 0 && <div><span className="text-[#8B8593]">Loan Repayment</span><div className="font-bold">£{showResult.loanPayment.toLocaleString()}</div></div>}
              {showResult.networkIncome > 0 && <div><span className="text-[#8B8593]">TV Income</span><div className="font-bold text-[#8B6BC0]">+£{showResult.networkIncome.toLocaleString()}</div></div>}
              {showResult.sponsorIncome > 0 && <div><span className="text-[#8B8593]">Sponsor Income</span><div className="font-bold text-[#8B6BC0]">+£{showResult.sponsorIncome.toLocaleString()}</div></div>}
              {(showResult.merchUnitsSold > 0 || showResult.merchMissedUnits > 0) && (
                <div>
                  <span className="text-[#8B8593]">Merchandise</span>
                  <div className="font-bold text-[#8B6BC0]">+£{showResult.merchRevenue.toLocaleString()} <span className="text-[9px] text-[#8B8593] font-normal">({showResult.merchUnitsSold} sold)</span></div>
                  {showResult.merchMissedUnits > 0 && <div className="text-[9px] text-red-400">Missed ~{showResult.merchMissedUnits} sales — sold out</div>}
                  {showResult.merchTheftUnits > 0 && <div className="text-[9px] text-red-400">{showResult.merchTheftUnits} units stolen</div>}
                </div>
              )}
              <div><span className="text-[#8B8593]">Full Show Rating</span><div className="font-bold flex items-center gap-1"><Trophy size={12} className="text-[#8B6BC0]" />{showResult.fullRating}</div></div>
              <div><span className="text-[#8B8593]">Profit</span><div className={`font-bold ${showResult.profit >= 0 ? "text-[#8B6BC0]" : "text-red-400"}`}>{showResult.profit >= 0 ? "+" : ""}£{showResult.profit.toLocaleString()}</div></div>
            </div>
            <div className="bg-[#131117] border border-[#2B2733] rounded-lg p-3 text-xs">
              <span className="font-bold text-[#8B6BC0]">{showResult.news.type}</span>{" "}
              <span className="text-[#CFC9BB]">{showResult.news.text}</span>
              {showResult.news.amount !== 0 && <span className={showResult.news.amount > 0 ? "text-[#8B6BC0]" : "text-red-400"}> ({showResult.news.amount > 0 ? "+" : ""}£{showResult.news.amount.toLocaleString()})</span>}
            </div>
            {showResult.catastrophe && (
              <div className="bg-[#2A1414] border border-red-500 rounded-lg p-3 text-xs">
                <span className="font-bold text-red-400">DISASTER!</span> <span className="text-red-200">{showResult.catastrophe.text}</span>
              </div>
            )}
            {showResult.underbookedPenaltyNote && (
              <div className="bg-[#2A1414] border border-red-500 rounded-lg p-3 text-xs">
                <span className="font-bold text-red-400">UNDERBOOKED!</span> <span className="text-red-200">{showResult.underbookedPenaltyNote}</span>
              </div>
            )}
            <button onClick={resetShow} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-[#8B8593] hover:text-[#F2ECDD] border border-[#2B2733] rounded">
              <RotateCcw size={12} />
              {showsDoneThisWeek.length > 0 && activeEventTemplate ? `Move to Next Show (${activeEventTemplate.name})` : "Book Another Show"}
            </button>
          </div>
        )}

        {bookSubTab === "results" && (
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">PREVIOUS SHOWS</div>
              <div className="flex items-center gap-1.5">
                <select value={resultsYearFilter} onChange={(e) => setResultsYearFilter(e.target.value)} className="bg-[#17151C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  <option value="all">All years</option>
                  {[...new Set([...showHistory.map((r) => r.year), ...rivalShowHistory.map((r) => r.year)])].sort((a, b) => a - b).map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
                <select value={resultsCompanyFilter} onChange={(e) => setResultsCompanyFilter(e.target.value)} className="bg-[#17151C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  <option value="player">{companyName}</option>
                  <option value="all">All promotions</option>
                  {rivalCompanies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {(resultsCompanyFilter === "player" || resultsCompanyFilter === "all") && (
              <div className="space-y-2 mb-4">
                {showHistory.filter((r) => resultsYearFilter === "all" || r.year === Number(resultsYearFilter)).map((r) => {
                const expanded = expandedResults.has(r.id);
                return (
                  <div key={r.id} className="bg-[#17151C] border border-[#2B2733] rounded-lg overflow-hidden">
                    <button onClick={() => setExpandedResults((prev) => { const next = new Set(prev); next.has(r.id) ? next.delete(r.id) : next.add(r.id); return next; })} className="w-full flex items-center justify-between p-3 text-left">
                      <div className="text-xs">
                        <span className="font-bold">Y{r.year} Wk{r.weekOfYear}</span>
                        <span className="text-[#8B8593]"> &middot; {formatDate(r.date)} &middot; {r.city} ({r.arena}{r.wasPPV ? " · PPV" : ""})</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[#8B8593] shrink-0">
                        <span className="flex items-center gap-1"><Star size={11} className="text-[#8B6BC0]" />{r.fullRating}</span>
                        <span className="hidden sm:inline">{r.attendance.toLocaleString()} fans</span>
                        <span className={r.profit >= 0 ? "text-[#8B6BC0] font-bold" : "text-red-400 font-bold"}>{r.profit >= 0 ? "+" : ""}£{r.profit.toLocaleString()}</span>
                        <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-3 pb-3 space-y-2 border-t border-[#2B2733] pt-3">
                        {r.matches.map((m, i) => (
                          <div key={i}>
                            {m.customName && <div className="text-xs font-bold text-[#8B6BC0]">{m.customName}</div>}
                            {m.format === "segment" ? (
                              <div className="flex items-center justify-between text-xs">
                                <span><span className="text-[9px] text-[#8B8593] mr-1">{m.slotLabel}:</span>{angleResultText(m)}</span>
                                <div className="flex items-center gap-1 text-[10px] text-[#8B8593]"><Star size={10} className="text-[#8B6BC0]" />{m.rating}</div>
                              </div>
                            ) : m.isMultiMan ? (
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex flex-wrap gap-x-1.5">
                                  <span className="text-[9px] text-[#8B8593] mr-1">{m.slotLabel}{m.winMethod ? ` · via ${m.winMethod}` : ""}:</span>
                                  {m.team1.map((w, wi) => (
                                    <span key={w.name} className={m.winnerTeam[0].name === w.name ? "text-[#F2ECDD] font-bold" : "text-[#8B8593] line-through"}>
                                      {w.name}{wi < m.team1.length - 1 ? "," : ""}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-[#8B8593]"><Star size={10} className="text-[#8B6BC0]" />{m.rating}</div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-[9px] text-[#8B8593] mr-1">{m.slotLabel}{m.specialty ? ` (${m.specialty.name})` : ""}{m.winMethod ? ` · via ${m.winMethod}` : ""}:</span>
                                  <span className={m.winnerTeam === m.team1 ? "text-[#F2ECDD] font-bold" : "text-[#8B8593] line-through"}>{m.team1.map((w) => w.name).join(" & ")}</span>
                                  <span className="text-[#8B6BC0] mx-2">vs</span>
                                  <span className={m.winnerTeam === m.team2 ? "text-[#F2ECDD] font-bold" : "text-[#8B8593] line-through"}>{m.team2.map((w) => w.name).join(" & ")}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-[#8B8593]"><Star size={10} className="text-[#8B6BC0]" />{m.rating}</div>
                              </div>
                            )}
                            {m.titleInfo && <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-[#8B6BC0]"><Award size={10} /> {m.titleInfo.name} &mdash; {m.titleInfo.label}</div>}
                            {m.n1cInfo && <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-[#8B6BC0]"><Medal size={10} /> {m.n1cInfo.label} is #1 contender for the {m.n1cInfo.name}!</div>}
                            {m.loserLeaves && <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-red-400"><Skull size={10} /> Loser Leaves — {m.loserTeam.map((w) => w.name).join(" & ")} released.</div>}
                            {m.script && <div className="mt-0.5 text-[10px] text-[#CFC9BB] italic whitespace-pre-wrap">{m.script}</div>}
                          </div>
                        ))}
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-[#2B2733]">
                          <div><span className="text-[#8B8593]">Attendance</span> <span className="font-bold">{r.attendance.toLocaleString()}</span></div>
                          <div><span className="text-[#8B8593]">Ticket</span> <span className="font-bold">£{r.ticketPrice}</span></div>
                          <div><span className="text-[#8B8593]">Revenue</span> <span className="font-bold">£{r.revenue.toLocaleString()}</span></div>
                          <div><span className="text-[#8B8593]">Talent pay</span> <span className="font-bold">£{r.wrestlerPay.toLocaleString()}</span></div>
                          {r.specialtyCost > 0 && <div><span className="text-[#8B8593]">Speciality costs</span> <span className="font-bold">£{r.specialtyCost.toLocaleString()}</span></div>}
                          {r.networkIncome > 0 && <div><span className="text-[#8B8593]">TV income</span> <span className="font-bold text-[#8B6BC0]">+£{r.networkIncome.toLocaleString()}</span></div>}
                          {r.sponsorIncome > 0 && <div><span className="text-[#8B8593]">Sponsor income</span> <span className="font-bold text-[#8B6BC0]">+£{r.sponsorIncome.toLocaleString()}</span></div>}
                          <div><span className="text-[#8B8593]">Show rating</span> <span className="font-bold">{r.fullRating}</span></div>
                        </div>
                        {r.news.amount !== 0 && (
                          <div className="text-[10px] pt-2 border-t border-[#2B2733]">
                            <span className="font-bold text-[#8B6BC0]">{r.news.type}</span>{" "}
                            <span className="text-[#CFC9BB]">{r.news.text}</span>{" "}
                            <span className={r.news.amount > 0 ? "text-[#8B6BC0]" : "text-red-400"}>({r.news.amount > 0 ? "+" : ""}£{r.news.amount.toLocaleString()})</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
                {showHistory.length === 0 && <div className="text-xs text-[#8B8593] italic">No shows run yet.</div>}
              </div>
            )}

            {resultsCompanyFilter !== "player" && (
              <div>
                {resultsCompanyFilter === "all" && <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-2">OTHER PROMOTIONS</div>}
                <div className="space-y-2">
                  {rivalShowHistory
                    .filter((r) => resultsYearFilter === "all" || r.year === Number(resultsYearFilter))
                    .filter((r) => resultsCompanyFilter === "all" || r.companyId === resultsCompanyFilter)
                    .map((r) => (
                      <div key={r.id} className="bg-[#131117] border border-[#2B2733] rounded-lg p-3">
                        <div className="text-xs font-bold mb-1">{r.companyName} &middot; Y{r.year} Wk{r.weekOfYear}{r.wasPPV && <span className="text-[#8B6BC0]"> &middot; PPV</span>}</div>
                        <div className="space-y-1">
                          {r.matches.map((m, i) => (
                            <div key={i} className="text-[11px] text-[#8B8593] flex items-center justify-between">
                              <span><span className={m.winner === m.a ? "text-[#CFC9BB] font-semibold" : "line-through"}>{m.a}</span> vs <span className={m.winner === m.b ? "text-[#CFC9BB] font-semibold" : "line-through"}>{m.b}</span></span>
                              <span className="flex items-center gap-1"><Star size={9} className="text-[#8B6BC0]" />{m.rating}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  {rivalShowHistory.filter((r) => resultsCompanyFilter === "all" || r.companyId === resultsCompanyFilter).length === 0 && (
                    <div className="text-xs text-[#8B8593] italic">No results yet from other promotions.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
          </div>
        )}

        {tab === "rankings" && (
          <div className="flex flex-col dt:flex-row gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">TOP 10 BY RANKING POINTS</div>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  <SubTabButton active={rankingsMode === "singles"} onClick={() => setRankingsMode("singles")} icon={Users} label="Singles" />
                  <SubTabButton active={rankingsMode === "tag"} onClick={() => setRankingsMode("tag")} icon={Users2} label="Tag Team" />
                </div>
                {rankingsMode === "singles" && (
                  <select value={rankingsFilter} onChange={(e) => setRankingsFilter(e.target.value)} className="bg-[#17151C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                    <option value="all">All promotions</option>
                    <option value="freelance">Freelance</option>
                    <option value="player">{companyName}</option>
                    {rivalCompanies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="text-[10px] text-[#8B8593] mb-3">{rankingsMode === "singles" ? "Ranked across the wrestlers currently in that scope." : "Ranked by combined ranking points of each tag team's core pairing."}</div>

            {rankingsMode === "singles" ? (
              <div className="space-y-1.5 dt:space-y-0 dt:grid dt:grid-cols-2 dt:gap-2">
                {[...pool]
                  .filter((w) => {
                    if (rankingsFilter === "all") return true;
                    if (rankingsFilter === "freelance") return w.contractedTo === null;
                    return w.contractedTo === rankingsFilter;
                  })
                  .sort((a, b) => b.rankingPts - a.rankingPts)
                  .slice(0, 10)
                  .map((w, i) => (
                    <button key={w.name} onClick={() => setDetailWrestler(w)} className="w-full flex items-center justify-between bg-[#17151C] border border-[#2B2733] hover:border-[#5B3B8C] rounded-lg px-3 py-2.5 text-left transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-[#8B6BC0] w-5" style={{ fontFamily: "Anton, sans-serif" }}>{i + 1}</span>
                        <div>
                          <div className="font-black text-sm flex items-center gap-1.5" style={{ fontFamily: "Anton, sans-serif" }}>
                            {w.name}
                            {(w.holdsTitles || []).length > 0 && <Award size={12} className="text-[#8B6BC0]" />}
                          </div>
                          <div className="text-[9px] text-[#8B8593]">{effectiveTier(w)} &middot; OVR {Math.round(attrOf(w))}</div>
                        </div>
                      </div>
                      <span className="font-bold text-sm tabular-nums">{w.rankingPts}</span>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="space-y-1.5 dt:space-y-0 dt:grid dt:grid-cols-2 dt:gap-2">
                {stables
                  .map((s) => {
                    const core = s.members.slice(0, 2);
                    const coreObjs = core.map((n) => pool.find((w) => w.name === n)).filter(Boolean);
                    const combinedPts = coreObjs.reduce((sum, w) => sum + w.rankingPts, 0);
                    const isChamp = titles.some((t) => t.type === "tag" && t.holders.length === 2 && core.every((n) => t.holders.includes(n)));
                    return { s, core, combinedPts, isChamp };
                  })
                  .sort((a, b) => b.combinedPts - a.combinedPts)
                  .slice(0, 10)
                  .map(({ s, core, combinedPts, isChamp }, i) => (
                    <div key={s.id} className="w-full flex items-center justify-between bg-[#17151C] border border-[#2B2733] rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-[#8B6BC0] w-5" style={{ fontFamily: "Anton, sans-serif" }}>{i + 1}</span>
                        <div>
                          <div className="font-black text-sm flex items-center gap-1.5" style={{ fontFamily: "Anton, sans-serif" }}>
                            {s.name}
                            {isChamp && <Award size={12} className="text-[#8B6BC0]" />}
                          </div>
                          <div className="text-[9px] text-[#8B8593]">{core.join(" & ")} &middot; {s.wins}-{s.losses}</div>
                        </div>
                      </div>
                      <span className="font-bold text-sm tabular-nums">{combinedPts}</span>
                    </div>
                  ))}
                {stables.length === 0 && <div className="text-xs text-[#8B8593] italic">No tag teams yet — create one from the Roster tab.</div>}
              </div>
            )}
          </div>

          <div className="hidden dt:block dt:w-64 shrink-0">
            <div className="sticky top-4 space-y-4">
              <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">YOUR STANDING</div>
                {(() => {
                  const yourNames = new Set([...roster, ...perUseWrestlers].map((w) => w.name));
                  const fullRanked = [...pool].sort((a, b) => b.rankingPts - a.rankingPts);
                  const bestIdx = fullRanked.findIndex((w) => yourNames.has(w.name));
                  if (bestIdx === -1) return <div className="text-xs text-[#8B8593] italic">No signed or per-use wrestlers yet.</div>;
                  const best = fullRanked[bestIdx];
                  return (
                    <div className="text-xs">
                      <div className="font-bold">{best.name}</div>
                      <div className="text-[#8B8593]">Ranked #{bestIdx + 1} overall &middot; {best.rankingPts} pts</div>
                      {bestIdx >= 10 && <div className="text-[9px] text-[#8B8593] italic mt-1">Not in the top 10 shown — needs more ranking points.</div>}
                    </div>
                  );
                })()}
              </div>
              <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">ACTIVE STORYLINES</div>
                {renderStorylinesMini(3)}
              </div>
            </div>
          </div>
          </div>
        )}

        {tab === "backoffice" && backOfficeSubTab === "worldeditor" && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">WORLD EDITOR</div>
            <div className="text-[10px] text-[#8B8593] mb-4">Create, edit, or delete wrestlers and companies directly — or bulk-import a whole roster from a CSV template (opens and edits fine in Excel or Google Sheets).</div>
            <div className="flex gap-2 mb-4">
              <SubTabButton active={worldEditorSubTab === "wrestlers"} onClick={() => setWorldEditorSubTab("wrestlers")} icon={UserPlus} label="Wrestlers" />
              <SubTabButton active={worldEditorSubTab === "companies"} onClick={() => setWorldEditorSubTab("companies")} icon={Globe2} label="Companies" />
            </div>

            {worldEditorSubTab === "wrestlers" && (
              <div>
                <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 mb-4">
                  <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-2">BULK IMPORT / EXPORT</div>
                  <div className="text-[10px] text-[#8B8593] mb-3">Download the template, fill in one row per wrestler (name is required — everything else has a sensible default), then upload it back. Names already in your world are skipped.</div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={downloadWrestlerTemplate} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold border border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]"><Download size={13} /> Download Template</button>
                    <button onClick={downloadWrestlerExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold border border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]"><Download size={13} /> Export Current Roster</button>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold border border-dashed border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#241B33] cursor-pointer">
                      <Upload size={13} /> Upload CSV
                      <input type="file" accept=".csv" className="hidden" onChange={handleWrestlerCSVUpload} />
                    </label>
                  </div>
                  {wrestlerImportSummary && (
                    <div className="mt-3 text-[11px]">
                      <div className="text-[#8B6BC0] font-bold">{wrestlerImportSummary.added} wrestler{wrestlerImportSummary.added === 1 ? "" : "s"} added.</div>
                      {wrestlerImportSummary.skipped.length > 0 && (
                        <div className="text-[#8B8593] mt-1">
                          {wrestlerImportSummary.skipped.length} skipped:
                          <div className="space-y-0.5 mt-0.5">
                            {wrestlerImportSummary.skipped.slice(0, 10).map((s, i) => <div key={i}>Row {s.row}: {s.reason}</div>)}
                          </div>
                        </div>
                      )}
                      <button onClick={() => setWrestlerImportSummary(null)} className="text-[#8B8593] hover:text-[#F2ECDD] mt-1">Dismiss</button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <input value={editorWrestlerSearch} onChange={(e) => setEditorWrestlerSearch(e.target.value)} placeholder="Search by name..." className="flex-1 bg-[#131117] border border-[#2B2733] rounded px-3 py-2 text-xs" />
                  <button onClick={openNewWrestlerDraft} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold border border-dashed border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#17151C] whitespace-nowrap"><Plus size={13} /> Add Wrestler</button>
                </div>
                <div className="text-[10px] text-[#8B8593] mb-2">{pool.length} total in the world</div>
                <div className="grid sm:grid-cols-2 dt:grid-cols-3 gap-2">
                  {pool.filter((w) => w.name.toLowerCase().includes(editorWrestlerSearch.toLowerCase())).slice(0, 150).map((w) => (
                    <button key={w.name} onClick={() => openEditWrestlerDraft(w)} className="text-left bg-[#17151C] border border-[#2B2733] hover:border-[#5B3B8C] rounded-lg p-2.5">
                      <div className="font-bold text-xs truncate">{w.name}</div>
                      <div className="text-[9px] text-[#8B8593]">OVR {Math.round(avgStats(w))} &middot; {w.age} &middot; {w.sex} &middot; {w.alignment}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {worldEditorSubTab === "companies" && (
              <div>
                <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 mb-4">
                  <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-2">BULK IMPORT / EXPORT</div>
                  <div className="text-[10px] text-[#8B8593] mb-3">Same idea — one row per company. A title and booker name are generated automatically if left blank.</div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={downloadCompanyTemplate} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold border border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]"><Download size={13} /> Download Template</button>
                    <button onClick={downloadCompanyExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold border border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]"><Download size={13} /> Export Current Companies</button>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold border border-dashed border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#241B33] cursor-pointer">
                      <Upload size={13} /> Upload CSV
                      <input type="file" accept=".csv" className="hidden" onChange={handleCompanyCSVUpload} />
                    </label>
                  </div>
                  {companyImportSummary && (
                    <div className="mt-3 text-[11px]">
                      <div className="text-[#8B6BC0] font-bold">{companyImportSummary.added} compan{companyImportSummary.added === 1 ? "y" : "ies"} added.</div>
                      {companyImportSummary.skipped.length > 0 && (
                        <div className="text-[#8B8593] mt-1">
                          {companyImportSummary.skipped.length} skipped:
                          <div className="space-y-0.5 mt-0.5">
                            {companyImportSummary.skipped.slice(0, 10).map((s, i) => <div key={i}>Row {s.row}: {s.reason}</div>)}
                          </div>
                        </div>
                      )}
                      <button onClick={() => setCompanyImportSummary(null)} className="text-[#8B8593] hover:text-[#F2ECDD] mt-1">Dismiss</button>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mb-3">
                  <button onClick={openNewCompanyDraft} className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-bold border border-dashed border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#17151C] whitespace-nowrap"><Plus size={13} /> Add Company</button>
                </div>
                <div className="grid sm:grid-cols-2 dt:grid-cols-3 gap-2">
                  {rivalCompanies.map((co) => (
                    <button key={co.id} onClick={() => openEditCompanyDraft(co)} className="text-left bg-[#17151C] border border-[#2B2733] hover:border-[#5B3B8C] rounded-lg p-2.5">
                      <div className="font-bold text-xs truncate">{co.name}{co.acquired && <span className="text-[#8B6BC0]"> (yours)</span>}</div>
                      <div className="text-[9px] text-[#8B8593]">{popularityTier(co.popularity)} ({Math.round(co.popularity)}) &middot; {co.bookerName}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "titles" && (
          <div className="flex flex-col dt:flex-row gap-5">
          <div className="flex-1 min-w-0 space-y-3">
            {!purchasingTitle ? (
              titles.length >= MAX_TITLES ? (
                <div className="w-full text-center py-2.5 text-xs text-[#8B8593] italic border border-[#2B2733] rounded-lg">Maximum of {MAX_TITLES} titles reached</div>
              ) : (
                <button onClick={() => setPurchasingTitle(true)} disabled={bank < TITLE_PURCHASE_COST} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold border border-dashed border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#17151C] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg">
                  <Plus size={13} /> Purchase New Title (<span className="booked-mono" style={{ color: "var(--gold)" }}>£{TITLE_PURCHASE_COST.toLocaleString()}</span>) &middot; {titles.length}/{MAX_TITLES}
                </button>
              )
            ) : (
              <div className="bg-[#17151C] border border-[#5B3B8C] rounded-lg p-4 space-y-3">
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">NEW TITLE</div>
                <input value={newTitleName} onChange={(e) => setNewTitleName(e.target.value)} placeholder="Title name, e.g. Intercontinental Championship" className="w-full border border-[#2B2733] rounded px-3 py-2 text-xs" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
                <div className="flex gap-2">
                  {["singles", "tag"].map((type) => (
                    <button key={type} onClick={() => setNewTitleType(type)} className={`px-3 py-1.5 rounded text-[11px] font-bold border ${newTitleType === type ? "bg-[#5B3B8C] border-[#5B3B8C] text-[#F2ECDD]" : "border-[#2B2733] text-[#8B8593]"}`} style={newTitleType === type ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C", color: "#F2ECDD" } : undefined}>
                      {type === "singles" ? "Singles" : "Tag Team"}
                    </button>
                  ))}
                </div>
                <div>
                  <div className="text-[9px] text-[#8B8593] mb-1">WEIGHT CLASS (optional)</div>
                  <select value={newTitleWeightClass || ""} onChange={(e) => setNewTitleWeightClass(e.target.value || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                    <option value="">Open (any weight)</option>
                    {WEIGHT_CLASSES.map((wc) => <option key={wc} value={wc}>{wc}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[9px] text-[#8B8593] mb-1">GENDER (optional)</div>
                  <select value={newTitleGenderLock || ""} onChange={(e) => setNewTitleGenderLock(e.target.value || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                    <option value="">Open (any gender)</option>
                    <option value="Male">Male only</option>
                    <option value="Female">Female only</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={purchaseTitle} disabled={!newTitleName.trim() || bank < TITLE_PURCHASE_COST} className="flex-1 py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded">
                    Confirm &mdash; <span className="booked-mono">£{TITLE_PURCHASE_COST.toLocaleString()}</span>
                  </button>
                  <button onClick={() => { setPurchasingTitle(false); setNewTitleName(""); setNewTitleType("singles"); setNewTitleWeightClass(null); setNewTitleGenderLock(null); }} className="px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-3 dt:space-y-0 dt:grid dt:grid-cols-2 dt:gap-3 dt:items-start">
            {titles.map((t) => {
              const reignWeeks = t.holders.length > 0 ? weekNumber - t.reignStartWeek : null;
              return (
                <div key={t.id} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Award size={16} className="text-[#8B6BC0]" />
                    {editingTitleId === t.id ? (
                      <>
                        <input value={editingTitleName} onChange={(e) => setEditingTitleName(e.target.value)} className="flex-1 border border-[#5B3B8C] rounded px-2 py-1 text-sm font-bold" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} autoFocus />
                        <button onClick={confirmRenameTitle} className="text-[#8B6BC0] hover:text-[#F2ECDD]"><Check size={16} /></button>
                        <button onClick={() => setEditingTitleId(null)} className="text-[#8B8593] hover:text-[#F2ECDD]"><X size={16} /></button>
                      </>
                    ) : (
                      <>
                        <div className="font-black text-base flex-1" style={{ fontFamily: "Anton, sans-serif" }}>{t.name}</div>
                        <span className="text-[9px] text-[#8B8593] font-bold tracking-wide">
                          {t.type === "tag" ? "TAG TEAM" : "SINGLES"}
                          {t.weightClass ? ` · ${t.weightClass.toUpperCase()}` : ""}
                          {t.genderLock ? ` · ${t.genderLock.toUpperCase()}` : ""}
                        </span>
                        <button onClick={() => startRenameTitle(t)} className="text-[#8B8593] hover:text-[#F2ECDD]"><Pencil size={13} /></button>
                      </>
                    )}
                  </div>
                  {t.holders.length > 0 ? (
                    <div className="text-xs mb-2">
                      <span className="text-[#8B8593]">Champion{t.holders.length > 1 ? "s" : ""}: </span>
                      <span className="font-bold">{t.holders.join(" & ")}</span>
                      <span className="text-[#8B8593]"> &middot; {reignWeeks === 0 ? "New this week" : `${reignWeeks} week${reignWeeks === 1 ? "" : "s"} held`}</span>
                      <span className="text-[#8B8593]"> &middot; {t.currentReignDefenses || 0} defense{(t.currentReignDefenses || 0) === 1 ? "" : "s"} this reign</span>
                      {(() => {
                        const lastActive = t.lastDefendedWeek ?? t.reignStartWeek;
                        const weeksLeft = lastActive !== null ? TITLE_VACATE_WEEKS - (weekNumber - lastActive) : TITLE_VACATE_WEEKS;
                        if (weeksLeft <= 3) return <div className="text-[10px] text-red-400 mt-0.5">Vacated in {Math.max(0, weeksLeft)} week{weeksLeft === 1 ? "" : "s"} if not defended</div>;
                        return null;
                      })()}
                    </div>
                  ) : (
                    <div className="text-xs text-[#8B8593] italic mb-2">Vacant &mdash; book a match for this title to crown a new champion.</div>
                  )}
                  <div className="mb-2">
                    <div className="flex justify-between text-[10px] text-[#8B8593] mb-1"><span>PRESTIGE</span><span className="text-[#F2ECDD] font-bold">{t.prestige || 0}/100</span></div>
                    <div className="h-1.5 bg-[#232029] rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#5B3B8C] to-[#8B6BC0]" style={{ width: `${t.prestige || 0}%` }} /></div>
                  </div>
                  <div className="text-[10px] text-[#8B8593] mb-2"><span className="font-bold text-[#CFC9BB]">{t.totalDefenses || 0}</span> total defense{(t.totalDefenses || 0) === 1 ? "" : "s"} across all reigns</div>
                  <div className="pt-2 border-t border-[#2B2733] mb-2">
                    <div className="text-[9px] tracking-widest text-[#8B8593] font-bold mb-1.5">TOP CONTENDERS</div>
                    {titleContenders(t).length > 0 ? (
                      <div className="space-y-1">
                        {titleContenders(t).map((c, i) => (
                          <div key={c.key} className="text-[10px] flex justify-between">
                            <span className="text-[#CFC9BB]">#{i + 1} {c.label}{c.earned && <span className="text-[#8B6BC0]"> (earned)</span>}</span>
                            <span className="text-[#8B8593]">{Number.isFinite(c.pts) ? `${c.pts} pts` : "guaranteed"}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#8B8593] italic">No eligible contenders yet — sign or book some wrestlers.</div>
                    )}
                  </div>
                  {t.history.length > 0 && (
                    <button onClick={() => setViewingTitleHistory(t)} className="text-[10px] font-bold text-[#8B6BC0] hover:text-[#F2ECDD]">
                      View title history ({t.history.length})
                    </button>
                  )}
                </div>
              );
            })}
            </div>
          </div>

          <div className="hidden dt:block dt:w-64 shrink-0">
            <div className="sticky top-4 space-y-4">
              <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">TITLE STATUS</div>
                <div className="space-y-1.5 text-[11px] mb-3">
                  <div className="flex justify-between"><span className="text-[#8B8593]">Titles</span><span className="font-bold">{titles.length}/{MAX_TITLES}</span></div>
                  <div className="flex justify-between"><span className="text-[#8B8593]">Vacant</span><span className="font-bold">{titles.filter((t) => t.holders.length === 0).length}</span></div>
                  <div className="flex justify-between"><span className="text-[#8B8593]">Avg. prestige</span><span className="font-bold">{titles.length ? Math.round(titles.reduce((s, t) => s + (t.prestige || 0), 0) / titles.length) : 0}/100</span></div>
                </div>
                {(() => {
                  const atRisk = titles.filter((t) => {
                    if (t.holders.length === 0) return false;
                    const lastActive = t.lastDefendedWeek ?? t.reignStartWeek;
                    const weeksLeft = lastActive !== null ? TITLE_VACATE_WEEKS - (weekNumber - lastActive) : TITLE_VACATE_WEEKS;
                    return weeksLeft <= 3;
                  });
                  if (atRisk.length === 0) return <div className="text-[10px] text-[#8B8593] italic">No titles at risk of vacating right now.</div>;
                  return (
                    <div>
                      <div className="text-[9px] tracking-widest text-red-400 font-bold mb-1.5">AT RISK OF VACATING</div>
                      <div className="space-y-1">
                        {atRisk.map((t) => {
                          const lastActive = t.lastDefendedWeek ?? t.reignStartWeek;
                          const weeksLeft = Math.max(0, TITLE_VACATE_WEEKS - (weekNumber - lastActive));
                          return <div key={t.id} className="text-[10px] text-red-300">{t.name} &mdash; {weeksLeft}wk left</div>;
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          </div>
        )}

        {tab === "merch" && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">MERCHANDISE</div>
            {popularity < MERCH_UNLOCK_POPULARITY ? (
              <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 text-xs text-[#8B8593]">
                Unlocks at {MERCH_UNLOCK_POPULARITY} company score — you're currently at {Math.round(popularity)}. Build some popularity first; a merch stall isn't worth running until people actually know who you are.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-[10px] text-[#8B8593] mb-1">Stock persists between shows — buy it here, sell it at your shows until it runs out. Check back and restock, or you'll miss sales you could have had. There's a small theft risk on unsold stock each show.</div>

                <div className="bg-[#17151C] border border-[#5B3B8C] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold">Current Stock</span>
                    <span className={`text-lg font-black booked-mono ${merchStock === 0 ? "text-red-400" : ""}`}>{merchStock} units</span>
                  </div>
                  <div className="text-[10px] text-[#8B8593] mb-3">Quality: <span className="text-[#F2ECDD] font-bold">{MERCH_QUALITY_TIERS[merchQualityTier].name}</span> — £{MERCH_QUALITY_TIERS[merchQualityTier].unitCost}/unit to buy, sells for £{MERCH_QUALITY_TIERS[merchQualityTier].unitPrice}/unit</div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <div className="text-[9px] text-[#8B8593] mb-1">UNITS TO BUY</div>
                      <input type="number" min={0} step={10} value={merchBuyQty} onChange={(e) => setMerchBuyQty(Math.max(0, Number(e.target.value)))} className="w-full border border-[#2B2733] rounded px-3 py-2 text-sm" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
                    </div>
                    <button onClick={() => buyMerchStock(merchBuyQty)} disabled={merchBuyQty <= 0 || merchBuyQty * MERCH_QUALITY_TIERS[merchQualityTier].unitCost > bank} className="px-4 py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded">
                      Buy (£{(merchBuyQty * MERCH_QUALITY_TIERS[merchQualityTier].unitCost).toLocaleString()})
                    </button>
                  </div>
                </div>

                <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                  <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">QUALITY UPGRADE</div>
                  <div className="text-[10px] text-[#8B8593] mb-3">A one-time, permanent investment — better merch costs more to stock but sells for a lot more per unit.</div>
                  <div className="space-y-2">
                    {MERCH_QUALITY_TIERS.map((t, i) => (
                      <div key={t.name} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs border ${i === merchQualityTier ? "border-[#5B3B8C] bg-[#241B33]" : "border-[#2B2733] bg-[#131117]"}`}>
                        <div>
                          <span className="font-bold">{t.name}</span> <span className="text-[#8B8593]">— £{t.unitCost}/unit cost, £{t.unitPrice}/unit sale</span>
                        </div>
                        {i === merchQualityTier ? (
                          <span className="text-[#8B6BC0] font-bold text-[10px]">CURRENT</span>
                        ) : i === merchQualityTier + 1 ? (
                          <button onClick={upgradeMerchQuality} disabled={bank < t.upgradeCost} className="text-[10px] font-bold px-2 py-1 rounded bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed">
                            Upgrade (£{t.upgradeCost.toLocaleString()})
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#5A5660]">Locked</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">MERCH SALES BY WRESTLER</div>
                  <div className="text-[10px] text-[#8B8593] mb-3">Attributed by how much of a draw they were in the shows they've been on. This promotion only — resets if you retire.</div>
                  <div className="space-y-1">
                    {Object.entries(wrestlerMerchSales).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([name, revenue]) => (
                      <div key={name} className="flex items-center justify-between bg-[#131117] rounded px-3 py-1.5 text-xs">
                        <span>{name}</span>
                        <span className="font-bold booked-mono" style={{ color: "var(--gold)" }}>£{revenue.toLocaleString()}</span>
                      </div>
                    ))}
                    {Object.keys(wrestlerMerchSales).length === 0 && <div className="text-xs text-[#8B8593] italic">Nothing sold yet.</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "backoffice" && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">BACK OFFICE</div>
            <div className="text-[10px] text-[#8B8593] mb-4">Company and promoter details, your feeder promotion, and the World Editor.</div>
            <div className="flex gap-2 mb-4">
              <SubTabButton active={backOfficeSubTab === "general"} onClick={() => setBackOfficeSubTab("general")} icon={Landmark} label="General" />
              <SubTabButton active={backOfficeSubTab === "worldeditor"} onClick={() => setBackOfficeSubTab("worldeditor")} icon={Wrench} label="World Editor" />
            </div>
          </div>
        )}

        {tab === "backoffice" && backOfficeSubTab === "general" && (
          <div>
            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 mb-4">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">COMPANY</div>
              <div className="text-[10px] text-[#8B8593] mb-1">COMPANY NAME</div>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full border border-[#2B2733] rounded px-3 py-2 text-sm font-bold" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
            </div>

            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 mb-4">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">FEEDER PROMOTION</div>
              {feederCompany ? (
                <div className="text-xs text-[#8B8593]">
                  <span className="text-[#F2ECDD] font-bold">{feederCompany.name}</span> — founded Y{yearOf(feederCompany.foundedWeek)} Wk{weekOfYear(feederCompany.foundedWeek)}. See it on the Promotions screen.
                </div>
              ) : (
                <>
                  <div className="text-[10px] text-[#8B8593] mb-3">Found a developmental promotion of your own, NXT-style — a one-time, permanent decision that costs real money to set up, and unlocks the Developmental show level and roster assignment for good.</div>
                  <div className="flex gap-2">
                    <input value={newFeederName} onChange={(e) => setNewFeederName(e.target.value)} placeholder="e.g. Ringside Empire: Rise" className="flex-1 border border-[#2B2733] rounded px-3 py-2 text-sm" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
                    <button onClick={foundFeederCompany} disabled={!newFeederName.trim() || bank < feederSetupCost} className="px-4 py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded whitespace-nowrap">
                      Found It (£{feederSetupCost.toLocaleString()})
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 mb-4">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">PRODUCTION</div>
              <div className="text-[10px] text-[#8B8593] mb-3">Pyro, titantron, lighting rig, camera and broadcast quality — bundled into one spectacle tier. Raises your match rating ceiling (stacks with Staff) and what a TV network will pay for the broadcast.</div>
              <div className="flex items-center justify-between bg-[#131117] rounded-lg px-3 py-2.5 mb-3">
                <div>
                  <div className="text-xs font-bold">{PRODUCTION_TIERS[productionTier].name}</div>
                  <div className="text-[10px] text-[#8B8593]">+{productionRatingBonus} rating &middot; {PRODUCTION_TIERS[productionTier].tvMult}x TV value{productionWeeklyUpkeep > 0 ? ` · £${productionWeeklyUpkeep.toLocaleString()}/wk upkeep` : " · no weekly upkeep"}</div>
                </div>
              </div>
              {nextProductionTier ? (
                <button onClick={upgradeProduction} disabled={bank < nextProductionTier.cost} className="w-full px-4 py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded">
                  Upgrade to {nextProductionTier.name} (£{nextProductionTier.cost.toLocaleString()})
                </button>
              ) : (
                <div className="text-[10px] text-[#8B8593] italic">Top-tier production — nothing left to upgrade.</div>
              )}
            </div>

            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">PROMOTER</div>
              <div className="mb-3">
                <div className="text-[10px] text-[#8B8593] mb-1">YOUR NAME</div>
                <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="e.g. Sean McGinty" className="w-full border border-[#2B2733] rounded px-3 py-2 text-sm" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-[#8B8593] mb-1">AGE</div>
                  <input value={playerAge} onChange={(e) => setPlayerAge(e.target.value.replace(/[^0-9]/g, ""))} placeholder="—" inputMode="numeric" className="w-full border border-[#2B2733] rounded px-3 py-2 text-sm" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
                </div>
                <div>
                  <div className="text-[10px] text-[#8B8593] mb-1">SEX</div>
                  <select value={playerSex} onChange={(e) => setPlayerSex(e.target.value)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-3 py-2 text-sm">
                    <option value="">—</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "halloffame" && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">HALL OF FAME</div>
            <div className="text-[10px] text-[#8B8593] mb-4">Your best ever, against the best any rival's ever done — lifetime, across every promotion you've ever run. Only a full progress wipe clears these.</div>
            <div className="space-y-3 dt:space-y-0 dt:grid dt:grid-cols-2 dt:gap-3 dt:items-start">
              <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2"><Star size={16} className="text-[#8B6BC0]" /><span className="font-bold text-sm">Best Match Ever</span></div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#131117] rounded p-2">
                    <div className="text-[9px] text-[#8B8593] mb-0.5">YOU</div>
                    {hallOfFame.bestMatch ? (
                      <div className={hallOfFame.bestMatchRival && hallOfFame.bestMatchRival.rating > hallOfFame.bestMatch.rating ? "text-[#8B8593]" : "text-[#F2ECDD] font-bold"}>
                        {hallOfFame.bestMatch.rating} — {hallOfFame.bestMatch.description}
                      </div>
                    ) : <div className="text-[#8B8593] italic">Nothing yet</div>}
                  </div>
                  <div className="bg-[#131117] rounded p-2">
                    <div className="text-[9px] text-[#8B8593] mb-0.5">BEST RIVAL</div>
                    {hallOfFame.bestMatchRival ? (
                      <div className={hallOfFame.bestMatch && hallOfFame.bestMatch.rating >= hallOfFame.bestMatchRival.rating ? "text-[#8B8593]" : "text-red-300 font-bold"}>
                        {hallOfFame.bestMatchRival.rating} — {hallOfFame.bestMatchRival.companyName}
                      </div>
                    ) : <div className="text-[#8B8593] italic">Nothing yet</div>}
                  </div>
                </div>
              </div>
              <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2"><Ticket size={16} className="text-[#8B6BC0]" /><span className="font-bold text-sm">Biggest Show Ever</span></div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#131117] rounded p-2">
                    <div className="text-[9px] text-[#8B8593] mb-0.5">YOU</div>
                    {hallOfFame.biggestShow ? (
                      <div className={hallOfFame.biggestShowRival && hallOfFame.biggestShowRival.attendance > hallOfFame.biggestShow.attendance ? "text-[#8B8593]" : "text-[#F2ECDD] font-bold"}>
                        {hallOfFame.biggestShow.attendance.toLocaleString()} — {hallOfFame.biggestShow.arena}
                      </div>
                    ) : <div className="text-[#8B8593] italic">Nothing yet</div>}
                  </div>
                  <div className="bg-[#131117] rounded p-2">
                    <div className="text-[9px] text-[#8B8593] mb-0.5">BEST RIVAL</div>
                    {hallOfFame.biggestShowRival ? (
                      <div className={hallOfFame.biggestShow && hallOfFame.biggestShow.attendance >= hallOfFame.biggestShowRival.attendance ? "text-[#8B8593]" : "text-red-300 font-bold"}>
                        {hallOfFame.biggestShowRival.attendance.toLocaleString()} — {hallOfFame.biggestShowRival.companyName}
                      </div>
                    ) : <div className="text-[#8B8593] italic">Nothing yet</div>}
                  </div>
                </div>
              </div>
              <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2"><Award size={16} className="text-[#8B6BC0]" /><span className="font-bold text-sm">Longest Title Reign Ever</span></div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#131117] rounded p-2">
                    <div className="text-[9px] text-[#8B8593] mb-0.5">YOU</div>
                    {hallOfFame.longestReign ? (
                      <div className={hallOfFame.longestReignRival && hallOfFame.longestReignRival.weeks > hallOfFame.longestReign.weeks ? "text-[#8B8593]" : "text-[#F2ECDD] font-bold"}>
                        {hallOfFame.longestReign.weeks}wk — {hallOfFame.longestReign.holderNames.join(" & ")}
                      </div>
                    ) : <div className="text-[#8B8593] italic">Nothing yet</div>}
                  </div>
                  <div className="bg-[#131117] rounded p-2">
                    <div className="text-[9px] text-[#8B8593] mb-0.5">BEST RIVAL</div>
                    {hallOfFame.longestReignRival ? (
                      <div className={hallOfFame.longestReign && hallOfFame.longestReign.weeks >= hallOfFame.longestReignRival.weeks ? "text-[#8B8593]" : "text-red-300 font-bold"}>
                        {hallOfFame.longestReignRival.weeks}wk — {hallOfFame.longestReignRival.companyName}
                      </div>
                    ) : <div className="text-[#8B8593] italic">Nothing yet</div>}
                  </div>
                </div>
              </div>
              <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1"><Trophy size={16} className="text-[#8B6BC0]" /><span className="font-bold text-sm">Most Decorated Wrestler</span></div>
                {(() => {
                  const entries = Object.entries(wrestlerReignCounts).sort((a, b) => b[1] - a[1]);
                  if (entries.length === 0) return <div className="text-xs text-[#8B8593] italic">Nothing yet.</div>;
                  const [name, count] = entries[0];
                  return <div className="text-xs text-[#8B8593]"><span className="text-[#F2ECDD] font-bold">{name}</span> — {count} title reign{count === 1 ? "" : "s"} across your career</div>;
                })()}
              </div>
            </div>
          </div>
        )}

        {tab === "awards" && (() => {
          const awardsYearsAvailable = [...new Set([...showHistory.map((r) => r.year), ...rivalShowHistory.map((r) => r.year)])].sort((a, b) => b - a);
          const effectiveAwardsYear = awardsYear ?? (awardsYearsAvailable[0] ?? currentYear);
          const yearShows = showHistory.filter((r) => r.year === effectiveAwardsYear);
          const rivalYearShows = rivalShowHistory.filter((r) => r.year === effectiveAwardsYear);
          // Everything below is world-wide, not just your own card — Promotion
          // of the Year already pulled from every company's popularity, and
          // Match/Wrestler/Show of the Year now draw from rival shows too.
          // Angles are the one exception: rivals never run them, only matches,
          // so Angle of the Year only ever has your own promos to rank.
          const playerMatches = yearShows.flatMap((r) => r.matches.filter((m) => m.format === "match").map((m) => {
            const allNames = [...m.team1, ...(m.team2 || [])].map((w) => w.name);
            return {
              rating: m.rating, companyName, date: r.date, city: r.city,
              participants: allNames.join(m.team2?.length ? " vs " : ", "), allNames,
              winnerNames: (m.winnerTeam || []).map((w) => w.name),
              titleChange: !!(m.titleInfo && !m.titleInfo.defended),
            };
          }));
          const rivalMatches = rivalYearShows.flatMap((r) => r.matches.map((m) => ({
            rating: m.rating, companyName: r.companyName, date: r.date, city: null,
            participants: `${m.a} vs ${m.b}`, allNames: [m.a, m.b], winnerNames: [m.winner], titleChange: false,
          })));
          const allMatches = [...playerMatches, ...rivalMatches];
          const allAngles = yearShows.flatMap((r) => r.matches.filter((m) => m.format === "segment").map((m) => ({ ...m, showDate: r.date, showCity: r.city })));
          const topMatches = [...allMatches].sort((a, b) => b.rating - a.rating).slice(0, 3);
          const topAngles = [...allAngles].sort((a, b) => b.rating - a.rating).slice(0, 3);
          const playerShowRows = yearShows.map((r) => ({ companyName, rating: r.fullRating, date: r.date, label: `${r.city} (${r.arena})` }));
          const rivalShowRows = rivalYearShows.map((r) => ({ companyName: r.companyName, rating: Math.round(r.matches.reduce((s, m) => s + m.rating, 0) / Math.max(1, r.matches.length)), date: r.date, label: r.companyName }));
          const allShows = [...playerShowRows, ...rivalShowRows];
          const showOfYear = allShows.length > 0 ? [...allShows].sort((a, b) => b.rating - a.rating)[0] : null;
          // A simple, transparent score — not a hidden formula: every match or
          // angle a wrestler was part of adds its rating, winning a match adds
          // a flat bonus, and a title change on top of that adds more. Highest
          // total for the year takes it, same way a real end-of-year poll would
          // weigh "worked a lot of good matches" against "actually won things."
          const wrestlerScores = {};
          const bump = (name, amt) => { wrestlerScores[name] = (wrestlerScores[name] || 0) + amt; };
          allMatches.forEach((m) => {
            m.allNames.forEach((name) => bump(name, m.rating));
            m.winnerNames.forEach((name) => {
              bump(name, 15);
              if (m.titleChange) bump(name, 25);
            });
          });
          allAngles.forEach((m) => { if (m.performer) bump(m.performer.name, Math.round(m.rating * 0.5)); });
          // Historical matches may only carry {name} once loaded from a save
          // (see buildSaveSnapshot's trim) — cross-reference the live pool for
          // sex so the men's/women's split still works after a reload.
          const sexOf = (name) => pool.find((p) => p.name === name)?.sex || null;
          const rankedWrestlers = Object.entries(wrestlerScores).sort((a, b) => b[1] - a[1]);
          const wrestlerOfYearEntry = rankedWrestlers[0] || null;
          const mensWrestlerOfYearEntry = rankedWrestlers.find(([name]) => sexOf(name) === "Male") || null;
          const womensWrestlerOfYearEntry = rankedWrestlers.find(([name]) => sexOf(name) === "Female") || null;
          // Promotion of the Year ranks by popularity GAINED this year, player
          // included — fair across the board since the weekly rival-world tick
          // snapshots the player's own popularity into the same history now.
          const companyGrowth = (() => {
            const ids = [...new Set(rivalFinanceHistory.filter((h) => h.year === effectiveAwardsYear).map((h) => h.companyId))];
            return ids.map((id) => {
              const rows = rivalFinanceHistory.filter((h) => h.companyId === id && h.year === effectiveAwardsYear).sort((a, b) => a.weekNumber - b.weekNumber);
              if (rows.length < 2) return null;
              const name = id === "player" ? companyName : (rivalCompanies.find((c) => c.id === id)?.name || id);
              return { name, growth: Math.round(rows[rows.length - 1].popularity - rows[0].popularity) };
            }).filter(Boolean).sort((a, b) => b.growth - a.growth);
          })();
          const promotionOfYearEntry = companyGrowth[0] || null;

          const CATEGORIES = [
            { key: "match", label: "Match of the Year" },
            { key: "angle", label: "Angle of the Year" },
            { key: "wrestler", label: "Wrestler of the Year" },
            { key: "mens", label: "Men's Wrestler of the Year" },
            { key: "womens", label: "Women's Wrestler of the Year" },
            { key: "promotion", label: "Promotion of the Year" },
            { key: "show", label: "Show of the Year" },
          ];
          const rankedMatchRow = (m, i) => (
            <div key={i} className="bg-[#131117] rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[9px] text-[#8B8593]">{i + 1}.</div>
                <div className="text-xs font-bold text-[#F2ECDD] truncate">{m.participants}</div>
                <div className="text-[10px] text-[#8B8593] mt-0.5">{m.companyName}{m.city ? ` · ${m.city}` : ""} &middot; {formatDate(m.date)}</div>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-xs text-[#8B6BC0] font-bold"><Star size={12} />{m.rating}</div>
            </div>
          );
          const rankedAngleRow = (m, i) => (
            <div key={i} className="bg-[#131117] rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[9px] text-[#8B8593]">{i + 1}.</div>
                <div className="text-xs font-bold text-[#F2ECDD]">{angleResultText(m)}</div>
                <div className="text-[10px] text-[#8B8593] mt-0.5">{formatDate(m.showDate)} &middot; {m.showCity}</div>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-xs text-[#8B6BC0] font-bold"><Star size={12} />{m.rating}</div>
            </div>
          );
          const wrestlerCard = (entry, emptyText) => entry ? (
            <div className="bg-[#131117] rounded-lg p-3 text-xs"><span className="text-[#F2ECDD] font-bold">{entry[0]}</span><span className="text-[#8B8593]"> — score {Math.round(entry[1])}</span></div>
          ) : <div className="text-xs text-[#8B8593] italic">{emptyText}</div>;

          return (
            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">AWARDS</div>
                <select value={effectiveAwardsYear} onChange={(e) => setAwardsYear(Number(e.target.value))} className="bg-[#17151C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  {awardsYearsAvailable.length === 0 && <option value={currentYear}>Year {currentYear}</option>}
                  {awardsYearsAvailable.map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div className="text-[10px] text-[#8B8593] mb-4">End-of-year honors across the whole wrestling world — your shows and every rival's — for whichever year you pick. Angle of the Year is the one exception: only your own promotion runs angles, so that category is yours alone. Only covers shows still on file (Results/rival activity history).</div>
              <div className="flex flex-col dt:flex-row gap-4">
                <div className="dt:w-56 shrink-0 flex dt:flex-col flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button key={c.key} onClick={() => setAwardsCategory(c.key)} className={`text-left px-3 py-2 rounded-lg text-xs font-bold ${awardsCategory === c.key ? "bg-[#5B3B8C] text-[#F2ECDD]" : "bg-[#17151C] border border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  {awardsCategory === "match" && (topMatches.length > 0 ? topMatches.map(rankedMatchRow) : <div className="text-xs text-[#8B8593] italic">No matches this year yet.</div>)}
                  {awardsCategory === "angle" && (topAngles.length > 0 ? topAngles.map(rankedAngleRow) : <div className="text-xs text-[#8B8593] italic">No angles this year yet.</div>)}
                  {awardsCategory === "wrestler" && wrestlerCard(wrestlerOfYearEntry, "No shows run this year yet.")}
                  {awardsCategory === "mens" && wrestlerCard(mensWrestlerOfYearEntry, "No male wrestlers scored this year yet.")}
                  {awardsCategory === "womens" && wrestlerCard(womensWrestlerOfYearEntry, "No female wrestlers scored this year yet.")}
                  {awardsCategory === "promotion" && (promotionOfYearEntry ? (
                    <div className="bg-[#131117] rounded-lg p-3 text-xs"><span className="text-[#F2ECDD] font-bold">{promotionOfYearEntry.name}</span><span className="text-[#8B8593]"> — {promotionOfYearEntry.growth >= 0 ? "+" : ""}{promotionOfYearEntry.growth} popularity this year</span></div>
                  ) : <div className="text-xs text-[#8B8593] italic">Not enough of the year has played out yet to measure growth.</div>)}
                  {awardsCategory === "show" && (showOfYear ? (
                    <div className="bg-[#131117] rounded-lg p-3 text-xs">
                      <div className="text-[#F2ECDD] font-bold">{showOfYear.companyName}{showOfYear.label !== showOfYear.companyName ? ` — ${showOfYear.label}` : ""}</div>
                      <div className="text-[#8B8593] mt-0.5 flex items-center gap-1"><Star size={12} className="text-[#8B6BC0]" />{showOfYear.rating} rating &middot; {formatDate(showOfYear.date)}</div>
                    </div>
                  ) : <div className="text-xs text-[#8B8593] italic">No shows run this year yet.</div>)}
                </div>
              </div>
            </div>
          );
        })()}

        {tab === "achievements" && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">ACHIEVEMENTS</div>
            <div className="text-[10px] text-[#8B8593] mb-4">Lifetime — these carry over even if you retire and start a new promotion. {unlockedAchievements.length}/{ACHIEVEMENTS.length} unlocked.</div>
            <div className="space-y-2 dt:space-y-0 dt:grid dt:grid-cols-2 dt:gap-2">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = unlockedAchievements.find((u) => u.id === a.id);
                return (
                  <div key={a.id} className={`flex items-center gap-3 rounded-lg p-3 border ${unlocked ? "bg-[#241B33] border-[#5B3B8C]" : "bg-[#131117] border-[#2B2733] opacity-60"}`}>
                    <a.icon size={20} className={unlocked ? "text-[#8B6BC0]" : "text-[#5A5660]"} />
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm ${unlocked ? "text-[#F2ECDD]" : "text-[#8B8593]"}`}>{a.name}</div>
                      <div className="text-[11px] text-[#8B8593]">{a.desc}</div>
                    </div>
                    {unlocked && <Check size={16} className="text-[#8B6BC0] shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "news" && (
          <div>
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">NEWS &amp; ALERTS</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <select value={newsYearFilter} onChange={(e) => setNewsYearFilter(e.target.value)} className="bg-[#17151C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  <option value="all">All years</option>
                  {[...new Set(universeFeed.map((item) => yearOf(item.showNumber)))].sort((a, b) => a - b).map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
                <select value={newsWeekFilter} onChange={(e) => setNewsWeekFilter(e.target.value)} className="bg-[#17151C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  <option value="all">All weeks</option>
                  {[...new Set(universeFeed.map((item) => weekOfYear(item.showNumber)))].sort((a, b) => a - b).map((w) => <option key={w} value={w}>Week {w}</option>)}
                </select>
                <select value={newsFilter} onChange={(e) => setNewsFilter(e.target.value)} className="bg-[#17151C] border border-[#2B2733] rounded px-2 py-1 text-[10px]">
                  <option value="all">All promotions</option>
                  <option value="general">General / Unaffiliated</option>
                  <option value="player">{companyName}</option>
                  {rivalCompanies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="text-[10px] text-[#8B8593] mb-3">Title changes, hires, injuries, rival promotion activity, and locker-room rumours from across the wrestling world.</div>
            <div className="space-y-2">
              {universeFeed
                .filter((item) => {
                  if (newsFilter !== "all") {
                    if (newsFilter === "general" ? !!item.companyId : item.companyId !== newsFilter) return false;
                  }
                  if (newsYearFilter !== "all" && yearOf(item.showNumber) !== Number(newsYearFilter)) return false;
                  if (newsWeekFilter !== "all" && weekOfYear(item.showNumber) !== Number(newsWeekFilter)) return false;
                  return true;
                })
                .map((item) => (
                <div key={item.id} className={`bg-[#17151C] border rounded-lg p-3 text-xs ${item.type === "title" ? "border-[#5B3B8C]" : item.type === "injury" ? "border-red-500" : "border-[#2B2733]"}`}>
                  <div className="flex items-center gap-1.5 text-[9px] text-[#8B8593] mb-1">
                    {item.type === "title" && <Award size={11} className="text-[#8B6BC0]" />}
                    {item.type === "rival" && <Globe2 size={11} className="text-[#8B8593]" />}
                    {item.type === "injury" && <Skull size={11} className="text-red-400" />}
                    <span>Y{yearOf(item.showNumber)} Wk{weekOfYear(item.showNumber)} &middot; {formatDate(item.date)}</span>
                  </div>
                  <div className={item.type === "title" ? "text-[#F2ECDD] font-semibold" : item.type === "injury" ? "text-red-300 font-semibold" : "text-[#CFC9BB]"}>{flavorizeNews(item)}</div>
                </div>
              ))}
              {universeFeed.length === 0 && <div className="text-xs text-[#8B8593] italic">Nothing to report yet — keep running shows and the story will start writing itself.</div>}
            </div>
          </div>
        )}

        {tab === "menu" && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">MENU</div>
            <div className="text-[10px] text-[#8B8593] mb-4">Everything else — the world beyond your own card.</div>
            <div className="space-y-2.5">
              {[
                { key: "storylines", label: "Storylines", desc: `${Object.keys(storylines).length + Object.keys(stableStorylines).length} active`, icon: Flame },
                { key: "calendar", label: "Calendar", desc: `${scheduledEvents.length} event${scheduledEvents.length === 1 ? "" : "s"} scheduled`, icon: Calendar },
                { key: "wrestlers", label: "Wrestlers", desc: "Browse & hire the full pool", icon: UserPlus },
                { key: "staff", label: "Staff", desc: `${hiredStaff.length} hired`, icon: HardHat },
                { key: "promotions", label: "Promotions", desc: "Rival companies", icon: Globe2 },
                { key: "deals", label: "Deals", desc: "TV networks & sponsors", icon: Tv },
                { key: "merch", label: "Merchandise", desc: popularity >= MERCH_UNLOCK_POPULARITY ? `${merchStock} units in stock` : "Locked", icon: Ticket },
                { key: "rankings", label: "Rankings", desc: "Top 10, singles & tag", icon: TrendingUp },
                { key: "ratings", label: "Ratings", desc: "Every show, ranked by viewers", icon: BarChart3 },
                { key: "news", label: "News", desc: "Everything happening", icon: Newspaper },
                { key: "achievements", label: "Achievements", desc: `${unlockedAchievements.length}/${ACHIEVEMENTS.length} unlocked`, icon: Trophy },
                { key: "halloffame", label: "Hall of Fame", desc: "Your best, all-time", icon: Star },
                { key: "awards", label: "Awards", desc: "Year-end Wrestler/Match/Angle of the Year", icon: Medal },
                { key: "backoffice", label: "Back Office", desc: "Company & promoter names", icon: Landmark },
                { key: "guide", label: "Guide", desc: "How to play", icon: BookOpen },
                { key: "saves", label: "Saves", desc: "Save, retire, or start over", icon: NotebookPen },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setTab(item.key); if (item.key === "promotions") setViewingCompany(null); if (item.key === "saves") setRetiring(false); }}
                  className="w-full flex items-center gap-3 bg-[#17151C] border border-[#2B2733] hover:border-[#5B3B8C] rounded-lg p-4 text-left transition-colors"
                >
                  <item.icon size={22} className="text-[#8B6BC0] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{item.label}</div>
                    <div className="text-[11px] text-[#8B8593]">{item.desc}</div>
                  </div>
                  <ChevronDown size={16} className="text-[#8B8593] -rotate-90 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="booked-bottom-nav-spacer" />

      <div className="dt:hidden" style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#0A0A0C", borderTop: "1px solid #2B2733", zIndex: 40 }}>
        <div className="max-w-4xl mx-auto flex items-stretch">
          {[
            { key: "company", label: "Company", icon: Landmark },
            { key: "roster", label: "Roster", icon: Users },
            { key: "book", label: "Book", icon: Ticket },
            { key: "titles", label: "Titles", icon: Award },
          ].map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
                style={{ color: active ? "#8B6BC0" : "#8B8593" }}
              >
                <item.icon size={20} />
                <span className="text-[9px] font-bold tracking-wide">{item.label.toUpperCase()}</span>
              </button>
            );
          })}
          {(() => {
            const menuActive = ["menu", "wrestlers", "promotions", "deals", "rankings", "news", "guide", "saves", "achievements", "backoffice", "halloffame", "merch", "storylines"].includes(tab);
            return (
              <button
                onClick={() => setTab("menu")}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
                style={{ color: menuActive ? "#8B6BC0" : "#8B8593" }}
              >
                <Menu size={20} />
                <span className="text-[9px] font-bold tracking-wide">MENU</span>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
