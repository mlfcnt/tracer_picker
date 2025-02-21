import type { Page } from "puppeteer";
import {
  generateCommitteeResults,
  type CommitteeResults,
} from "./algoSelection";
import chalk from "chalk";

export const countCompetitorsByCommittee = (committees: string[]) => {
  return committees.reduce((acc, committee) => {
    acc[committee] = (acc[committee] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

const formatResultsForDisplay = (results: CommitteeResults) => {
  const allCommittees = new Set([
    ...results.manche1.map((r) => r.committee),
    ...results.manche2.map((r) => r.committee),
  ]);

  return Array.from(allCommittees)
    .map((committee) => {
      const isHome = results.manche1.some(
        (r) => r.committee === committee && r.isHomeCommittee
      );

      const entry = {
        Comité: isHome ? chalk.yellow(committee) : committee,
        M1: "·",
        M2: "·",
        M3: "·",
        M4: "·",
        Nb: 0,
        "%": 0,
      };

      // Check each round
      if (isHome) {
        entry["M1"] = chalk.green("🏠");
        entry["M3"] = chalk.green("🏠");
      }
      if (results.manche2.some((r) => r.committee === committee && r.picked))
        entry["M2"] = chalk.green("🎲");
      if (results.manche4.some((r) => r.committee === committee && r.picked))
        entry["M4"] = chalk.green("🎲");

      const committeeData = [...results.manche1, ...results.manche2].find(
        (r) => r.committee === committee
      );
      if (committeeData) {
        entry["%"] = committeeData.percentage;
        entry["Nb"] = committeeData.count;
      }

      return entry;
    })
    .sort((a, b) => b["%"] - a["%"]); // Tri par pourcentage décroissant
};

export const selectCommittees = async (page: Page, comiteCode: string) => {
  const committeesData = await page.evaluate(() => {
    const csCells = document.querySelectorAll("td.text-center:nth-child(8)");
    return Array.from(csCells).map((cell) => cell.textContent?.trim() || "");
  });

  const committeeCounts = countCompetitorsByCommittee(committeesData);
  const results = generateCommitteeResults(committeeCounts, comiteCode);

  console.table(formatResultsForDisplay(results));
};
