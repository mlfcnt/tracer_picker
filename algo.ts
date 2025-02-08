import { readFileSync } from "fs";
import { join } from "path";
import type { COMMITTEE_CODES } from "./constants";

export const calculateWeight = (
  committeeCode: keyof typeof COMMITTEE_CODES,
  committeePercent: number
) => {
  const mostRecentDate = getMostRecentDate(committeeCode);

  if (!mostRecentDate) return committeePercent * 100;

  const daysSinceLastSet = Math.floor(
    (Date.now() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const timeFactor = Math.log10(daysSinceLastSet + 1) + 1;
  return committeePercent * 100 * timeFactor;
};

const getHistory = () => {
  const history = readFileSync(
    join(process.cwd(), "tracer-history.json"),
    "utf8"
  );
  return JSON.parse(history);
};

export const getMostRecentDate = (
  committeeCode: keyof typeof COMMITTEE_CODES
) => {
  const history = getHistory();
  if (!history || !history[committeeCode]) return null;
  return new Date(history[committeeCode].mostRecentDate);
};
