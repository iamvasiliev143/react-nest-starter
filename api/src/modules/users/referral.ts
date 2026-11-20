export function parseReferralCode(startParam?: string): string | undefined {
  return /^ref_(r[A-Za-z0-9_-]{16})$/.exec(startParam ?? '')?.[1];
}
