import dcaHookAbi from "./dca-hook-abi.json";

// Replace with actual deployed address after deployment
export const DCA_HOOK_ADDRESS = (process.env.NEXT_PUBLIC_DCA_HOOK_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const dcaHookConfig = {
  address: DCA_HOOK_ADDRESS,
  abi: dcaHookAbi,
} as const;

// Interval constants (in seconds)
export const INTERVALS = {
  HOURLY: 3600,
  DAILY: 86400,
  WEEKLY: 604800,
} as const;

export const INTERVAL_LABELS: Record<number, string> = {
  [INTERVALS.HOURLY]: "Hourly",
  [INTERVALS.DAILY]: "Daily",
  [INTERVALS.WEEKLY]: "Weekly",
};

// Base chain block explorer
export const BASE_EXPLORER = "https://basescan.org";

export function txUrl(hash: string) {
  return `${BASE_EXPLORER}/tx/${hash}`;
}

export function addressUrl(address: string) {
  return `${BASE_EXPLORER}/address/${address}`;
}
