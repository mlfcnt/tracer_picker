import { spinner } from "@clack/prompts";
import type { Page } from "puppeteer";
import { retry } from "./src/utils/retry";
import { delay } from "./lib";

export const accessTheCompetitionPage = async (
  page: Page,
  competitionCode: string
) => {
  const s = spinner();
  s.start("Accès à la page de la compétition...");

  try {
    await retry(
      async () => {
        // Set headers to look more like a real browser
        await page.setExtraHTTPHeaders({
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        });

        await page.goto(
          `https://inscription.ffs.fr/participant.php?code=${competitionCode}`,
          {
            waitUntil: ["domcontentloaded", "networkidle0"],
            timeout: 30000,
          }
        );

        // Attendre un peu après le chargement
        await delay(2000);
      },
      {
        maxAttempts: 3,
        delay: 5000, // Augmenté le délai entre les tentatives
        onRetry: (attempt) => {
          s.message(`Tentative ${attempt}/3 d'accès à la page...`);
        },
      }
    );

    s.stop("Accès à la page de la compétition ✅");
  } catch (error) {
    s.stop("Erreur lors de l'accès à la compétition ❌");
    throw error;
  }
};
