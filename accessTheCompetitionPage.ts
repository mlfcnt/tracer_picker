import { spinner } from "@clack/prompts";
import type { Page } from "puppeteer";
import { retry } from "./src/utils/retry";

export const accessTheCompetitionPage = async (
  page: Page,
  competitionCode: string
) => {
  const s = spinner();
  s.start("Accès à la page de la compétition...");

  try {
    await retry(
      async () => {
        await page.goto(
          `https://inscription.ffs.fr/participant.php?code=${competitionCode}`,
          { waitUntil: "networkidle0" } // Wait until network is idle
        );
      },
      {
        maxAttempts: 3,
        delay: 2000,
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
