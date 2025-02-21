import type { Page } from "puppeteer";
import {
  generateCommitteeResults,
  type CommitteeResults,
} from "./algoSelection";
import type { CommitteeCode } from "./constants";
// import chalk from "chalk";

export const countCompetitorsByCommittee = (committees: CommitteeCode[]) => {
  return committees.reduce((acc, committee) => {
    acc[committee] = (acc[committee] || 0) + 1;
    return acc;
  }, {} as Record<CommitteeCode, number>);
};

export const formatResultsForDisplay = (results: CommitteeResults) => {
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
        Comité: committee,
        M1: "·",
        M2: "·",
        M3: "·",
        M4: "·",
        Nb: 0,
        "%": 0,
      };

      // Check each round
      if (isHome) {
        entry["M1"] = "🏠";
        entry["M3"] = "🏠";
      }
      if (results.manche2.some((r) => r.committee === committee && r.picked))
        entry["M2"] = "🎲";
      if (results.manche4.some((r) => r.committee === committee && r.picked))
        entry["M4"] = "🎲";

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

export const selectCommittees = async (
  page: Page,
  comiteCode: CommitteeCode
) => {
  const metadata = await page.evaluate(() => {
    const titre =
      document
        .querySelector("#container_info_competition h2")
        ?.textContent?.trim() || "";

    const discipline = titre.split("-")[1].slice(0, 2);
    const date = titre.split("du")[1].split(",")[0].trim();
    return {
      discipline,
      date,
    };
  });

  const committeesData = (await page.evaluate(() => {
    const csCells = document.querySelectorAll("td.text-center:nth-child(8)");
    return Array.from(csCells).map((cell) => cell.textContent?.trim() || "");
  })) as CommitteeCode[];

  const committeeCounts = countCompetitorsByCommittee(committeesData);
  const results = generateCommitteeResults(committeeCounts, comiteCode);
  return {
    ...results,
    ...metadata,
  };
};
