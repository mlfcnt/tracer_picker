import type { Page } from "puppeteer";
import {
  generateCommitteeResults,
  type CommitteeResults,
} from "./algoSelection";
import type { CommitteeCode } from "./constants";

export const countCompetitorsByCommittee = (committees: CommitteeCode[]) => {
  return committees.reduce((acc, committee) => {
    acc[committee] = (acc[committee] || 0) + 1;
    return acc;
  }, {} as Record<CommitteeCode, number>);
};

export const formatResultsForDisplay = (results: CommitteeResults) => {
  // Get all unique committees
  const allCommittees = new Set<CommitteeCode>();
  Object.values(results).forEach((committees) =>
    committees.forEach((c) => allCommittees.add(c.committee))
  );

  return Array.from(allCommittees).map((committee) => {
    const row = {
      Comité: committee,
      M1: results.manche1.find((c) => c.committee === committee)?.picked
        ? "✓"
        : "-",
      M2: results.manche2.find((c) => c.committee === committee)?.picked
        ? "✓"
        : "-",
      M3: results.manche3.find((c) => c.committee === committee)?.picked
        ? "✓"
        : "-",
      M4: results.manche4.find((c) => c.committee === committee)?.picked
        ? "✓"
        : "-",
      Nb: results.manche2.find((c) => c.committee === committee)?.count || 0,
      "%":
        results.manche2.find((c) => c.committee === committee)?.percentage || 0,
    };
    return row;
  });
};

export const displayResults = (results: CommitteeResults) => {
  const formattedResults = formatResultsForDisplay(results);
  console.table(formattedResults);
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

    const location = titre.split("(")[1].split("-")[0].trim();

    const discipline = titre.split("-")[1].slice(0, 2);
    const date = titre.split("du")[1].split(",")[0].trim();
    return {
      discipline,
      date,
      location,
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
