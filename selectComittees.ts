import type { Page } from "puppeteer";
import { log } from "@clack/prompts";

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

  const tableData = Object.entries(committeeCounts)
    .filter(([committee]) => committee !== "")
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([committee, count]) => {
      const isHomeCommittee = committee === comiteCode;
      let races = "";

      if (isHomeCommittee) {
        races = "1, 3";
      } else {
        // Find position in sorted non-home committees
        const nonHomePosition = sortedNonHomeCommittees.findIndex(
          ([c]) => c === committee
        );

        if (nonHomePosition === 0) races = "2";
        if (nonHomePosition === 1) races = "4";
      }

      return {
        Comité: `${committee}${isHomeCommittee ? " *" : ""}`,
        Nombre: count,
        Manches: races,
      };
    });

  log.step("Groupement des compétiteurs par comité :");
  console.table(tableData);
  log.info("* : Comité domicile");
};
