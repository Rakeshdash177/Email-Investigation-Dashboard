// Normalized sign-in shape used throughout the app — decoupled from the raw
// Graph API response shape so this module (and its scoring logic) can be
// unit-tested without any Graph/MSAL dependency.
export interface SignInEvent {
  id: string;
  t: string; // ISO createdDateTime
  app: string;
  ip: string;
  city: string;
  state: string;
  country: string;
  os: string;
  browser: string;
  device: string;
  compliant: boolean;
  managed: boolean;
  auth: string; // e.g. "singleFactorAuthentication" | "multiFactorAuthentication"
  ca: string; // conditionalAccessStatus
  risk: string; // riskLevelAggregated
  err: number;
}

export const fmt = (t: string): string =>
  new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const isIPv6 = (ip: string): boolean => ip.includes(":");

/** IPv6 -> first 4 hextets, IPv4 -> first 3 octets. Coarse enough to group a
 * home/office network together without over-fitting to a single address. */
export function ipPrefix(ip: string): string {
  if (isIPv6(ip)) return ip.split(":").slice(0, 4).join(":");
  return ip.split(".").slice(0, 3).join(".");
}

export interface NetworkBaseline {
  locations: Set<string>; // "city, state, country" keys
  ipPrefixes: Set<string>;
}

const locationKey = (s: Pick<SignInEvent, "city" | "state" | "country">): string =>
  `${s.city}, ${s.state}, ${s.country}`;

/**
 * Derives a per-user "known network" baseline from the sign-in sample itself,
 * instead of a hardcoded investigator IP/city list. The most frequent
 * location(s) in the window count as baseline; every IP prefix seen at a
 * baseline location is treated as a known network.
 *
 * Caveat: with a very small sample (e.g. 1-2 sign-ins) this trivially marks
 * everything as "known" — it's a triage heuristic, not a guarantee.
 */
export function deriveBaseline(signins: SignInEvent[]): NetworkBaseline {
  const counts = new Map<string, number>();
  for (const s of signins) {
    const key = locationKey(s);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const maxCount = Math.max(0, ...counts.values());
  const locations = new Set(
    [...counts.entries()].filter(([, c]) => c === maxCount && maxCount > 0).map(([k]) => k),
  );
  const ipPrefixes = new Set(
    signins.filter((s) => locations.has(locationKey(s))).map((s) => ipPrefix(s.ip)),
  );
  return { locations, ipPrefixes };
}

export function isHomeIsh(s: SignInEvent, baseline: NetworkBaseline): boolean {
  return baseline.locations.has(locationKey(s)) || baseline.ipPrefixes.has(ipPrefix(s.ip));
}

export interface ScoredSignIn extends SignInEvent {
  score: number;
  reasons: string[];
}

export function scoreSignin(s: SignInEvent, baseline: NetworkBaseline): ScoredSignIn {
  let score = 0;
  const reasons: string[] = [];
  if (s.err === 65001) {
    score += 1;
    reasons.push("Consent-required failure");
  } else if (s.err !== 0) {
    score += 2;
    reasons.push(`Error ${s.err}`);
  }
  if (!isHomeIsh(s, baseline)) {
    score += 3;
    reasons.push("Off-network IP / location");
  }
  if (s.auth === "singleFactorAuthentication") {
    score += 1;
    reasons.push("Single-factor");
  }
  if (s.ca === "notApplied") {
    score += 1;
    reasons.push("No CA policy applied");
  }
  if (s.risk && s.risk !== "none") {
    score += 3;
    reasons.push(`Identity Protection risk: ${s.risk}`);
  }
  return { ...s, score, reasons };
}

export const riskColor = (score: number): string =>
  score >= 6 ? "#dc2626" : score >= 4 ? "#d97706" : score >= 2 ? "#ca8a04" : "#16a34a";

export const riskLabel = (score: number): string =>
  score >= 6 ? "High" : score >= 4 ? "Medium" : score >= 2 ? "Low" : "Clean";

export type TimelineRange = "24h" | "7d" | "30d" | "90d" | "custom";

/** Resolves a preset (or custom) range to an ISO [start, end] pair. */
export function resolveRange(
  range: TimelineRange,
  custom?: { start: string; end: string },
): { startISO: string; endISO: string } {
  const end = new Date();
  if (range === "custom") {
    if (!custom) throw new Error("custom range requires start/end");
    return { startISO: new Date(custom.start).toISOString(), endISO: new Date(custom.end).toISOString() };
  }
  const hours = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30, "90d": 24 * 90 }[range];
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}
