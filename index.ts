import { intro, outro, text, log, isCancel, cancel } from "@clack/prompts";
import puppeteer from "puppeteer";
import { accessTheSite, login, accessTheCompetitionPage } from "./domHelpers";
import { selectCommittees } from "./selectComittees";
import open from "open";
import { generateHtml } from "./results/generateHtml";
import fs from "fs";

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

  intro(`Tracer picker v1 ⛷️`);
  // Get user inputs
  const competitionCode = (await text({
    message: "Quel est le code de la competition ?",
    placeholder: "0000",
    validate: (value) => {
      if (!value) return "Veuillez entrer un code";
      if (isNaN(Number(value)))
        return "Le code doit contenir uniquement des chiffres";
      if (value.length !== 4) return "Le code doit contenir 4 chiffres";
    },
  })) as string;

  if (isCancel(competitionCode)) {
    cancel("Opération annulée.");
    outro("Martin Constructions vous remercie pour votre confiance.");
    process.exit(0);
  }

  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
    args: ["--window-size=1920,1080"],
  });

  const page = await browser.newPage();

  try {
    await accessTheSite(page);
    await login(page, process.env.EMAIL, process.env.PASSWORD);
    const { committeeCode } = await accessTheCompetitionPage(
      page,
      competitionCode
    );

    const { discipline, date, ...results } = await selectCommittees(
      page,
      committeeCode
    );

    const html = generateHtml(results, {
      date,
      discipline,
    });

    fs.writeFileSync("./results/results.html", html);
    await open("./results/results.html");

    outro("Martin Constructions vous remercie pour votre confiance.");
  } catch (error) {
    console.error("Erreur lors du processus :", error);
    log.error("Erreur lors de la recherche de la compétition");
    outro("Martin Constructions s'excuse pour la gêne occasionnée.");
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
