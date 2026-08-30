import { useState, useEffect } from "react";
import {
  Zap, Wind, HeartPulse, Mic2, Shield, TrendingUp, RotateCcw,
  Wallet, Users, Ticket, Building2, Star, X, Plus, Trophy, UserPlus, Award, BarChart3, Newspaper,
  Calendar, ChevronDown, ListChecks, Landmark, Pencil, Globe2, Check, Sparkles, BatteryCharging,
  ArrowUpCircle, Swords, Layers, LineChart as LineChartIcon, NotebookPen, Lock, Tv, Flame, Skull, Users2, BookOpen, Menu, Flag
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
  background-attachment: fixed;
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
const TIER_ORDER = ["Jobber", "Lower Card", "Mid Card", "Upper Card", "Main Event", "Legend"];
// Exclusive signing only — a tiny promotion shouldn't be able to permanently
// lock down a Legend-tier star. Per-use is unrestricted; renting a big name
// for one night stays realistic regardless of your size.
const HIRE_TIER_CAP = { Unknown: "Mid Card", Local: "Upper Card", Regional: "Main Event", National: "Legend", International: null };
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
  { id: "international-tier", name: "Global Empire", desc: "Reach International company level", icon: Landmark, check: (c) => TIER_RANK[c.tier] >= TIER_RANK.International },
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
  { id: "legend-wrestler", name: "Bona Fide Legend", desc: "Sign a Legend-tier wrestler", icon: Star, check: (c) => c.roster.some((w) => effectiveTier(w) === "Legend") },
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
  { id: "fatal4", name: "Chaos Theory", desc: "Book a Fatal 4-Way match", icon: Swords, check: (c) => c.bookedFatal4Ever },
  { id: "cage-match", name: "Trapped Inside", desc: "Book a Cage match", icon: Lock, check: (c) => c.bookedCageEver },
  { id: "attendance-10k", name: "Packed House", desc: "Run a show with 10,000+ fans", icon: Ticket, check: (c) => c.maxAttendanceEver >= 10000 },
  { id: "sellout", name: "Sold Out", desc: "Sell out a show completely", icon: Ticket, check: (c) => c.hasSoldOutEver },
  { id: "show-90", name: "Match of the Year", desc: "Run a show rated 90 or higher", icon: Star, check: (c) => c.maxShowRatingEver >= 90 },
  { id: "all-cities", name: "Grand Tour", desc: "Unlock every city region", icon: Globe2, check: (c) => c.unlockedCitiesCount >= CITY_CLUSTERS.flat().length },
  { id: "first-merch-sale", name: "Merch Table", desc: "Sell your first piece of merchandise", icon: Ticket, check: (c) => c.totalMerchRevenue > 0 },
  { id: "merch-mogul", name: "Merch Mogul", desc: "Sell £50,000 of merchandise, all-time this promotion", icon: Ticket, check: (c) => c.totalMerchRevenue >= 50000 },
  { id: "merch-premium", name: "Premium Brand", desc: "Upgrade your merchandise quality", icon: Ticket, check: (c) => c.merchQualityTier > 0 },
];

// The average Overall of your exclusively-signed roster relative to what's
// expected for your company level nudges your growth rate — a strong roster
// for your size grows a bit faster, a weak one (relative to your size, not
// zero) grows slower. Never a hard block, just a soft nudge either way.
const EXPECTED_ROSTER_OVERALL = { Unknown: 20, Local: 35, Regional: 50, National: 65, International: 80 };
const WEIGHT_CLASSES = ["Cruiserweight", "Light Heavyweight", "Heavyweight"];
const ALIGNMENTS = ["Face", "Heel"];

const CITIES = ["Leeds", "Manchester", "Newcastle", "Cardiff", "London", "Glasgow", "Birmingham", "Liverpool", "Sheffield", "Edinburgh", "International"];
const LOCKED_CITIES = { International: "International" }; // city name -> minimum company tier required to book there
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
function computeUnlockedCities(cityPopularity, startingCity) {
  const tiers = buildCityTiers(startingCity);
  let unlocked = [];
  for (let i = 0; i < tiers.length; i++) {
    if (i === 0) { unlocked = [...tiers[0]]; continue; }
    if (unlocked.some((c) => cityPopularity[c] >= CITY_UNLOCK_THRESHOLD)) unlocked = [...unlocked, ...tiers[i]];
    else break;
  }
  return unlocked;
}

// Venue costs and capacities as specified — PPV renamed to Major Arena. Each is
// gated behind a minimum company tier so a brand-new promotion can't walk into a
// 15,000+ seat arena with a guaranteed crowd before it's earned any reputation.
const ARENAS = [
  { name: "Backyard", crowdMin: 5, crowdMax: 50, ticketMin: 5, ticketMax: 25, cost: 75, minTier: "Unknown" },
  { name: "Small", crowdMin: 100, crowdMax: 500, ticketMin: 15, ticketMax: 35, cost: 750, minTier: "Local" },
  { name: "Medium", crowdMin: 500, crowdMax: 2750, ticketMin: 30, ticketMax: 50, cost: 4000, minTier: "Regional" },
  { name: "Large", crowdMin: 2750, crowdMax: 20000, ticketMin: 45, ticketMax: 65, cost: 12000, minTier: "National" },
  { name: "Major Arena", crowdMin: 15000, crowdMax: 32000, ticketMin: 60, ticketMax: 80, cost: 20000, minTier: "International" },
];

const SLOT_DEFS = [
  { key: "opener", label: "Opener", cap: 60 },
  { key: "lower", label: "Lower Card", cap: 75 },
  { key: "mid", label: "Mid Card", cap: 80 },
  { key: "upper", label: "Upper Card", cap: 95 },
  { key: "main", label: "Main Event", cap: 100 },
];

// Longer contracts cost proportionally more, but now that a signed wrestler costs
// nothing extra per show, the multiplier is steeper than before — you're buying
// unlimited use, not just a booking.
const CONTRACT_OPTIONS = [26, 52, 78, 104];
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
const HIRE_REFUSAL_CHANCE = 0.2;
const EXTENSION_REFUSAL_CHANCE = 0.25;
const WEEKS_PER_YEAR = 52;

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
// #1 International promotion opens with £1m, the smallest with £25k.
const RIVAL_STARTING_FUNDS = [1000000, 600000, 400000, 250000, 150000, 90000, 50000, 25000];
const BOOKER_FIRST = ["Morgan", "Casey", "Reese", "Jordan", "Avery", "Devon", "Quinn", "Harper"];
const BOOKER_LAST = ["Whitfield", "Doyle", "Blackburn", "Sharpe", "Callahan", "Mercer", "Ashby", "Konig"];
function randomBookerName() {
  return `${BOOKER_FIRST[rand(0, BOOKER_FIRST.length - 1)]} ${BOOKER_LAST[rand(0, BOOKER_LAST.length - 1)]}`;
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
const FIRST_NAMES_RESERVE = ["Cain", "Dash", "Gunnar", "Hex", "Ivo", "Jett", "Lex", "Mace", "Nash", "Orin"];
const SURNAMES_RESERVE = ["Ashford", "Briar", "Cross", "Duskwood", "Ember", "Fenwick", "Gale", "Havoc", "Iron", "Justice"];
function buildNamePool(firsts, surnames) {
  const names = [];
  firsts.forEach((f) => surnames.forEach((s) => names.push(`${f} ${s}`.toUpperCase())));
  return names;
}
const INITIAL_NAMES = buildNamePool(FIRST_NAMES, SURNAMES);
const RESERVE_NAMES = buildNamePool(FIRST_NAMES_RESERVE, SURNAMES_RESERVE);

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function tierFromAvg(avg) {
  if (avg >= 80) return "Legend";
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
// to lose, and nobody becomes a "Legend" just by rolling good stats. Once set,
// it's what displays everywhere except the hiring cap check.
function effectiveTier(w) {
  return w.pushOverride || w.tier;
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
function makeWrestler(name) {
  const stats = {};
  PERFORMANCE_STAT_KEYS.forEach((k) => { stats[k] = rand(20, 95); });
  const avg = PERFORMANCE_STAT_KEYS.reduce((s, k) => s + stats[k], 0) / PERFORMANCE_STAT_KEYS.length;
  return {
    name, age: rand(19, 45), sex: Math.random() < 0.5 ? "Male" : "Female",
    tier: tierFromAvg(avg), ...stats, eng: rand(70, 100),
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
  return {
    name, age: opts.age ?? rand(19, 45), sex: opts.sex || (Math.random() < 0.5 ? "Male" : "Female"),
    tier: tierFromAvg(avg), ...stats, eng: rand(70, 100),
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
  return pool;
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
  "A fan was seriously injured at ringside and {company} has been found liable",
  "A data breach exposed customer payment details, and {company} is footing the compensation bill",
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
];
const HAPPINESS_DECLINE_PENALTY = -15;
const HAPPINESS_BROKEN_PENALTY = -25;
const HAPPINESS_FULFILLED_BONUS = 20;

function attrOf(w) {
  const heldNow = (w.holdsTitles || []).length;
  return avgStats(w) + Math.round(w.rankingPts / 4) + heldNow * 2 + Math.round(w.titleReigns * 0.5);
}
function teamAttr(team) {
  const members = team.filter(Boolean);
  if (members.length === 0) return 0;
  return members.reduce((s, w) => s + attrOf(w), 0) / members.length;
}
function popularityTier(p) {
  if (p >= 81) return "International";
  if (p >= 41) return "National";
  if (p >= 16) return "Regional";
  if (p >= 6) return "Local";
  return "Unknown";
}
const TIER_RANK = { Unknown: 0, Local: 1, Regional: 2, National: 3, International: 4 };

// Speciality Matches — gated by company level, cost extra to book, and boost the
// rating ceiling. Each type is driven by whichever stat fits it best, blended into
// the win probability alongside overall ATTR — so a specialist can upset a bigger
// name in the right kind of match, and different stipulations reward different builds.
const SPECIALTY_MATCHES = [
  { id: "nodq", name: "No DQ", minTier: "Local", cost: 100, ratingBonus: 3, statKey: "atk" },
  { id: "hardcore", name: "Hardcore Match", minTier: "Local", cost: 150, ratingBonus: 4, statKey: "atk" },
  { id: "tables", name: "Tables Match", minTier: "Regional", cost: 250, ratingBonus: 5, statKey: "spec" },
  { id: "fca", name: "Falls Count Anywhere", minTier: "Regional", cost: 300, ratingBonus: 5, statKey: "spec" },
  { id: "submission", name: "Submission Match", minTier: "Regional", cost: 350, ratingBonus: 6, statKey: "sub" },
  { id: "lastmanstanding", name: "Last Man Standing", minTier: "National", cost: 600, ratingBonus: 7, statKey: "eng" },
  { id: "ladder", name: "Ladder Match", minTier: "National", cost: 750, ratingBonus: 8, statKey: "jmp" },
  { id: "ironman", name: "Iron Man Match", minTier: "National", cost: 900, ratingBonus: 9, statKey: "eng" },
  { id: "cage", name: "Cage Match", minTier: "International", cost: 1500, ratingBonus: 12, statKey: "atk" },
  { id: "chamber", name: "Elimination Chamber", minTier: "International", cost: 2500, ratingBonus: 15, statKey: "spec" },
];
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
        </div>
        <div className="text-[10px] text-[#8B8593] mb-1">
          {wrestler.age} yrs &middot; {wrestler.sex} &middot; {wrestler.weightClass} &middot; {employer}
          {contractWeeksLeft !== null && <> &middot; {contractWeeksLeft} week{contractWeeksLeft === 1 ? "" : "s"} left on contract</>}
        </div>
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
            <span className="text-[9px] text-[#8B8593] italic">Your call as booker — doesn't change their actual ability.</span>
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
                  <span className="font-semibold">{c}</span>
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
      "You start small — an Unknown-tier promotion with £20,000 and no reputation, based in one city you choose yourself. Venues, loans, and everything else scale up as your company grows through Local, Regional, National, and finally International.",
      "There's no single win condition — this is a long-term management sim. The closest thing to a fail state is going bankrupt for 4 weeks straight, which gets you fired and ends that playthrough (it's archived under Menu > Saves > Previous Games, alongside any promotion you retire on your own terms).",
    ],
  },
  {
    key: "company", title: "Company Tab", icon: Landmark,
    body: [
      "Overview: your company name and booker name (read-only here — edit both under Menu > Back Office), plus key totals — funds, roster size, average roster ability, shows run, titles owned.",
      "Finance: a graph of your bank balance across the current in-game year, with a year selector once you've played long enough to have more than one, and your loan status right underneath it.",
      "Company Level (shown top-right, tap it for a city breakdown) is your overall reputation — Unknown, Local, Regional, National, International. It's driven by how well your shows go in each city you actually tour, and it gets harder to keep climbing the higher it gets.",
    ],
  },
  {
    key: "roster", title: "Roster, Wrestlers & Contracts", icon: Users,
    body: [
      "There are two ways to use a wrestler: sign them Exclusive (a standing weekly wage, guaranteed available, no per-appearance fee) or add them to your Per-Use list (free to add, but you negotiate a fee — Low/Medium/High offer, cheaper offers are more likely refused — and pay it each time you actually book them). Per-use is cheaper per appearance, but exclusive guarantees you'll never lose access to them.",
      "A wrestler's Overall stat is fixed ability — it never changes from booking decisions. Push (their card status, from Jobber up to Legend) is separate and yours to set for anyone signed to you, exclusive or per-use — a skilled worker can be booked as a jobber, and nobody becomes a Legend just from good stats alone. Same goes for Alignment and renaming: editable for your own people, read-only for anyone signed elsewhere.",
      "Wrestlers age in real time — every 52 weeks, everyone gets a year older. Past 35 there's a real chance of small permanent dips to their physical stats; past 30, experience can show up as a charisma or mic-skill bump instead. A win also has a small chance of a tiny permanent boost tied to how it was won.",
      "Every wrestler also has Draw Power — how much they actually pull a crowd, separate from in-ring ability. It grows from winning, good matches, and title moments, and fades slowly if they're never booked anywhere. Who you put in the Main Event can swing a show's attendance up to ±25%.",
      "Any offer might get turned down — if refused, they're off-limits to you for 1-3 weeks before you can try again. Releasing an Exclusive wrestler mid-contract also costs a buyout, 50% of their remaining contract wage, shown before you confirm.",
      "Wrestlers have Energy (drains with use, recovers when rested — low energy hurts both their win chance and the match rating, but never permanently affects their Overall) and Happiness (affected by requests you promise and then fulfil, break, or decline, plus wins, losses, injuries, and title changes). Watch the Requests tab under Roster for what your talent is asking for.",
      "Injuries can happen after a draining match, sidelining someone 3-52 weeks with a specific injury type (knee, back, concussion, and others) — including champions, who are forced to vacate their title if it happens to them.",
    ],
  },
  {
    key: "booking", title: "Booking a Show", icon: Building2,
    body: [
      "Pick a venue (locked by your company tier — Backyard is always open, Major Arena needs International), a city, and a ticket price. Higher prices mean fewer fans, and your reputation in that specific city sets the ceiling.",
      "You start in one city of your choosing and nowhere else. Get any city you can already book to 70% local popularity and the next roughly-nearby group of cities unlocks — International stays gated separately, behind company tier.",
      "Build your card across five slots — Opener through Main Event — each with its own rating ceiling, so a top star wasted in the Opener still can't out-rate your Main Event. Once you're National tier or above, leaving slots empty costs you real rating and money — fans at that level expect a full card.",
      "Match types: 1v1, 2v2 tag (tag teams from a stable get their opponent list filtered to stablemates automatically), Triple Threat, Fatal 4-Way, or a Segment (a promo — rated on charisma, no winner or energy cost, and you can aim it at another signed wrestler to nudge or spark a rivalry).",
      "Every match resolves with a method — Pinfall, Submission, Disqualification, or Countout — weighted by the winning side's stats.",
      "Booking the exact same matchup over and over gets a real, escalating rating penalty as fans get tired of seeing it — shown as a warning before you run the show. An active rivalry gets that penalty halved, since building toward a blowoff is a real reason to run it back.",
      "Speciality Matches (No DQ, Cage, Ladder, and more) are gated by your company level and cost extra, but boost the rating ceiling and let a wrestler's Specialty-type stat swing the outcome, not just their overall rating.",
      "A Face vs Heel matchup gets a small rating bump for the contrast — booking two of the same alignment against each other is a flatter match.",
    ],
  },
  {
    key: "titles", title: "Titles & Rankings", icon: Award,
    body: [
      "You start with one title and can buy up to 5 more (£25,000 each) as Singles or Tag Team, optionally locked to a weight class or gender.",
      "Once a title has a champion, only a top-3 ranked contender (from your own roster, exclusive or per-use) can challenge for it — vacant titles are open to anyone. Multi-man matches are exempt from the contender rule, since a scramble is a scramble.",
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
      "Eight fictional rival companies compete alongside you — they hire, fire, crown champions, run their own simulated shows with the same ability-driven match ratings you get, and their popularity rises and falls independently. Tap any of them for a closer look at their roster, champion, and tag teams.",
      "Freelancers aren't exclusive to anyone — the same wrestler could realistically get booked by a rival the same week you're eyeing them, so they're not always guaranteed available.",
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
      "Everything happening across the wrestling world — your title changes, rival hires and crownings, injuries, and locker-room rumours (friendships, rivalries, relationships) — lands here. The most recent item also shows as a small icon in the header with a red dot, so you don't have to go looking for it.",
      "Filter by promotion, year, or week to cut through the noise once you've been playing a while.",
    ],
  },
  {
    key: "achievements", title: "Achievements & Hall of Fame", icon: Trophy,
    body: [
      "Achievements (Menu > Achievements) are lifetime — 37 of them, covering company growth, roster building, finance, titles, merchandise, and more. They persist even if you retire and start a fresh promotion; only a full progress wipe clears them.",
      "Hall of Fame (Menu > Hall of Fame) tracks your best-ever match, biggest-ever show, and longest-ever title reign — and shows the best any rival has ever managed in each, side by side, so you can see if anyone's actually beaten you.",
    ],
  },
  {
    key: "backoffice", title: "Back Office & Saving", icon: NotebookPen,
    body: [
      "Back Office (Menu) is where your company name and your own promoter name, age, and sex are edited — kept separate from the day-to-day screens since they're not something you're changing often.",
      "Saves (Menu) has one manual save button plus an automatic save that updates after every show as a safety net — no more juggling numbered slots.",
      "Retire (under Saves) ends your current run on your own terms, files it under Previous Games same as getting fired, and starts you fresh with a new home city to choose. Reset Full Progress, in the same place, wipes everything — including lifetime Achievements and Hall of Fame — and can't be undone.",
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
  const [playerLastTier, setPlayerLastTier] = useState("Unknown");
  const [rivalTitles, setRivalTitles] = useState(() => RIVAL_COMPANIES.map((c) => ({ id: `${c.id}-title`, name: c.titleName, companyId: c.id, holder: _initialChampions[c.id] || null, reignStartWeek: _initialChampions[c.id] ? 1 : null })));
  const [nextReserveIndex, setNextReserveIndex] = useState(0);
  const [nextStaggeredDebutIndex, setNextStaggeredDebutIndex] = useState(0);

  const [tab, setTab] = useState("guide");
  const [companySubTab, setCompanySubTab] = useState("overview");
  const [guideOpenSections, setGuideOpenSections] = useState(() => new Set(["gettingstarted"]));
  const [rosterSubTab, setRosterSubTab] = useState("roster");
  const [wrestlersSubTab, setWrestlersSubTab] = useState("list");
  const [bookSubTab, setBookSubTab] = useState("book");
  const [resultsYearFilter, setResultsYearFilter] = useState("all");
  const [resultsCompanyFilter, setResultsCompanyFilter] = useState("player");
  const [detailWrestler, setDetailWrestler] = useState(null);
  const [expandedResults, setExpandedResults] = useState(() => new Set());
  const [hiringTarget, setHiringTarget] = useState(null);
  const [hireWeeks, setHireWeeks] = useState(26);
  const [hireResult, setHireResult] = useState(null);
  const [extendingTarget, setExtendingTarget] = useState(null);
  const [firingTarget, setFiringTarget] = useState(null);
  const [extendWeeks, setExtendWeeks] = useState(26);
  const [extendResult, setExtendResult] = useState(null);
  const [financeYear, setFinanceYear] = useState(1);
  const [perUseRoster, setPerUseRoster] = useState([]);
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
    availableOnly: false, promotion: "all",
  };
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const resetFilters = () => setFilters(DEFAULT_FILTERS);
  const filtersActive = filters.gender !== "all" || filters.weightClass !== "all" || filters.minOverall > 0 || filters.maxOverall < 100 || filters.minRanking > -100 || filters.maxRanking < 200 || STAT_KEYS.some((k) => filters.stats[k] > 0 || filters.statsMax[k] < 100) || filters.availableOnly || filters.promotion !== "all";
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
    return true;
  };
  const [negotiatingTarget, setNegotiatingTarget] = useState(null);
  const [negotiationOffers, setNegotiationOffers] = useState([]);
  const [negotiationResult, setNegotiationResult] = useState(null);

  const [arenaIdx, setArenaIdx] = useState(0);
  const arena = ARENAS[arenaIdx];
  const [ticketPrice, setTicketPrice] = useState(arena.ticketMin);
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
  // built a following in. One city alone caps out mid-Local; reaching International
  // needs genuine touring, not just repeatedly hammering one home town.
  const cityDiversityCap = Math.min(100, 15 + (visitedCities.length - 1) * 14);
  const rawPopularity = visitedCities.length > 0 ? visitedCities.reduce((s, c) => s + cityPopularity[c], 0) / visitedCities.length : 0;
  const popularity = visitedCities.length > 0 ? Math.round(Math.min(rawPopularity, cityDiversityCap)) : 0;
  const [slots, setSlots] = useState(() => SLOT_DEFS.map((d) => ({ key: d.key, format: "match", type: "singles", team1: [null, null, null, null], team2: [null, null], titleId: null, specialtyId: null })));

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

  const [showHistory, setShowHistory] = useState([]);
  const [rivalShowHistory, setRivalShowHistory] = useState([]);
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
  const [weekCount, setWeekCount] = useState(1);
  const [totalShowsRun, setTotalShowsRun] = useState(0);
  const [totalMatchesRun, setTotalMatchesRun] = useState(0);

  const weekNumber = weekCount;
  const scheduledDate = addWeeks(START_DATE, weekCount - 1);
  const isPPVWeek = weekNumber % PPV_EVERY === 0;
  const currentYear = yearOf(weekNumber);

  const roster = pool.filter((w) => w.contractedTo === "player");
  const avgRosterOverall = roster.length > 0 ? Math.round(roster.reduce((s, w) => s + attrOf(w), 0) / roster.length) : 0;
  const rosterQualityMult =
    roster.length === 0
      ? (TIER_RANK[popularityTier(popularity)] > 0 ? 0.65 : 1) // fine while brand new, real penalty once established
      : roster.length < 5
      ? 1
      : clamp(0.7 + 0.3 * (avgRosterOverall / EXPECTED_ROSTER_OVERALL[popularityTier(popularity)]), 0.6, 1.15);
  const unlockedCities = computeUnlockedCities(cityPopularity, startingCity);
  const perUseWrestlers = pool.filter((w) => w.contractedTo === null && perUseRoster.includes(w.name));
  const bookable = [...roster, ...perUseWrestlers].filter((w) => !w.injuryWeeksRemaining);

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
    setPool((p) => p.map((w) => (w.name === name ? { ...w, pushOverride } : w)));
    setDetailWrestler((d) => (d ? { ...d, pushOverride } : d));
  };

  const hireTierCap = HIRE_TIER_CAP[popularityTier(popularity)];
  const exceedsHireCap = (w) => hireTierCap != null && TIER_ORDER.indexOf(w.tier) > TIER_ORDER.indexOf(hireTierCap);
  const startHiring = (w) => { setHiringTarget(w); setHireWeeks(26); setHireResult(null); };
  const happinessRefusalAdj = (w) => {
    if (w.happiness < 20) return 0.3;
    if (w.happiness < 40) return 0.15;
    if (w.happiness > 85) return -0.08;
    if (w.happiness > 70) return -0.03;
    return 0;
  };

  const confirmHire = () => {
    if (!hiringTarget || exceedsHireCap(hiringTarget)) return;
    const refused = Math.random() < clamp(HIRE_REFUSAL_CHANCE + happinessRefusalAdj(hiringTarget), 0.02, 0.9);
    if (refused) {
      const cooldownWeeks = rand(1, 3);
      setPool((p) => p.map((w) => (w.name === hiringTarget.name ? { ...w, hireCooldownUntil: weekNumber + cooldownWeeks } : w)));
      setHireResult("refused");
      return;
    }
    setPool((p) => p.map((w) => (w.name === hiringTarget.name ? { ...w, contractedTo: "player", contractExpiresWeek: weekNumber + hireWeeks } : w)));
    setPerUseRoster((pu) => pu.filter((n) => n !== hiringTarget.name));
    setUniverseFeed((feed) => [{ id: `h-${weekNumber}-${Date.now()}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has signed ${hiringTarget.name} to an exclusive contract.`, type: "rival", companyId: "player" }, ...feed].slice(0, 300));
    setHireResult("accepted");
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
  };

  const startNegotiating = (w) => {
    setNegotiatingTarget(w);
    setNegotiationOffers(rollPerUseOffers(w));
    setNegotiationResult(null);
  };
  const pickPerUseOffer = (offer) => {
    if (!negotiatingTarget) return;
    const refused = Math.random() < clamp(offer.refusalChance + happinessRefusalAdj(negotiatingTarget), 0.02, 0.95);
    if (refused) {
      const cooldownWeeks = rand(1, 3);
      setPool((p) => p.map((w) => (w.name === negotiatingTarget.name ? { ...w, hireCooldownUntil: weekNumber + cooldownWeeks } : w)));
      setNegotiationResult("refused");
      return;
    }
    setPool((p) => p.map((w) => (w.name === negotiatingTarget.name ? { ...w, perUseFee: offer.fee } : w)));
    setPerUseRoster((pu) => (pu.includes(negotiatingTarget.name) ? pu : [...pu, negotiatingTarget.name]));
    setNegotiationResult("accepted");
  };
  const removePerUse = (name) => setPerUseRoster((pu) => pu.filter((n) => n !== name));

  const startExtending = (w) => { setExtendingTarget(w); setExtendWeeks(26); setExtendResult(null); };
  const confirmExtend = () => {
    if (!extendingTarget) return;
    const refused = Math.random() < clamp(EXTENSION_REFUSAL_CHANCE + happinessRefusalAdj(extendingTarget), 0.02, 0.9);
    if (refused) {
      setExtendResult("refused");
      return;
    }
    setPool((p) => p.map((w) => (w.name === extendingTarget.name ? { ...w, contractExpiresWeek: Math.max(w.contractExpiresWeek, weekNumber) + extendWeeks } : w)));
    setExtendResult("accepted");
  };

  const acceptNetworkOffer = (offer) => {
    setNetworkDeal({ id: offer.id, name: offer.name, payPerViewer: offer.payPerViewer, viewerMult: offer.viewerMult, expiresWeek: weekNumber + offer.weeks });
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
    return bookable
      .filter((w) => !title.holders.includes(w.name) && meetsTitleRestrictions(w, title))
      .map((w) => ({ key: w.name, label: w.name, pts: w.rankingPts }))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, CONTENDER_SLOTS);
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

  const setSlotFormat = (key, format) => {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, format, team1: [s.team1[0], null, null, null], team2: [null, null], titleId: null, specialtyId: null } : s)));
  };
  const setSlotType = (key, type) => {
    setSlots((prev) => prev.map((s) => {
      if (s.key !== key) return s;
      if (type === "triple" || type === "fatal4") {
        return { ...s, type, team1: [s.team1[0], s.team1[1] || null, s.team1[2] || null, s.team1[3] || null], team2: [], titleId: null };
      }
      return { ...s, type, team1: [s.team1[0], type === "tag" ? s.team1[1] : null, null, null], team2: [s.team2[0], type === "tag" ? s.team2[1] : null], titleId: null };
    }));
  };
  const setSlotMember = (key, side, memberIdx, wrestler) => {
    setSlots((prev) => prev.map((s) => {
      if (s.key !== key) return s;
      const team = [...s[side]];
      team[memberIdx] = wrestler;
      // If the primary changes and now belongs to a stable that excludes the current partner, clear the partner.
      if (memberIdx === 0 && team[1]) {
        const stable = wrestler ? stableOf(wrestler.name) : null;
        if (stable && !stable.members.includes(team[1].name)) team[1] = null;
      }
      return { ...s, [side]: team, titleId: null };
    }));
  };
  const setSlotTitle = (key, titleId) => setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, titleId } : s)));
  const setSlotSpecialty = (key, specialtyId) => setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, specialtyId } : s)));

  const usedNames = new Set(slots.flatMap((s) => [...s.team1, ...s.team2]).filter(Boolean).map((w) => w.name));
  const arenaLocked = TIER_RANK[popularityTier(popularity)] < TIER_RANK[arena.minTier];
  const readyToRun = !gameOver && !arenaLocked && slots.some((s) => {
    if (s.format === "segment") return s.team1.filter(Boolean).length > 0;
    if (s.type === "triple") return s.team1.filter(Boolean).length >= 3;
    if (s.type === "fatal4") return s.team1.filter(Boolean).length >= 4;
    return s.team1.filter(Boolean).length > 0 && s.team2.filter(Boolean).length > 0;
  }) && !!city;

  const cityPop = city ? cityPopularity[city] : popularity;
  // Price always thins the crowd (multiplicative, so it matters at any popularity level),
  // and city score raises the ceiling — a high enough score projects close to a sellout
  // even before the ±10% random swing gets applied on the night. Who's actually in the
  // Main Event matters too — real drawing power there swings the crowd up to ±25%.
  const priceFrac = (ticketPrice - arena.ticketMin) / (arena.ticketMax - arena.ticketMin || 1);
  const priceMultiplier = 1 - priceFrac * 0.6; // 1.0 at cheapest, 0.4 at most expensive
  const mainSlotForDraw = slots.find((s) => s.key === "main");
  const mainDrawParticipants = mainSlotForDraw ? [...(mainSlotForDraw.team1 || []).filter(Boolean), ...(mainSlotForDraw.team2 || []).filter(Boolean)] : [];
  const mainDrawAvg = mainDrawParticipants.length ? mainDrawParticipants.reduce((s, w) => s + (w.drawPower ?? 50), 0) / mainDrawParticipants.length : 50;
  const drawFactor = 1 + ((mainDrawAvg - 50) / 100) * 0.5;
  const baseFrac = 0.1 + (cityPop / 100) * 0.85; // 0.1 floor rising to 0.95 ceiling as score climbs
  const demandFrac = Math.max(0.05, Math.min(1, baseFrac * priceMultiplier * drawFactor));
  const projectedAttendance = Math.round(arena.crowdMin + (arena.crowdMax - arena.crowdMin) * demandFrac);

  const runShow = () => {
    setRunning(true);
    setShowResult(null);
    setTimeout(() => {
      const thisShowMatchupKeys = [];
      const matches = slots
        .map((slot) => {
          const def = SLOT_DEFS.find((d) => d.key === slot.key);
          if (slot.format === "segment") {
            const performer = slot.team1[0];
            if (!performer) return null;
            const subject = slot.team2 && slot.team2[0] ? slot.team2[0] : null;
            const chaFloor = Math.round(performer.cha * 0.4);
            const rating = Math.max(chaFloor, Math.min(def.cap, chaFloor + Math.round(Math.random() * (def.cap - chaFloor))));
            return { slotKey: slot.key, slotLabel: def.label, format: "segment", performer, subject, rating, titleInfo: null };
          }
          if (slot.type === "triple" || slot.type === "fatal4") {
            const participants = slot.team1.filter(Boolean);
            const needed = slot.type === "triple" ? 3 : 4;
            if (participants.length < needed) return null;
            // Fatigue-adjusted weighted random winner — everyone's odds scale with
            // their effective strength, but it's not a strict 1v1 coin flip.
            const weights = participants.map((w) => attrOf(w) * (0.6 + 0.4 * (w.eng / 100)));
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            let roll = Math.random() * totalWeight;
            let winnerIdx = 0;
            for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll <= 0) { winnerIdx = i; break; } }
            const winnerTeam = [participants[winnerIdx]];
            const loserTeam = participants.filter((_, i) => i !== winnerIdx);
            const avgAttr = participants.reduce((s, w) => s + attrOf(w), 0) / participants.length;
            const rawFloor = Math.round(avgAttr * 0.25);
            const floor = Math.min(def.cap, rawFloor);
            const spread = Math.min(def.cap - floor, Math.round(20 + avgAttr * 0.55));
            let rating = Math.max(floor, Math.min(def.cap, floor + Math.round(Math.random() * spread) + 3)); // scrambles run a touch hotter
            const specialty = slot.specialtyId ? SPECIALTY_MATCHES.find((s) => s.id === slot.specialtyId) : null;
            if (specialty) rating = Math.min(def.cap, rating + specialty.ratingBonus);
            let titleInfo = null;
            if (slot.titleId) {
              const title = titles.find((t) => t.id === slot.titleId);
              if (title) {
                const winnerNames = winnerTeam.map((w) => w.name);
                const defended = title.holders.length > 0 && title.holders.every((h) => winnerNames.includes(h));
                titleInfo = { id: title.id, name: title.name, label: title.holders.length === 0 ? "New Champion(s)" : defended ? "Title Defended" : "Title Changes Hands!", defended };
              }
            }
            return { slotKey: slot.key, slotLabel: def.label, format: "match", team1: participants, team2: [], winnerTeam, loserTeam, rating, isTag: false, isMultiMan: true, titleInfo, specialty, storyKey: null, stableStoryKey: null, winMethod: pickWinMethod(winnerTeam) };
          }
          const team1 = slot.team1.filter(Boolean);
          const team2 = slot.team2.filter(Boolean);
          if (team1.length === 0 || team2.length === 0) return null;
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

          const specialty = slot.specialtyId ? SPECIALTY_MATCHES.find((s) => s.id === slot.specialtyId) : null;
          let prob1 = attrProb1;
          if (specialty) {
            const spec1 = teamStat(team1, specialty.statKey);
            const spec2 = teamStat(team2, specialty.statKey);
            const specProb1 = spec1 / (spec1 + spec2);
            prob1 = attrProb1 * (1 - SPECIALTY_WEIGHT) + specProb1 * SPECIALTY_WEIGHT;
          }
          const winnerTeam = Math.random() < prob1 ? team1 : team2;
          const loserTeam = winnerTeam === team1 ? team2 : team1;
          const rawFloor = Math.round(((effAttr1 + effAttr2) / 2) * 0.25);
          const floor = Math.min(def.cap, rawFloor);
          const avgEffAttr = (effAttr1 + effAttr2) / 2;
          const spread = Math.min(def.cap - floor, Math.round(20 + avgEffAttr * 0.55));
          let rating = Math.max(floor, Math.min(def.cap, floor + Math.round(Math.random() * spread)));
          if (specialty) rating = Math.min(def.cap, rating + specialty.ratingBonus);
          // A clean Face vs Heel dynamic tells a better story than two of the same.
          const aligns1 = new Set(team1.map((w) => w.alignment));
          const aligns2 = new Set(team2.map((w) => w.alignment));
          if (aligns1.size === 1 && aligns2.size === 1 && [...aligns1][0] !== [...aligns2][0]) {
            rating = Math.min(def.cap, rating + 4);
          }

          // A booked-in rivalry pays off with a rating bump scaled to how heated it's gotten.
          let storyKey = null;
          if (team1.length === 1 && team2.length === 1 && team1[0].rivals.includes(team2[0].name) && team2[0].rivals.includes(team1[0].name)) {
            storyKey = [team1[0].name, team2[0].name].sort().join("|");
            const existing = storylines[storyKey] || { intensity: 20, matchesFought: 0 };
            rating = Math.min(def.cap, rating + Math.round(existing.intensity / 10));
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
          thisShowMatchupKeys.push(matchupKey);

          let stableStoryKey = null;
          if (team1.length === 2 && team2.length === 2) {
            const s1 = stables.find((s) => s.members.length >= 2 && team1.every((w) => [s.members[0], s.members[1]].includes(w.name)));
            const s2 = stables.find((s) => s.members.length >= 2 && team2.every((w) => [s.members[0], s.members[1]].includes(w.name)));
            if (s1 && s2 && (s1.rivalStableIds || []).includes(s2.id) && (s2.rivalStableIds || []).includes(s1.id)) {
              stableStoryKey = [s1.id, s2.id].sort().join("|");
              const existing = stableStorylines[stableStoryKey] || { intensity: 20, matchesFought: 0 };
              rating = Math.min(def.cap, rating + Math.round(existing.intensity / 10));
            }
          }

          let titleInfo = null;
          if (slot.titleId) {
            const title = titles.find((t) => t.id === slot.titleId);
            if (title) {
              const winnerNames = winnerTeam.map((w) => w.name).sort();
              const currentHolders = [...title.holders].sort();
              const defended = title.holders.length > 0 && winnerNames.length === currentHolders.length && winnerNames.every((n, i) => n === currentHolders[i]);
              titleInfo = { id: title.id, name: title.name, label: title.holders.length === 0 ? "New Champion(s)" : defended ? "Title Defended" : "Title Changes Hands!", defended };
            }
          }
          return { slotKey: slot.key, slotLabel: def.label, format: "match", team1, team2, winnerTeam, loserTeam, rating, isTag: slot.type === "tag", titleInfo, specialty, storyKey, stableStoryKey, winMethod: pickWinMethod(winnerTeam) };
        })
        .filter(Boolean);

      const attendance = Math.max(0, Math.round(projectedAttendance * (0.9 + Math.random() * 0.2)));
      const revenue = attendance * ticketPrice;
      // Exclusive roster is billed a standing weekly wage regardless of whether they're
      // on this week's card. Per-use freelancers only cost their fee when actually booked.
      const payroll = roster.reduce((sum, w) => sum + weeklyWage(w), 0);
      const freelancersUsed = new Set(
        matches.flatMap((m) => (m.format === "segment" ? [m.performer] : [...m.team1, ...m.team2])).filter((w) => w.contractedTo === null).map((w) => w.name)
      );
      const freelanceCost = pool.filter((w) => freelancersUsed.has(w.name)).reduce((sum, w) => sum + (w.perUseFee ?? baseFreelanceFee(w)), 0);
      const wrestlerPay = payroll + freelanceCost;
      const news = NEWS_EVENTS[rand(0, NEWS_EVENTS.length - 1)];
      const specialtyCost = matches.reduce((s, m) => s + (m.specialty ? m.specialty.cost : 0), 0);

      // TV network pays per estimated viewer; sponsor pays a flat weekly fee. Both
      // lapse automatically once their deal's week count runs out.
      const networkActive = networkDeal && weekNumber < networkDeal.expiresWeek;
      const networkViewers = networkActive ? Math.round(popularity * networkDeal.viewerMult) : 0;
      const networkIncome = networkActive ? Math.round(networkViewers * networkDeal.payPerViewer) : 0;
      const sponsorActive = sponsorDeal && weekNumber < sponsorDeal.expiresWeek;
      const sponsorIncome = sponsorActive ? sponsorDeal.weeklyPay : 0;

      const loanPayment = loan ? loan.weeklyPayment : 0;
      let profit = revenue - arena.cost - wrestlerPay - specialtyCost - loanPayment + news.amount + networkIncome + sponsorIncome;
      const matchLikeRatings = matches.map((m) => m.rating);
      let fullRating = matchLikeRatings.length ? Math.round(matchLikeRatings.reduce((s, r) => s + r, 0) / matchLikeRatings.length) : 0;

      // Once you're big enough, fans expect a full card — an incomplete show at
      // National level or above costs you both rating and revenue.
      const missingSlots = SLOT_DEFS.length - matches.length;
      let underbookedPenaltyNote = null;
      if (missingSlots > 0 && TIER_RANK[popularityTier(popularity)] >= TIER_RANK.National) {
        const ratingHit = missingSlots * 8;
        const cashHit = missingSlots * 750;
        fullRating = Math.max(0, fullRating - ratingHit);
        profit -= cashHit;
        underbookedPenaltyNote = `Fans expected a full card at your level — ${missingSlots} empty slot${missingSlots === 1 ? "" : "s"} cost you £${cashHit.toLocaleString()} and knocked the show rating down.`;
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
      if (Math.random() < CATASTROPHE_CHANCE && bank > 0) {
        const severity = CATASTROPHE_SEVERITIES[rand(0, CATASTROPHE_SEVERITIES.length - 1)];
        const hit = Math.round(bank * severity);
        const reason = CATASTROPHE_REASONS[rand(0, CATASTROPHE_REASONS.length - 1)].replace("{company}", companyName);
        profit -= hit;
        catastropheEntry = { text: `${reason} — a loss of £${hit.toLocaleString()} (${Math.round(severity * 100)}% of company funds).`, hit };
        setHasSurvivedCatastrophe(true);
      }

      setBank((b) => b + profit);
      const newBank = bank + profit;
      if (loan) {
        const remaining = loan.weeksRemaining - 1;
        if (remaining <= 0) {
          setLoan(null);
          setHasEverRepaidLoanFully(true);
          setUniverseFeed((feed) => [{ id: `loan-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${companyName} has paid off its loan in full.`, type: "title", companyId: "player" }, ...feed].slice(0, 300));
        } else {
          setLoan((l) => (l ? { ...l, weeksRemaining: remaining } : null));
        }
      }
      if (newBank < 0) {
        setBankruptWeeks((n) => {
          const next = n + 1;
          if (next >= FIRED_THRESHOLD) setGameOver(true);
          return next;
        });
      } else {
        setBankruptWeeks(0);
      }
      setPeakPopularity((p) => Math.max(p, popularity));
      // Growth gets harder the more established a city already is — running shows
      // always gives a small baseline bump (any exposure helps), but a big swing
      // from a great rating gets dampened once you're already popular there.
      const rawCityDelta = 1 + (fullRating - 35) * 0.08 + (networkActive ? NETWORK_POPULARITY_BOOST : 0);
      const growthScale = rawCityDelta > 0 ? clamp(1 - Math.floor(cityPopularity[city] / 10) * 0.07, 0.3, 1) * rosterQualityMult : 1;
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
      const vacatedByInactivity = [];
      setTitles((ts) => ts.map((t) => {
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
      }));
      if (vacatedByInactivity.length > 0) {
        setUniverseFeed((feed) => [...vacatedByInactivity.map((v, i) => ({ id: `vac-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: `The ${v.name} has been vacated — ${v.holders.join(" & ")} went too long without defending it.`, type: "title", companyId: "player" })), ...feed].slice(0, 300));
      }
      if (titleNewsEntries.length > 0) {
        setUniverseFeed((feed) => [...titleNewsEntries.map((text, i) => ({ id: `t-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text, type: "title", companyId: "player" })), ...feed].slice(0, 300));
      }

      // Hall of Fame — lifetime records, survive retiring and starting a new
      // promotion. Kept deliberately small: best match, biggest show, longest
      // reign, most reigns by one wrestler. Not trying to be a full stat archive.
      const bestMatchCandidate = matches.filter((m) => m.format === "match").sort((a, b) => b.rating - a.rating)[0];
      if (bestMatchCandidate && bestMatchCandidate.rating > (hallOfFame.bestMatch?.rating ?? -1)) {
        const names = [...bestMatchCandidate.team1, ...(bestMatchCandidate.team2 || [])].map((w) => w.name).join(" vs ");
        setHallOfFame((h) => ({ ...h, bestMatch: { rating: bestMatchCandidate.rating, description: names, companyName, date: scheduledDate.toISOString() } }));
      }
      if (attendance > (hallOfFame.biggestShow?.attendance ?? -1)) {
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
      const segmentNewsEntries = [];
      const segmentStoryUpdates = {};
      const segmentNewRivalNames = []; // [performerName, subjectName] pairs to add to each other's rivals
      matches.forEach((m) => {
        if (m.format !== "segment" || !m.subject) return;
        const key = [m.performer.name, m.subject.name].sort().join("|");
        const alreadyRivals = m.performer.rivals.includes(m.subject.name) && m.subject.rivals.includes(m.performer.name);
        if (alreadyRivals) {
          const existing = storylines[key] || { intensity: 20, matchesFought: 0 };
          segmentStoryUpdates[key] = { intensity: clamp(existing.intensity + 5, 0, 100), matchesFought: existing.matchesFought };
          segmentNewsEntries.push(`${m.performer.name} calls out ${m.subject.name} on the mic, keeping the rivalry hot.`);
        } else {
          segmentNewRivalNames.push([m.performer.name, m.subject.name]);
          segmentStoryUpdates[key] = { intensity: 15, matchesFought: 0 };
          segmentNewsEntries.push(`${m.performer.name} calls out ${m.subject.name}, sparking a new rivalry.`);
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

      const rivalNewsEntries = [];
      const rivalPoolUpdates = {};
      const rivalTitleUpdates = {};
      // Computed as a plain loop first, not inside setRivalCompanies — mutating
      // outer variables as a side effect of a state updater isn't reliable, since
      // React doesn't guarantee exactly when that function body runs relative to
      // the code right after it. This was very likely why hiring/crowning silently
      // failed to apply even though showsRun kept climbing.
      const newRivalCompanies = rivalCompanies.map((co) => {
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
        let newFunds = clamp(co.funds + weeklyIncome - weeklyPayroll, 0, 5000000);
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
        const newTier = popularityTier(newPop);
        if (newTier !== co.lastTier) {
          rivalNewsEntries.push({ text: `${co.name} has ${TIER_RANK[newTier] > TIER_RANK[co.lastTier] ? "grown" : "shrunk"} to ${newTier} status!`, companyId: co.id });
        }
        return { ...co, popularity: newPop, funds: newFunds, showsRun: co.showsRun + 1, lastTier: newTier };
      });
      setRivalCompanies(newRivalCompanies);
      if (Object.keys(rivalPoolUpdates).length > 0) setPool((p) => p.map((w) => (rivalPoolUpdates[w.name] ? { ...w, ...rivalPoolUpdates[w.name] } : w)));
      const rivalReignCandidates = [];
      if (Object.keys(rivalTitleUpdates).length > 0) {
        setRivalTitles((ts) => ts.map((t) => {
          if (!(t.id in rivalTitleUpdates)) return t;
          const newHolder = rivalTitleUpdates[t.id];
          if (newHolder === t.holder) return t; // retained, reign continues unbroken
          if (t.holder && t.reignStartWeek !== null) {
            rivalReignCandidates.push({ titleName: t.name, holderNames: [t.holder], weeks: weekNumber - t.reignStartWeek, companyName: RIVAL_COMPANIES.find((c) => c.id === t.companyId)?.name || t.name });
          }
          return { ...t, holder: newHolder, reignStartWeek: newHolder ? weekNumber : null };
        }));
      }
      if (rivalNewsEntries.length > 0) {
        setUniverseFeed((feed) => [...rivalNewsEntries.map((e, i) => ({ id: `rv-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: e.text, type: "rival", companyId: e.companyId })), ...feed].slice(0, 300));
      }

      // Hall of Fame — best-ever seen from any rival company, tracked the same
      // way as your own, so the page can show whether anyone's beaten you.
      rivalReignCandidates.forEach((rc) => {
        setHallOfFame((h) => (rc.weeks > (h.longestReignRival?.weeks ?? -1) ? { ...h, longestReignRival: rc } : h));
      });
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

      // Clear deals once they lapse, and occasionally roll fresh offers when you're not under contract.
      if (networkDeal && weekNumber >= networkDeal.expiresWeek) setNetworkDeal(null);
      if (sponsorDeal && weekNumber >= sponsorDeal.expiresWeek) setSponsorDeal(null);
      const dealPopularity = clamp(popularity + (fullRating - 50) * 0.1, 0, 100); // use this show's freshly-updated popularity feel
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
      const rivalShowUsage = new Set();
      const rivalMatchOutcomes = {};
      const rivalFreelanceBookings = {}; // wrestler name -> company id that booked them this week
      const takenFreelancers = new Set(freelancersUsed);
      const newRivalShowRecords = [];
      rivalCompanies.forEach((co) => {
        const signedRoster = pool.filter((w) => w.contractedTo === co.id && !w.injuryWeeksRemaining && !rivalPoolUpdates[w.name]);
        const availableFreelancers = pool.filter((w) => w.contractedTo === null && !w.injuryWeeksRemaining && !rivalPoolUpdates[w.name] && !takenFreelancers.has(w.name));
        let freelancePicks = [];
        if (availableFreelancers.length > 0 && Math.random() < 0.4) {
          freelancePicks = [...availableFreelancers].sort(() => Math.random() - 0.5).slice(0, Math.min(availableFreelancers.length, rand(1, 2)));
          freelancePicks.forEach((w) => { takenFreelancers.add(w.name); rivalFreelanceBookings[w.name] = co.id; });
        }
        const combined = [...signedRoster, ...freelancePicks];
        if (combined.length >= 2 && Math.random() < RIVAL_SHOW_CHANCE) {
          const shuffled = [...combined].sort(() => Math.random() - 0.5);
          const pairCount = Math.min(Math.floor(shuffled.length / 2), rand(1, 2));
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
            const rivalRating = Math.max(rivalFloor, Math.min(100, rivalFloor + Math.round(Math.random() * rivalSpread)));
            showMatches.push({ a: a.name, b: b.name, winner: aWins ? a.name : b.name, rating: rivalRating });
          }
          if (showMatches.length > 0) {
            const rivalAttendance = Math.max(20, Math.round(co.popularity * 40 + rand(-500, 1500)));
            newRivalShowRecords.push({ id: `${co.id}-${weekNumber}`, companyId: co.id, companyName: co.name, weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), date: scheduledDate, matches: showMatches, attendance: rivalAttendance });
          }
        }
      });
      if (newRivalShowRecords.length > 0) {
        setRivalShowHistory((h) => [...newRivalShowRecords, ...h].slice(0, 150));
      }

      let poolWithGrowth = null;
      if (weekNumber % 25 === 0 && nextReserveIndex + 1 < RESERVE_NAMES.length) {
        const n1 = RESERVE_NAMES[nextReserveIndex], n2 = RESERVE_NAMES[nextReserveIndex + 1];
        poolWithGrowth = [makeWrestler(n1), makeWrestler(n2)];
        setNextReserveIndex((i) => i + 2);
        setUniverseFeed((feed) => [{ id: `g-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${n1} and ${n2} have entered the wrestling scene as free agents.`, type: "rumor" }, ...feed].slice(0, 300));
      }
      if (weekNumber % 4 === 0 && nextStaggeredDebutIndex < STAGGERED_DEBUT_DATA.length) {
        const d = STAGGERED_DEBUT_DATA[nextStaggeredDebutIndex];
        const debutWrestler = makeWrestlerFromOverall(d.name, d.overall, { age: d.age, sex: d.gender, weightClass: d.weightClass, alignment: d.alignment });
        poolWithGrowth = [...(poolWithGrowth || []), debutWrestler];
        setNextStaggeredDebutIndex((i) => i + 1);
        setUniverseFeed((feed) => [{ id: `debut-${weekNumber}`, showNumber: weekNumber, date: scheduledDate, text: `${d.name} has made their debut, entering the wrestling scene as a free agent.`, type: "rumor" }, ...feed].slice(0, 300));
      }

      // Segment performers get a small permanent charisma bump reflecting improved mic skills.
      const segmentBumps = {};
      matches.forEach((m) => { if (m.format === "segment") segmentBumps[m.performer.name] = Math.max(1, Math.round(m.rating / 30)); });

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
        return stillOpen;
      });
      if (brokenNewsEntries.length > 0) {
        setUniverseFeed((feed) => [...brokenNewsEntries.map((text, i) => ({ id: `bp-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text, type: "injury", companyId: "player" })), ...feed].slice(0, 300));
      }
      const brokenNames = new Set(); // filled below once we know which requests just broke
      // (re-derive from the pre-sweep list so we can dock happiness in the same pool pass)
      requests.forEach((r) => { if (r.status === "promised" && weekNumber > r.deadlineWeek) brokenNames.add(r.wrestlerName); });

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
          const rt = REQUEST_TYPES[rand(0, REQUEST_TYPES.length - 1)];
          if (rt.type === "match") {
            const useFreelancer = Math.random() < 0.3;
            const freelancerPool = pool.filter((x) => x.contractedTo === null && x.name !== w.name && !bookable.some((b) => b.name === x.name));
            const candidates = (useFreelancer && freelancerPool.length > 0) ? freelancerPool : bookable.filter((x) => x.name !== w.name);
            if (candidates.length > 0) {
              const target = candidates[rand(0, candidates.length - 1)];
              newRequests.push({ id: `req-${weekNumber}-${w.name}`, wrestlerName: w.name, type: "match", targetName: target.name, text: `${w.name} wants a match against ${target.name}${!bookable.some((b) => b.name === target.name) ? " — you'll need to sign them first" : ""}.`, weekMade: weekNumber, deadlineWeek: null, status: "pending" });
            }
          } else {
            newRequests.push({ id: `req-${weekNumber}-${w.name}`, wrestlerName: w.name, type: rt.type, text: rt.text(w), weekMade: weekNumber, deadlineWeek: null, status: "pending" });
          }
        }
      });
      if (newRequests.length > 0) setRequests((rs) => [...rs, ...newRequests]);

      // A few things happen across the wrestling world every week, regardless of
      // whether they touch your own card — drawn from the whole pool, not just
      // this week's participants.
      const rosterNewsEntries = [];
      const rosterEventUpdates = {};
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

      const injuryNewsEntries = [];
      const newlyInjuredNames = []; // wrestler names injured this tick, any title they hold gets vacated below
      setPool((p) => {
        let next = p.map((w) => {
          const inMatch = matches.find((mm) => mm.format === "match" && (mm.team1.some((x) => x.name === w.name) || mm.team2.some((x) => x.name === w.name)));
          const segmentObj = matches.find((mm) => mm.format === "segment" && mm.performer.name === w.name);
          let withTitle = applyTitleChanges(w);
          withTitle = clearRivalry(withTitle);
          if (withTitle.contractedTo && withTitle.contractExpiresWeek !== null && withTitle.contractExpiresWeek <= weekNumber) {
            withTitle = { ...withTitle, contractedTo: null, contractExpiresWeek: null };
          }
          if (segmentBumps[w.name]) withTitle = { ...withTitle, cha: clamp(withTitle.cha + segmentBumps[w.name], 0, 100) };
          const evt = rosterEventUpdates[w.name];
          if (evt) {
            if (evt.partner) withTitle = { ...withTitle, partner: evt.partner };
            if (evt.addFriend) withTitle = { ...withTitle, friends: [...new Set([...withTitle.friends, evt.addFriend])] };
            if (evt.addRival) withTitle = { ...withTitle, rivals: [...new Set([...withTitle.rivals, evt.addRival])] };
          }

          let updated = withTitle;
          if (inMatch) {
            const won = inMatch.winnerTeam.some((x) => x.name === w.name);
            updated = { ...updated, matches: updated.matches + 1, wins: updated.wins + (won ? 1 : 0), losses: updated.losses + (won ? 0 : 1), rankingPts: clamp(updated.rankingPts + (won ? 5 : -3), -50, 150), happiness: clamp(updated.happiness + (won ? 1 : -2), 0, 100) };
            // A win teaches you something — small, slow, tied to how it was won.
            // Pinfalls sharpen offense, submissions sharpen technical ability.
            if (won && Math.random() < 0.15) {
              const growStat = inMatch.winMethod === "Submission" ? "sub" : inMatch.winMethod === "Pinfall" ? "atk" : null;
              if (growStat) updated = { ...updated, [growStat]: clamp(updated[growStat] + 1, 0, 100) };
            }
            // Drawing power — grows from winning, from a genuinely good match, and
            // especially from title moments. This is what actually fills seats.
            const drawDelta = (won ? 0.6 : 0.1) + (inMatch.rating > 70 ? 0.8 : 0) + (inMatch.titleInfo ? 1 : 0);
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
            const delta = inMatch.specialty ? rand(ENERGY_LOSS_SPECIALTY[0], ENERGY_LOSS_SPECIALTY[1]) : rand(ENERGY_LOSS_MATCH[0], ENERGY_LOSS_MATCH[1]);
            eng = clamp(eng - delta, 0, 100);
            if (eng < INJURY_ENERGY_THRESHOLD && Math.random() < INJURY_CHANCE) {
              const injuryPick = pickInjuryType();
              injuryWeeksRemaining = Math.max(1, Math.round(rand(INJURY_WEEKS_MIN, INJURY_WEEKS_MAX) * injuryPick.weeksMult));
              injuryType = injuryPick.name;
              injuryNewsEntries.push({ text: `${w.name} has suffered a ${injuryPick.name.toLowerCase()} injury and is expected to be out for ${injuryWeeksRemaining} weeks.`, companyId: updated.contractedTo });
              newlyInjuredNames.push(w.name);
              justInjured = true;
            }
          } else if (segmentObj) {
            eng = clamp(eng + rand(ENERGY_CHANGE_SEGMENT[0], ENERGY_CHANGE_SEGMENT[1]), 0, 100);
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
          if (weekNumber % WEEKS_PER_YEAR === 0) {
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
          }
          return aged;
        });
        if (poolWithGrowth) next = [...next, ...poolWithGrowth];
        return next;
      });
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
          setPool((p) => p.map((w) => (vacatedPlayerTitles.some((t) => t.holders.includes(w.name)) ? { ...w, holdsTitles: w.holdsTitles.filter((id) => !vacatedPlayerTitles.some((t) => t.id === id)) } : w)));
          setUniverseFeed((feed) => [...vacatedPlayerTitles.map((t, i) => ({ id: `vac-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: `${t.holders.join(" & ")} forced to vacate the ${t.name} due to injury.`, type: "injury", companyId: "player" })), ...feed].slice(0, 300));
        }
        const vacatedRivalTitles = rivalTitles.filter((t) => t.holder && newlyInjuredNames.includes(t.holder));
        if (vacatedRivalTitles.length > 0) {
          setRivalTitles((ts) => ts.map((t) => (vacatedRivalTitles.some((v) => v.id === t.id) ? { ...t, holder: null } : t)));
          setUniverseFeed((feed) => [...vacatedRivalTitles.map((t, i) => ({ id: `rvac-${weekNumber}-${i}`, showNumber: weekNumber, date: scheduledDate, text: `The ${t.name} has been vacated due to injury.`, type: "injury", companyId: t.companyId })), ...feed].slice(0, 300));
        }
      }

      const record = { id: weekNumber, showNumber: weekNumber, year: currentYear, weekOfYear: weekOfYear(weekNumber), date: scheduledDate, wasPPV: arena.name === "Major Arena", matches, attendance, revenue, wrestlerPay, specialtyCost, loanPayment, networkIncome, sponsorIncome, merchUnitsSold, merchRevenue, merchMissedUnits, merchTheftUnits, catastrophe: catastropheEntry, underbookedPenaltyNote, profit, news, fullRating, arena: arena.name, ticketPrice, city };
      setShowHistory((h) => [record, ...h].slice(0, 60));
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
      // Achievement-relevant records from this show — matches array is already
      // fresh/local here, so these can be set directly rather than via effect.
      if (slots.some((s) => s.type === "fatal4")) setBookedFatal4Ever(true);
      if (slots.some((s) => s.specialtyId === "cage")) setBookedCageEver(true);
      setMaxAttendanceEver((prev) => Math.max(prev, attendance));
      setMaxShowRatingEver((prev) => Math.max(prev, fullRating));
      if (attendance >= arena.crowdMax) setHasSoldOutEver(true);
      setWeekCount((w) => w + 1);
      setTotalShowsRun((n) => n + 1);
      setTotalMatchesRun((n) => n + matches.filter((m) => m.format === "match").length);
      setShowResult(record);

      setRunning(false);
    }, 1200);
  };

  const resetShow = () => {
    setSlots(SLOT_DEFS.map((d) => ({ key: d.key, format: "match", type: "singles", team1: [null, null, null, null], team2: [null, null], titleId: null, specialtyId: null })));
    setShowResult(null);
    setCity(null);
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
        if (m.format === "segment") return { ...m, performer: { name: m.performer.name } };
        const t1 = m.team1.map((w) => ({ name: w.name }));
        const t2 = m.team2.map((w) => ({ name: w.name }));
        const winnerTeam = m.winnerTeam === m.team1 ? t1 : t2;
        const loserTeam = winnerTeam === t1 ? t2 : t1;
        return { ...m, team1: t1, team2: t2, winnerTeam, loserTeam };
      }),
    })),
    financeHistory: financeHistory.slice(-300),
    universeFeed: universeFeed.slice(0, 150),
    storylines, stableStorylines, stables,
    networkDeal, networkOffers, sponsorDeal, sponsorOffers,
    bankruptWeeks, peakPopularity, loan, requests, playerLastTier, notes,
    unlockedAchievements, hasEverTakenLoan, hasEverRepaidLoanFully, hasSurvivedCatastrophe,
    hasBeenFired, hasRetiredOnce, hasCreatedStableManually, hasCreatedRivalryManually,
    hasRenamedWrestler, bookedFatal4Ever, bookedCageEver, maxAttendanceEver, hasSoldOutEver, maxShowRatingEver,
    hallOfFame, wrestlerReignCounts, merchStock, merchQualityTier, wrestlerMerchSales, recentMatchups,
  });

  const applySaveSnapshot = (s) => {
    setBank(s.bank ?? 20000); setWeekCount(s.weekCount ?? 1); setTotalShowsRun(s.totalShowsRun ?? 0); setTotalMatchesRun(s.totalMatchesRun ?? 0);
    setCompanyName(s.companyName || "Ringside Empire Wrestling"); setPlayerName(s.playerName || ""); setPlayerAge(s.playerAge || ""); setPlayerSex(s.playerSex || "");
    setCityPopularity(s.cityPopularity || Object.fromEntries(CITIES.map((c) => [c, 0])));
    setStartingCity(s.startingCity || null);
    setCityVisits(s.cityVisits || Object.fromEntries(CITIES.map((c) => [c, 0])));
    setPool(s.pool || buildInitialPool());
    setRivalCompanies(s.rivalCompanies || RIVAL_COMPANIES.map((c, i) => ({ ...c, funds: RIVAL_STARTING_FUNDS[i] ?? 25000, showsRun: 0, lastTier: popularityTier(c.popularity) })));
    setRivalTitles(s.rivalTitles || RIVAL_COMPANIES.map((c) => ({ id: `${c.id}-title`, name: c.titleName, companyId: c.id, holder: null })));
    setNextReserveIndex(s.nextReserveIndex ?? 0);
    setNextStaggeredDebutIndex(s.nextStaggeredDebutIndex ?? 0);
    setPerUseRoster(s.perUseRoster || []);
    setTitles(s.titles || [{ id: "world", name: "World Championship", type: "singles", holders: [], reignStartWeek: null, totalDefenses: 0, currentReignDefenses: 0, prestige: 0, history: [] }]);
    // Dates survive JSON as strings, not Date objects — rebuild them so formatDate() still works.
    setShowHistory((s.showHistory || []).map((r) => ({ ...r, date: new Date(r.date) })));
    setFinanceHistory(s.financeHistory || [{ weekNumber: 0, year: 1, weekOfYear: 0, bank: s.bank ?? 20000 }]);
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
    setHasRenamedWrestler(!!s.hasRenamedWrestler); setBookedFatal4Ever(!!s.bookedFatal4Ever); setBookedCageEver(!!s.bookedCageEver);
    setMaxAttendanceEver(s.maxAttendanceEver || 0); setHasSoldOutEver(!!s.hasSoldOutEver); setMaxShowRatingEver(s.maxShowRatingEver || 0);
    setHallOfFame(s.hallOfFame || { bestMatch: null, biggestShow: null, longestReign: null, bestMatchRival: null, biggestShowRival: null, longestReignRival: null });
    setWrestlerReignCounts(s.wrestlerReignCounts || {});
    setMerchStock(s.merchStock || 0); setMerchQualityTier(s.merchQualityTier || 0); setWrestlerMerchSales(s.wrestlerMerchSales || {});
    setRecentMatchups(s.recentMatchups || []);
    setArenaIdx(1); setCity(null);
    setSlots(SLOT_DEFS.map((d) => ({ key: d.key, format: "match", type: "singles", team1: [null, null, null, null], team2: [null, null], titleId: null, specialtyId: null })));
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

  useEffect(() => {
    // weekCount only advances once a show has actually been run — skips the
    // initial mount (weekCount === 1) so we don't autosave an empty new game.
    if (weekCount > 1) autoSaveGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekCount]);

  const checkAchievements = () => {
    const ctx = {
      tier: popularityTier(popularity), avgRosterOverall, rosterCount: roster.length, roster,
      companyName, playerName, hasRenamedWrestler, titles, bank, weekCount,
      hasCreatedStableManually, hasCreatedRivalryManually,
      hasEverTakenLoan, hasEverRepaidLoanFully, hasSurvivedCatastrophe, hasBeenFired, hasRetiredOnce,
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
    setNextReserveIndex(0);
    setNextStaggeredDebutIndex(0);
    setPerUseRoster([]);
    setTitles([{ id: "world", name: "World Championship", type: "singles", holders: [], reignStartWeek: null, totalDefenses: 0, currentReignDefenses: 0, prestige: 0, history: [] }]);
    setShowHistory([]);
    setRivalShowHistory([]);
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
    setCity(null);
    setStartingCity(null);
    setMerchStock(0); setMerchQualityTier(0); setWrestlerMerchSales({});
    setRecentMatchups([]);
    setSlots(SLOT_DEFS.map((d) => ({ key: d.key, format: "match", type: "singles", team1: [null, null, null, null], team2: [null, null], titleId: null, specialtyId: null })));
    setNotes("");
    setTab("company");
    setGameOver(false);
  };

  const yearsAvailable = [...new Set(financeHistory.map((f) => f.year))];
  const financeChartData = financeHistory.filter((f) => f.year === financeYear);

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

  return (
    <div
      className="min-h-full w-full text-[#F2ECDD] p-3 sm:p-6"
      style={{
        color: "#F2ECDD",
        background: `
          radial-gradient(ellipse 100% 65% at 20% -5%, rgba(91,59,140,0.65), transparent 65%),
          radial-gradient(ellipse 80% 60% at 100% 15%, rgba(139,107,192,0.45), transparent 65%),
          radial-gradient(ellipse 110% 75% at 50% 115%, rgba(91,59,140,0.55), transparent 70%),
          linear-gradient(180deg, rgba(58,34,101,0.35), rgba(10,10,12,0.1) 55%),
          #0A0A0C
        `,
        backgroundAttachment: "fixed",
      }}
    >
      <style>{FONT_IMPORT}</style>
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
            <div className="text-[10px] text-[#8B8593] mb-3">Offers are re-rolled fresh each time. A lower fee is more likely to be turned down.</div>
            {negotiationResult === "refused" && <div className="text-xs text-red-400 mb-3">{negotiatingTarget.name} turned that down. They're off-limits for a few weeks.</div>}
            {negotiationResult === "accepted" && <div className="text-xs text-[#8B6BC0] mb-3">Deal struck! Added to your per-use roster.</div>}
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

      <div className="max-w-4xl mx-auto mb-4 sm:mb-6 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-2xl sm:text-3xl tracking-tight leading-none" style={{ fontFamily: "Anton, sans-serif" }}>
              BOOKED<span className="text-[#8B6BC0]">!</span>
            </div>
            <div className="text-[9px] sm:text-[10px] tracking-[0.3em] text-[#8B8593] font-semibold">RINGSIDE EMPIRE</div>
          </div>
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
          <div className="flex items-center gap-1.5 bg-[#17151C] border border-[#2B2733] rounded-lg px-3 py-2 text-[11px]">
            <Calendar size={14} className="text-[#8B6BC0]" />
            <span className="font-bold">Y{currentYear} &middot; Wk {weekOfYear(weekNumber)}</span>
            {isPPVWeek && <span className="text-[#8B6BC0] font-bold ml-1">PPV</span>}
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

      <div className="max-w-4xl mx-auto pt-5">
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
                    <div className="bg-[#131117] rounded-lg p-3 col-span-2">
                      <div className="text-[9px] text-[#8B8593] tracking-wide mb-0.5">TITLES IN COMPANY</div>
                      <div className="font-black text-lg">{titles.length}</div>
                    </div>
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
            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold">EXCLUSIVE ({roster.length})</div>
                {roster.length > 0 && <div className="text-[10px] text-[#8B8593]">Avg. Overall: <span className="text-[#F2ECDD] font-bold">{avgRosterOverall}</span> <span className="opacity-70">(expect ~{EXPECTED_ROSTER_OVERALL[popularityTier(popularity)]}+ at {popularityTier(popularity)})</span>{roster.length < 5 && <span className="opacity-70"> — doesn't affect growth until 5 signed ({roster.length}/5)</span>}</div>}
              </div>
              <div className="text-[10px] text-[#8B8593] mb-3">Billed a standing weekly wage, available every show, guaranteed — no per-appearance fee.</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {roster.map((w) => (
                  <div key={w.name} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3">
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
                    <button onClick={() => startExtending(w)} className="mt-2 text-[10px] font-bold text-[#8B6BC0] hover:text-[#F2ECDD]">Extend contract</button>
                  </div>
                ))}
                {roster.length === 0 && <div className="text-xs text-[#8B8593] italic">No wrestlers signed exclusively yet.</div>}
              </div>
            </div>

            <div>
              <div className="text-[11px] tracking-widest text-[#8B8593] font-bold mb-1">PER-USE ({perUseWrestlers.length})</div>
              <div className="text-[10px] text-[#8B8593] mb-3">Your regular freelance picks — stay bookable every week, but cost a fee whenever you actually use them.</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {perUseWrestlers.map((w) => (
                  <div key={w.name} className="bg-[#131117] border border-[#2B2733] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <button onClick={() => setDetailWrestler(w)} className="font-black text-sm text-left" style={{ fontFamily: "Anton, sans-serif" }}>{w.name.toUpperCase()}</button>
                      <span onClick={() => removePerUse(w.name)} className="text-[#8B8593] hover:text-[#F2ECDD] p-0.5 cursor-pointer"><X size={14} /></span>
                    </div>
                    <div className="text-[10px] text-[#8B6BC0] font-semibold mb-1">OVR {Math.round(attrOf(w))} &middot; {w.sex} &middot; {w.wins}-{w.losses}{w.injuryWeeksRemaining && <span className="text-red-400"> &middot; {w.injuryType ? `${w.injuryType.toUpperCase()} ` : ""}INJURED ({w.injuryWeeksRemaining}wk)</span>}</div>
                    <div className="text-[10px] text-[#8B8593]">£{(w.perUseFee ?? baseFreelanceFee(w)).toLocaleString()}/show when booked</div>
                  </div>
                ))}
                {perUseWrestlers.length === 0 && <div className="text-xs text-[#8B8593] italic">None yet — add freelancers from the Wrestlers tab.</div>}
              </div>
            </div>
              </div>
            )}

            {rosterSubTab === "rivalries" && (
              <div>
                <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">ACTIVE RIVALRIES</div>
                <div className="text-[10px] text-[#8B8593] mb-3">Book two rivals against each other for a rating boost — keep it up and the feud can blow off into a big payoff match. They also form on their own from locker-room news.</div>

                {!creatingRivalry ? (
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
                    return rivalryList.map((r) => (
                      <div key={r.key} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-sm">{r.a} <span className="text-[#8B6BC0]">vs</span> {r.b}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#8B8593]">{r.matchesFought} fought</span>
                            <button onClick={() => removeWrestlerRivalry(r.a, r.b)} className="text-[#8B8593] hover:text-red-400"><X size={14} /></button>
                          </div>
                        </div>
                        <div className="flex justify-between text-[9px] text-[#8B8593] mb-1"><span>INTENSITY &middot; <span className="text-[#8B6BC0] font-bold">{feudStage(r.intensity).label.toUpperCase()}</span></span><span className="text-[#F2ECDD] font-bold">{r.intensity}/100</span></div>
                        <div className="h-1.5 bg-[#232029] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#5B3B8C] to-red-500" style={{ width: `${r.intensity}%` }} />
                        </div>
                        <div className="text-[9px] text-[#8B8593] italic mt-1">{feudStage(r.intensity).hint}</div>
                      </div>
                    ));
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
                    return rivalryList.map((r) => (
                      <div key={r.key} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-sm">{r.a.name} <span className="text-[#8B6BC0]">vs</span> {r.b.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#8B8593]">{r.matchesFought} fought</span>
                            <button onClick={() => removeStableRivalry(r.a.id, r.b.id)} className="text-[#8B8593] hover:text-red-400"><X size={14} /></button>
                          </div>
                        </div>
                        <div className="flex justify-between text-[9px] text-[#8B8593] mb-1"><span>INTENSITY &middot; <span className="text-[#8B6BC0] font-bold">{feudStage(r.intensity).label.toUpperCase()}</span></span><span className="text-[#F2ECDD] font-bold">{r.intensity}/100</span></div>
                        <div className="h-1.5 bg-[#232029] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#5B3B8C] to-red-500" style={{ width: `${r.intensity}%` }} />
                        </div>
                        <div className="text-[9px] text-[#8B8593] italic mt-1">{feudStage(r.intensity).hint}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

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
            <div className="text-[10px] text-[#8B8593] mb-3">Add to Per-Use for a standing freelance pick, or sign Exclusive for a weekly-wage contract.</div>
            <input value={wrestlerSearch} onChange={(e) => setWrestlerSearch(e.target.value)} placeholder="Search wrestlers by name..." className="w-full border border-[#2B2733] rounded px-3 py-1.5 text-xs mb-3" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />

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

            <div className="grid sm:grid-cols-2 gap-2">
              {[...pool].filter(passesFilters).sort((a, b) => {
                const valOf = (w) => (sortField === "overall" ? attrOf(w) : sortField === "ranking" ? w.rankingPts : w[sortField]);
                return valOf(b) - valOf(a);
              }).map((w) => {
                const rival = w.contractedTo && w.contractedTo !== "player" ? RIVAL_COMPANIES.find((c) => c.id === w.contractedTo) : null;
                const isPlayerSigned = w.contractedTo === "player";
                const isPerUse = perUseRoster.includes(w.name);
                const onCooldown = w.hireCooldownUntil && weekNumber < w.hireCooldownUntil;
                return (
                  <div key={w.name} className="bg-[#131117] border border-[#2B2733] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <button onClick={() => setDetailWrestler(w)} className="font-black text-sm text-left hover:text-[#8B6BC0] transition-colors truncate" style={{ fontFamily: "Anton, sans-serif" }}>{w.name.toUpperCase()}</button>
                      {!rival && !isPlayerSigned && !onCooldown && (
                        <div className="flex gap-1 shrink-0">
                          {!isPerUse && (
                            <button onClick={() => startNegotiating(w)} className="text-[10px] font-bold px-2 py-1 rounded border border-[#5B3B8C] text-[#8B6BC0] hover:bg-[#241B33]">Per Use</button>
                          )}
                          {exceedsHireCap(w) ? (
                            <span className="text-[9px] text-[#8B8593] italic px-1 self-center" title={`Too big a name to sign exclusively at ${popularityTier(popularity)} level`}>Above your level</span>
                          ) : (
                            <button onClick={() => startHiring(w)} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-[#5B3B8C] hover:bg-[#6C47A3]"><Plus size={11} /> Exclusive</button>
                          )}
                        </div>
                      )}
                      {onCooldown && <span className="text-[9px] text-[#8B8593] shrink-0">Cooldown {w.hireCooldownUntil - weekNumber}wk</span>}
                    </div>
                    <div className="text-[10px] font-semibold flex items-center gap-1 flex-wrap">
                      <span className="text-[#8B6BC0]">OVR {Math.round(attrOf(w))} &middot; {w.sex} &middot; {w.wins}-{w.losses}</span>{w.injuryWeeksRemaining && <span className="text-red-400 text-[9px]"> &middot; INJURED</span>}
                      {rival ? <span className="text-[9px] text-[#8B8593]">&middot; Signed: {rival.name}</span> : isPlayerSigned ? <span className="text-[9px] text-[#8B8593]">&middot; Exclusive to you</span> : isPerUse ? <span className="text-[9px] text-[#8B8593]">&middot; Per-use (yours)</span> : <span className="text-[9px] text-[#8B8593]">&middot; Freelance</span>}
                    </div>
                  </div>
                );
              })}
              {pool.filter(passesFilters).length === 0 && (
                <div className="text-xs text-[#8B8593] italic col-span-2">No wrestlers match these filters.</div>
              )}
            </div>

            {hiringTarget && (
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 booked-modal-backdrop" style={{ backgroundColor: "rgba(4,4,6,0.94)" }} onClick={() => setHiringTarget(null)}>
                <div className="booked-modal-card border rounded-lg p-5 max-w-sm w-full" style={{ backgroundColor: "#17151C", color: "#F2ECDD", borderColor: "#5B3B8C" }} onClick={(e) => e.stopPropagation()}>
                  <div className="text-lg font-black mb-1" style={{ fontFamily: "Anton, sans-serif" }}>SIGN {hiringTarget.name.toUpperCase()}</div>
                  <div className="text-[10px] text-[#8B8593] mb-3">£{weeklyWage(hiringTarget).toLocaleString()}/week, billed automatically while under contract. They might say no — if so, they're off-limits for 1-3 weeks.</div>
                  {hireResult === "refused" && <div className="text-xs text-red-400 mb-3">{hiringTarget.name} turned down the offer. Try again in a few weeks.</div>}
                  {hireResult === "accepted" && <div className="text-xs text-[#8B6BC0] mb-3">Signed!</div>}
                  {!hireResult && (
                    <>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {CONTRACT_OPTIONS.map((wk) => (
                          <button key={wk} onClick={() => setHireWeeks(wk)} className={`px-3 py-2 rounded text-xs font-bold border ${hireWeeks === wk ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`} style={hireWeeks === wk ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C" } : undefined}>
                            {wk} weeks
                          </button>
                        ))}
                      </div>
                      <button onClick={confirmHire} className="w-full py-2 bg-[#5B3B8C] hover:bg-[#6C47A3] text-xs font-bold rounded">Offer contract</button>
                    </>
                  )}
                  <button onClick={() => setHiringTarget(null)} className="w-full mt-2 px-4 py-2 border border-[#2B2733] text-xs text-[#8B8593] hover:text-[#F2ECDD] rounded">Close</button>
                </div>
              </div>
            )}

          </div>
            )}
          </div>
        )}

        {tab === "promotions" && !viewingCompany && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">PROMOTIONS LEADERBOARD</div>
            <div className="text-[10px] text-[#8B8593] mb-3">Fictional rival companies, ranked by popularity. Tap one for more detail.</div>
            <div className="space-y-2">
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
                          <span className="font-bold text-sm">{co.name}{co.isPlayer && <span className="text-[10px] text-[#8B6BC0]"> (You)</span>}</span>
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
          </div>
        )}

        {tab === "promotions" && viewingCompany && (() => {
          const co = viewingCompany;
          const signedRoster = pool.filter((w) => w.contractedTo === co.id);
          const signedNames = new Set(signedRoster.map((w) => w.name));
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
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="bg-[#131117] rounded-lg p-2.5"><div className="text-[9px] text-[#8B8593]">BOOKER</div><div className="font-bold">{co.bookerName}</div></div>
                <div className="bg-[#131117] rounded-lg p-2.5"><div className="text-[9px] text-[#8B8593]">FUNDS</div><div className="font-bold booked-mono" style={{ color: "var(--gold)" }}>£{Math.round(co.funds).toLocaleString()}</div></div>
                <div className="bg-[#131117] rounded-lg p-2.5"><div className="text-[9px] text-[#8B8593]">SHOWS RUN</div><div className="font-bold">{co.showsRun}</div></div>
                <div className="bg-[#131117] rounded-lg p-2.5"><div className="text-[9px] text-[#8B8593]">CHAMPION</div><div className="font-bold">{champ?.holder || "Vacant"}</div></div>
              </div>
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
              <div className="text-[10px] tracking-widest text-[#8B8593] font-bold mb-1.5">SIGNED ROSTER ({signedRoster.length})</div>
              <div className="space-y-1">
                {signedRoster.map((w) => (
                  <div key={w.name} className="flex items-center justify-between text-xs bg-[#131117] rounded px-2 py-1.5">
                    <span>{w.name}</span>
                    <span className="text-[#8B8593]">{w.name === champ?.holder && <Award size={11} className="text-[#8B6BC0] inline mr-1" />}OVR {Math.round(attrOf(w))}</span>
                  </div>
                ))}
                {signedRoster.length === 0 && <div className="text-xs text-[#8B8593] italic">No wrestlers signed yet.</div>}
              </div>
            </div>
          );
        })()}

        {tab === "deals" && (
          <div className="space-y-6">
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
              {isPPVWeek && <div className="text-[10px] text-[#8B6BC0] font-bold tracking-wide mt-0.5">BIG SHOW WEEK &mdash; consider booking the Major Arena for a bigger payoff</div>}
            </div>
            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3"><Building2 size={14} /> VENUE</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {ARENAS.map((ar, i) => {
                  const locked = TIER_RANK[popularityTier(popularity)] < TIER_RANK[ar.minTier];
                  return (
                    <button
                      key={ar.name}
                      onClick={() => { if (locked) return; setArenaIdx(i); setTicketPrice(ar.ticketMin); }}
                      disabled={locked}
                      className={`px-3 py-1.5 rounded text-[11px] font-bold tracking-wide border ${
                        locked ? "border-[#2B2733] text-[#5A5660] cursor-not-allowed" : i === arenaIdx ? "bg-[#5B3B8C] border-[#5B3B8C] text-[#F2ECDD]" : "border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]"
                      }`}
                      style={!locked && i === arenaIdx ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C", color: "#F2ECDD" } : undefined}
                    >
                      {ar.name.toUpperCase()}{locked ? ` (${ar.minTier}+)` : ""}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-[#8B8593] mb-3">
                Capacity {arena.crowdMin.toLocaleString()}&ndash;{arena.crowdMax.toLocaleString()} &middot; Booking cost £{arena.cost.toLocaleString()}
              </div>
              <div className="mb-4">
                <div className="text-[10px] text-[#8B8593] mb-1.5">CITY</div>
                {!startingCity ? (
                  <div className="bg-[#17151C] border border-[#5B3B8C] rounded-lg p-3">
                    <div className="text-xs font-bold mb-1">Choose your home city</div>
                    <div className="text-[10px] text-[#8B8593] mb-2">This is where your promotion starts out. Other cities unlock in nearby groups as you build popularity here — pick carefully, it can't be changed later.</div>
                    <div className="flex flex-wrap gap-1.5">
                      {CITIES.filter((c) => c !== "International").map((c) => (
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
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {CITIES.map((c) => {
                      const tierRequirement = LOCKED_CITIES[c];
                      const tierLocked = tierRequirement && TIER_RANK[popularityTier(popularity)] < TIER_RANK[tierRequirement];
                      const geoLocked = !tierRequirement && !unlockedCities.includes(c);
                      const locked = tierLocked || geoLocked;
                      return (
                        <button
                          key={c}
                          onClick={() => { if (!locked) setCity(c); }}
                          disabled={locked}
                          title={geoLocked ? "Get a connected city to 70% popularity to unlock this" : undefined}
                          className={`px-2.5 py-1 rounded text-[10px] font-semibold border flex items-center gap-1 ${
                            locked ? "border-[#2B2733] text-[#5A5660] cursor-not-allowed" : city === c ? "bg-[#5B3B8C] border-[#5B3B8C] text-[#F2ECDD]" : "border-[#2B2733] text-[#8B8593] hover:text-[#F2ECDD]"
                          }`}
                          style={!locked && city === c ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C", color: "#F2ECDD" } : undefined}
                        >
                          {c}{tierLocked ? ` (${tierRequirement}+)` : geoLocked ? " 🔒" : cityVisits[c] > 0 && <span className="opacity-60">&middot;{cityVisits[c]}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!city && <div className="text-[9px] text-[#8B8593] italic mt-1.5">Pick a city to run your show in.</div>}
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-[#8B8593] mb-1"><span>TICKET PRICE</span><span className="text-[#F2ECDD] font-bold">£{ticketPrice}</span></div>
                <input type="range" min={arena.ticketMin} max={arena.ticketMax} value={ticketPrice} onChange={(e) => setTicketPrice(Number(e.target.value))} className="w-full accent-[#8B6BC0]" />
              </div>
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
                {slots.map((slot) => {
                  const def = SLOT_DEFS.find((d) => d.key === slot.key);
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
                  const partnerOptions = (side) => {
                    const primary = slot[side][0];
                    if (!primary) return bookable;
                    const stable = stableOf(primary.name);
                    if (!stable) return bookable;
                    const stablemates = bookable.filter((w) => stable.members.includes(w.name) && w.name !== primary.name);
                    return stablemates.length > 0 ? stablemates : bookable;
                  };
                  return (
                    <div key={slot.key} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-[10px] text-[#8B8593] font-bold tracking-wide">{def.label.toUpperCase()} <span className="text-[#8B6BC0]">(cap {def.cap})</span></span>
                        <div className="flex gap-1">
                          {["match", "segment"].map((f) => (
                            <button key={f} onClick={() => setSlotFormat(slot.key, f)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${slot.format === f ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`} style={slot.format === f ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C" } : undefined}>
                              {f === "match" ? "Match" : "Segment"}
                            </button>
                          ))}
                          {slot.format === "match" && ["singles", "tag", "triple", "fatal4"].map((t) => (
                            <button key={t} onClick={() => setSlotType(slot.key, t)} className={`px-2 py-0.5 rounded text-[9px] font-bold border ${slot.type === t ? "bg-[#5B3B8C] border-[#5B3B8C]" : "border-[#2B2733] text-[#8B8593]"}`} style={slot.type === t ? { backgroundColor: "#5B3B8C", borderColor: "#5B3B8C" } : undefined}>
                              {t === "singles" ? "1v1" : t === "tag" ? "2v2" : t === "triple" ? "Triple Threat" : "Fatal 4-Way"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {slot.format === "segment" ? (
                        <div>
                          <select value={slot.team1[0]?.name || ""} onChange={(e) => setSlotMember(slot.key, "team1", 0, bookable.find((w) => w.name === e.target.value) || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                            <option value="">Select performer...</option>
                            {bookable.map((w) => (
                              <option key={w.name} value={w.name} disabled={usedNames.has(w.name) && slot.team1[0]?.name !== w.name}>{w.name}</option>
                            ))}
                          </select>
                          {slot.team1[0] && <div className="text-[9px] text-[#8B8593] mt-1">ATTR {Math.round(attrOf(slot.team1[0]))} &middot; CHA {slot.team1[0].cha}/100 &middot; {effectiveTier(slot.team1[0])} &middot; <span className={slot.team1[0].alignment === "Heel" ? "text-red-400" : "text-green-400"}>{slot.team1[0].alignment}</span> &middot; STA {slot.team1[0].eng}/100</div>}
                          <select value={slot.team2?.[0]?.name || ""} onChange={(e) => setSlotMember(slot.key, "team2", 0, bookable.find((w) => w.name === e.target.value) || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs mt-1.5">
                            <option value="">No subject — general promo</option>
                            {bookable.filter((w) => w.name !== slot.team1[0]?.name).map((w) => (
                              <option key={w.name} value={w.name}>{w.name}{w.rivals.includes(slot.team1[0]?.name) ? " (existing rival)" : ""}</option>
                            ))}
                          </select>
                          <div className="text-[9px] text-[#8B8593] italic mt-1">Promo segment — rated on charisma, no win/loss, boosts their CHA slightly. Aim it at a signed wrestler to nudge or spark a rivalry, without any energy cost.</div>
                        </div>
                      ) : (slot.type === "triple" || slot.type === "fatal4") ? (
                        <>
                          <div className="space-y-1">
                            {(slot.type === "triple" ? [0, 1, 2] : [0, 1, 2, 3]).map((idx) => (
                              <div key={idx}>
                                <select value={slot.team1[idx]?.name || ""} onChange={(e) => setSlotMember(slot.key, "team1", idx, bookable.find((w) => w.name === e.target.value) || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                                  <option value="">Select wrestler...</option>
                                  {bookable.map((w) => (
                                    <option key={w.name} value={w.name} disabled={usedNames.has(w.name) && slot.team1[idx]?.name !== w.name}>{w.name}</option>
                                  ))}
                                </select>
                                {slot.team1[idx] && <div className="text-[9px] text-[#8B8593] mt-0.5">ATTR {Math.round(attrOf(slot.team1[idx]))} &middot; {effectiveTier(slot.team1[idx])} &middot; <span className={slot.team1[idx].alignment === "Heel" ? "text-red-400" : "text-green-400"}>{slot.team1[idx].alignment}</span> &middot; STA {slot.team1[idx].eng}/100</div>}
                              </div>
                            ))}
                          </div>
                          <div className="text-[9px] text-[#8B8593] italic">Everyone's in for themselves — one winner, pinned or submitted by anyone.</div>
                          {eligibleTitles.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Award size={12} className="text-[#8B6BC0] shrink-0" />
                              <select value={slot.titleId || ""} onChange={(e) => setSlotTitle(slot.key, e.target.value || null)} className="flex-1 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[11px] text-[#8B6BC0]">
                                <option value="">Non-title match</option>
                                {eligibleTitles.map((title) => (
                                  <option key={title.id} value={title.id}>{title.name} {title.holders.length === 0 ? "(vacant)" : `(defending: ${title.holders.join(" & ")})`}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Zap size={12} className="text-[#8B6BC0] shrink-0" />
                            <select value={slot.specialtyId || ""} onChange={(e) => setSlotSpecialty(slot.key, e.target.value || null)} className="flex-1 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[11px] text-[#8B6BC0]">
                              <option value="">Standard match</option>
                              {eligibleSpecialties.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} &middot; £{s.cost.toLocaleString()} &middot; +{s.ratingBonus} rtg &middot; {STAT_LABELS[s.statKey]}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 space-y-1">
                              {[0, ...(slot.type === "tag" ? [1] : [])].map((idx) => {
                                const options = idx === 1 ? partnerOptions("team1") : bookable;
                                return (
                                <div key={idx}>
                                  <select value={slot.team1[idx]?.name || ""} onChange={(e) => setSlotMember(slot.key, "team1", idx, bookable.find((w) => w.name === e.target.value) || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                                    <option value="">Select wrestler...</option>
                                    {options.map((w) => (
                                      <option key={w.name} value={w.name} disabled={usedNames.has(w.name) && slot.team1[idx]?.name !== w.name}>{w.name}</option>
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
                                  <select value={slot.team2[idx]?.name || ""} onChange={(e) => setSlotMember(slot.key, "team2", idx, bookable.find((w) => w.name === e.target.value) || null)} className="w-full bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1.5 text-xs">
                                    <option value="">Select wrestler...</option>
                                    {options.map((w) => (
                                      <option key={w.name} value={w.name} disabled={usedNames.has(w.name) && slot.team2[idx]?.name !== w.name}>{w.name}</option>
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
                          {eligibleTitles.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Award size={12} className="text-[#8B6BC0] shrink-0" />
                              <select value={slot.titleId || ""} onChange={(e) => setSlotTitle(slot.key, e.target.value || null)} className="flex-1 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[11px] text-[#8B6BC0]">
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
                            <select value={slot.specialtyId || ""} onChange={(e) => setSlotSpecialty(slot.key, e.target.value || null)} className="flex-1 bg-[#0A0A0C] border border-[#2B2733] rounded px-2 py-1 text-[11px] text-[#8B6BC0]">
                              <option value="">Standard match</option>
                              {eligibleSpecialties.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} &middot; £{s.cost.toLocaleString()} &middot; +{s.ratingBonus} rtg &middot; {STAT_LABELS[s.statKey]}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {(() => {
              const filledSlotCount = slots.filter((s) => {
                if (s.format === "segment") return !!s.team1[0];
                if (s.type === "triple") return s.team1.filter(Boolean).length >= 3;
                if (s.type === "fatal4") return s.team1.filter(Boolean).length >= 4;
                return s.team1.filter(Boolean).length > 0 && s.team2.filter(Boolean).length > 0;
              }).length;
              const missing = SLOT_DEFS.length - filledSlotCount;
              if (missing <= 0 || TIER_RANK[popularityTier(popularity)] < TIER_RANK.National) return null;
              return <div className="text-[10px] text-red-300 mb-2">Fans at your level expect a full card — {missing} empty slot{missing === 1 ? "" : "s"} will cost you rating and money.</div>;
            })()}
            <button onClick={runShow} disabled={!readyToRun || running} className="w-full py-3.5 bg-[#5B3B8C] hover:bg-[#6C47A3] disabled:opacity-40 disabled:cursor-not-allowed text-[#F2ECDD] font-black tracking-widest text-sm rounded transition-colors" style={{ fontFamily: "Anton, sans-serif" }}>
              {running ? "RUNNING THE SHOW..." : "RUN THE SHOW"}
            </button>
          </div>
        )}

        {bookSubTab === "book" && showResult && (
          <div className="space-y-4">
            <div className="text-center"><div className="text-[10px] tracking-[0.3em] text-[#8B6BC0] font-bold">{showResult.city.toUpperCase()} &middot; {showResult.arena.toUpperCase()} SHOW &middot; RESULTS</div></div>
            <div className="space-y-2">
              {showResult.matches.map((m, i) => (
                <div key={i} className="bg-[#17151C] border border-[#2B2733] rounded-lg p-3">
                  <div className="text-[9px] text-[#8B8593] mb-1">{m.slotLabel}{m.format === "segment" ? " · SEGMENT" : ""}{m.specialty ? ` · ${m.specialty.name.toUpperCase()}` : ""}{(m.storyKey || m.stableStoryKey) ? " · RIVALRY" : ""}{m.winMethod ? ` · VIA ${m.winMethod.toUpperCase()}` : ""}</div>
                  {m.format === "segment" ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F2ECDD]">{m.performer.name} cuts a promo{m.subject ? <span className="font-normal text-[#8B8593]"> aimed at {m.subject.name}</span> : ""}</span>
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
                </div>
              ))}
            </div>
            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-[#8B8593]">Attendance</span><div className="font-bold">{showResult.attendance.toLocaleString()}</div></div>
              <div><span className="text-[#8B8593]">Ticket Price</span><div className="font-bold">£{showResult.ticketPrice}</div></div>
              <div><span className="text-[#8B8593]">Revenue</span><div className="font-bold">£{showResult.revenue.toLocaleString()}</div></div>
              <div><span className="text-[#8B8593]">Talent Pay</span><div className="font-bold">£{showResult.wrestlerPay.toLocaleString()}</div></div>
              {showResult.specialtyCost > 0 && <div><span className="text-[#8B8593]">Speciality Costs</span><div className="font-bold">£{showResult.specialtyCost.toLocaleString()}</div></div>}
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
            <button onClick={resetShow} className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-[#8B8593] hover:text-[#F2ECDD] border border-[#2B2733] rounded"><RotateCcw size={12} /> Book another show</button>
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
                            {m.format === "segment" ? (
                              <div className="flex items-center justify-between text-xs">
                                <span><span className="text-[9px] text-[#8B8593] mr-1">{m.slotLabel}:</span>{m.performer.name} cuts a promo{m.subject ? ` aimed at ${m.subject.name}` : ""}</span>
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
                        <div className="text-xs font-bold mb-1">{r.companyName} &middot; Y{r.year} Wk{r.weekOfYear}</div>
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
          <div>
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
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
        )}

        {tab === "titles" && (
          <div className="space-y-3">
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
                            <span className="text-[#CFC9BB]">#{i + 1} {c.label}</span>
                            <span className="text-[#8B8593]">{c.pts} pts</span>
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
            <div className="text-[10px] text-[#8B8593] mb-4">How the game refers to things — not a gameplay lever, just the names attached to them.</div>

            <div className="bg-[#17151C] border border-[#2B2733] rounded-lg p-4 mb-4">
              <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-3">COMPANY</div>
              <div className="text-[10px] text-[#8B8593] mb-1">COMPANY NAME</div>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full border border-[#2B2733] rounded px-3 py-2 text-sm font-bold" style={{ backgroundColor: "#0A0A0C", color: "#F2ECDD" }} />
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
            <div className="space-y-3">
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

        {tab === "achievements" && (
          <div>
            <div className="text-[11px] tracking-widest text-[#8B6BC0] font-bold mb-1">ACHIEVEMENTS</div>
            <div className="text-[10px] text-[#8B8593] mb-4">Lifetime — these carry over even if you retire and start a new promotion. {unlockedAchievements.length}/{ACHIEVEMENTS.length} unlocked.</div>
            <div className="space-y-2">
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
                  <div className={item.type === "title" ? "text-[#F2ECDD] font-semibold" : item.type === "injury" ? "text-red-300 font-semibold" : "text-[#CFC9BB]"}>{item.text}</div>
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
                { key: "wrestlers", label: "Wrestlers", desc: "Browse & hire the full pool", icon: UserPlus },
                { key: "promotions", label: "Promotions", desc: "Rival companies", icon: Globe2 },
                { key: "deals", label: "Deals", desc: "TV networks & sponsors", icon: Tv },
                { key: "merch", label: "Merchandise", desc: popularity >= MERCH_UNLOCK_POPULARITY ? `${merchStock} units in stock` : "Locked", icon: Ticket },
                { key: "rankings", label: "Rankings", desc: "Top 10, singles & tag", icon: TrendingUp },
                { key: "news", label: "News", desc: "Everything happening", icon: Newspaper },
                { key: "achievements", label: "Achievements", desc: `${unlockedAchievements.length}/${ACHIEVEMENTS.length} unlocked`, icon: Trophy },
                { key: "halloffame", label: "Hall of Fame", desc: "Your best, all-time", icon: Star },
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

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#0A0A0C", borderTop: "1px solid #2B2733", zIndex: 40 }}>
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
            const menuActive = ["menu", "wrestlers", "promotions", "deals", "rankings", "news", "guide", "saves", "achievements", "backoffice", "halloffame", "merch"].includes(tab);
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
