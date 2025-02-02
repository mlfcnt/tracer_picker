import { intro, outro, text, select, log } from "@clack/prompts";
import puppeteer from "puppeteer";
import { accessTheSite, login, accessTheCompetitionPage } from "./domHelpers";
import { selectCommittees } from "./selectComittees";

intro(`Tracer picker v1 ⛷️`);

async function main() {
  if (!process.env.EMAIL) {
    throw new Error(
      "EMAIL n'est pas défini dans les variables d'environnement"
    );
  }

  if (!process.env.PASSWORD) {
    throw new Error(
      "PASSWORD n'est pas défini dans les variables d'environnement"
    );
  }

  // Get user inputs
  const competitionCode = (await text({
    message: "Quel est le code de la competition ?",
  })) as string;

  const comiteCode = (await select({
    message: "Dans quel comité se situe la compétition ?",
    options: [
      { value: "SA", label: "SA" },
      { value: "MB", label: "MB" },
      { value: "AP", label: "AP" },
      { value: "DA", label: "DA" },
      { value: "ORS", label: "ORS" },
      { value: "APEX", label: "APEX" },
      { value: "MV", label: "MV" },
      { value: "MJ", label: "MJ" },
      { value: "PE", label: "PE" },
      { value: "CA", label: "CA" },
    ],
  })) as string;

  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  const page = await browser.newPage();

  try {
    await accessTheSite(page);
    await login(page, process.env.EMAIL, process.env.PASSWORD);
    // await searchForTheCompetition(page, competitionCode);
    await accessTheCompetitionPage(page, competitionCode);
    await selectCommittees(page, comiteCode);
    outro("Martin Constructions vous remercie pour votre confiance.");
  } catch (error) {
    console.error("Erreur lors du processus :", error);
    log.error("Erreur lors de la recherche de la compétition");
    outro("Martin Constructions s'excuse pour la gêne occasionnée.");
  } finally {
    // await delay(30_000);
    await browser.close();
  }
}

main().catch(console.error);
