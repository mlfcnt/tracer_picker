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
  const okSymbol = "✓";
  const selectedCommittees = new Set<CommitteeCode>();

  // Récupère uniquement les comités sélectionnés
  Object.values(results).forEach((committees) =>
    committees
      .filter((c) => c.isPicked)
      .forEach((c) => selectedCommittees.add(c.committee))
  );

  return Array.from(selectedCommittees).map((committee) => {
    const entry = results.manche2.find((c) => c.committee === committee);
    const weight = entry?.weight || 1;
    const baseWeight = entry?.baseWeight || 1;

    return {
      Comité: committee,
      M1: results.manche1.find((c) => c.committee === committee)?.isPicked
        ? okSymbol
        : "",
      M2: results.manche2.find((c) => c.committee === committee)?.isPicked
        ? okSymbol
        : "",
      M3: results.manche3.find((c) => c.committee === committee)?.isPicked
        ? okSymbol
        : "",
      M4: results.manche4.find((c) => c.committee === committee)?.isPicked
        ? okSymbol
        : "",
      Compétiteurs: entry?.count || 0,
      "Courses depuis": entry?.competitionsSinceLastTrace || 0,
      "Poids base": baseWeight.toFixed(2),
      "Poids final": weight.toFixed(2),
      Formule: `${entry?.count || 0} × ${baseWeight.toFixed(
        2
      )} = ${weight.toFixed(2)}`,
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
