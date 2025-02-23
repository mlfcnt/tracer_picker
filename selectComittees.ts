import type { Page } from "puppeteer";
import {
  generateCommitteeResults,
  type CommitteeResults,
} from "./algoSelection";
import type { CommitteeCode } from "./constants";
import { EXTRA_COMMITTEES_COUNT } from "./constants";
import fs from "fs";
import path from "path";

export const countCompetitorsByCommittee = (committees: CommitteeCode[]) => {
  return committees.reduce((acc, committee) => {
    acc[committee] = (acc[committee] || 0) + 1;
    return acc;
  }, {} as Record<CommitteeCode, number>);
};

export const formatResultsForDisplay = (results: CommitteeResults) => {
  const allCommittees = new Set<CommitteeCode>();
  Object.values(results).forEach((committees) =>
    committees.forEach((c) => allCommittees.add(c.committee))
  );

  const okSymbol = "OK";
  const emptySymbol = ".";
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

  return Array.from(allCommittees).map((committee) => {
    const entry = results.manche2.find((c) => c.committee === committee);
    const daysDiff = entry?.lastDate
      ? Math.round(
          (new Date().getTime() - entry.lastDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    return {
      Comité: committee,
      M1: results.manche1.find((c) => c.committee === committee)?.isPicked
        ? okSymbol
        : emptySymbol,
      M2: results.manche2.find((c) => c.committee === committee)?.isPicked
        ? okSymbol
        : emptySymbol,
      M3: results.manche3.find((c) => c.committee === committee)?.isPicked
        ? okSymbol
        : emptySymbol,
      M4: results.manche4.find((c) => c.committee === committee)?.isPicked
        ? okSymbol
        : emptySymbol,
      Nb: entry?.count || 0,
      Dernier: daysDiff ? rtf.format(-daysDiff, "day") : "jamais",
      Occurences: entry?.occurrences || 0,
      "%": entry?.percentage?.toFixed(1) || 0,
    };
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

  // Ajout des comités artificiels
  Object.entries(EXTRA_COMMITTEES_COUNT).forEach(([committee, count]) => {
    committeeCounts[committee as CommitteeCode] =
      (committeeCounts[committee as CommitteeCode] || 0) + count;
  });

  const historyData = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "results", "results_history.json"),
      "utf8"
    )
  );

  const results = generateCommitteeResults(
    committeeCounts,
    comiteCode,
    historyData
  );
  return {
    ...results,
    ...metadata,
  };
};
