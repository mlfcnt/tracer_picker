import type { Page } from "puppeteer";
import { log } from "@clack/prompts";
import { calculateWeight } from "./algo";
import type { COMMITTEE_CODES } from "./constants";
import { writeFileSync } from "fs";
import { join } from "path";

export const selectCommittees = async (page: Page, comiteCode: string) => {
  const committeeCounts = await page.evaluate(() => {
    const committees = new Map<string, number>();
    const csCells = document.querySelectorAll("td.text-center:nth-child(8)");
    csCells.forEach((cell) => {
      const committee = cell.textContent?.trim();
      if (committee) {
        committees.set(committee, (committees.get(committee) || 0) + 1);
      }
    });
    return Object.fromEntries(committees);
  });

  // Create table data
  const sortedNonHomeCommittees = Object.entries(committeeCounts)
    .filter(([committee]) => committee !== "" && committee !== comiteCode)
    .sort(([, countA], [, countB]) => countB - countA);

  const totalParticipants = Object.values(committeeCounts).reduce(
    (acc, count) => acc + count,
    0
  );

  const tableData = Object.entries(committeeCounts)
    .filter(([committee]) => committee !== "")
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([committee, count]) => {
      const isHomeCommittee = committee === comiteCode;

      let races = "";

      if (isHomeCommittee) {
        races = "1, 3";
      } else {
        // Find the two highest weights among non-home committees
        const nonHomeWeights = sortedNonHomeCommittees
          .map(([comm]) => ({
            committee: comm,
            weight: calculateWeight(
              comm as keyof typeof COMMITTEE_CODES,
              committeeCounts[comm] / totalParticipants
            ),
          }))
          .sort((a, b) => b.weight - a.weight);

        if (committee === nonHomeWeights[0].committee) races = "2";
        if (committee === nonHomeWeights[1].committee) races = "4";
      }

      return {
        Comité: `${committee}${isHomeCommittee ? " *" : ""}`,
        Nombre: count,
        Manches: races,
        percent: `${((count / totalParticipants) * 100).toFixed(2)}%`,
        weight: calculateWeight(
          committee as keyof typeof COMMITTEE_CODES,
          count / totalParticipants
        ),
      };
    });

  log.step("Groupement des compétiteurs par comité :");
  console.table(tableData);
  log.info("* : Comité domicile");

  const json = Object.fromEntries(
    tableData
      .filter((x) => x.Manches)
      .map(({ Comité }) => [
        Comité.replace(" *", ""),
        { mostRecentDate: new Date().toISOString() },
      ])
  );
  writeFileSync(
    join(process.cwd(), "tracer-history.json"),
    JSON.stringify(json, null, 2)
  );
};
