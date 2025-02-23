import {
  intro,
  outro,
  text,
  log,
  isCancel,
  cancel,
  confirm,
} from "@clack/prompts";
import puppeteer from "puppeteer";
import { accessTheSite, login, accessTheCompetitionPage } from "./domHelpers";
import { displayResults, selectCommittees } from "./selectComittees";
import open from "open";
import { generateHtml } from "./results/generateHtml";
import fs from "fs";
import { updateManche } from "./updateManche";

// Add this type near the top of the file
type ResultsHistory = Record<
  string,
  {
    traceurs: {
      manche1?: string;
      manche2?: string;
      manche3?: string;
      manche4?: string;
    };
  }
>;

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
    // slowMo: 50,
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

    const { discipline, date, location, ...results } = await selectCommittees(
      page,
      committeeCode
    );
    displayResults(results);

    let finalResults = results;
    let isResultOk = false;

    while (!isResultOk) {
      isResultOk = (await confirm({
        message: `Ces traceurs sont-ils ok ?`,
      })) as boolean;

      if (isResultOk) {
        // Create sanitized key
        const sanitizedLocation = location.toLowerCase().replace(/\s+/g, "_");
        const sanitizedDiscipline = discipline
          .toLowerCase()
          .replace(/\s+/g, "_");
        const historyKey = `${date}_${sanitizedLocation}_${sanitizedDiscipline}`;

        // Load existing history
        let history: ResultsHistory = {};
        try {
          const existingHistory = fs.readFileSync(
            "./results/results_history.json",
            "utf-8"
          );
          history = JSON.parse(existingHistory);
        } catch (error) {
          // File doesn't exist or is invalid, start with empty history
        }

        // Add new results
        history[historyKey] = {
          traceurs: {
            manche1: finalResults.manche1.find((r) => r.picked)?.committee,
            manche2: finalResults.manche2.find((r) => r.picked)?.committee,
            manche3: finalResults.manche3.find((r) => r.picked)?.committee,
            manche4: finalResults.manche4.find((r) => r.picked)?.committee,
          },
        };

        // Save updated history
        fs.writeFileSync(
          "./results/results_history.json",
          JSON.stringify(history, null, 2)
        );
      } else {
        const { updatedResults } = await updateManche(finalResults);
        finalResults = updatedResults;
        // displayResults(finalResults);
      }
    }

    const html = generateHtml(finalResults, {
      date,
      discipline,
      location,
      homeCommittee: committeeCode,
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
