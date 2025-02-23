import type { Page } from "puppeteer";
import { log, spinner } from "@clack/prompts";
import { delay } from "./lib";
import { retry } from "./src/utils/retry";
import { COMMITTEE_CODES, type CommitteeCode } from "./constants";

export const accessTheSite = async (page: Page) => {
  const s = spinner();
  try {
    s.start("Accès au site des inscriptions");
    await page.goto("https://inscription.ffs.fr/competition.php");
    s.stop("Accès au site des inscriptions ✅");
  } catch (error) {
    s.stop("Erreur lors de l'accès au site ❌", 1);
    throw error;
  }
};

export const login = async (page: Page, email: string, password: string) => {
  const s = spinner();
  try {
    s.start("Connexion...");
    await clickTheLoginButton(page);
    await waitForTheLoginModalToBeVisible(page);
    await fillTheLoginForm(page, email, password);
    await clickTheValidateButton(page);
    s.stop("Connecté en tant que " + email + " ✅");
  } catch (error) {
    s.stop("Erreur lors de la connexion au site ❌", 1);
    throw error;
  }
};

export const clickTheLoginButton = async (page: Page) => {
  await page.waitForSelector("#btn_ffs_login", { visible: true });
  await page.click("#btn_ffs_login");
};

export const waitForTheLoginModalToBeVisible = async (page: Page) => {
  await page.waitForSelector(".modal-dialog", { visible: true });
};

export const fillTheLoginForm = async (
  page: Page,
  email: string,
  password: string
) => {
  await page.waitForSelector("#identification_ffs_email");
  await page.waitForSelector("#identification_ffs_password");
  await page.type("#identification_ffs_email", email);
  await page.type("#identification_ffs_password", password);
};

export const clickTheValidateButton = async (page: Page) => {
  await page.waitForSelector("#btn_ok_identification_ffs", { visible: true });
  await page.click("#btn_ok_identification_ffs");
};

export async function accessTheCompetitionPage(
  page: Page,
  competitionCode: string
) {
  const s = spinner();
  try {
    s.start("Recherche de la compétition...");

    await page.waitForNetworkIdle();
    await page.type("#num_evenement", competitionCode, { delay: 100 });
    await page.waitForNetworkIdle();
    // ici on veut filtrer les dates debut et fin de saison

    // debut: input type text name debut
    await page.waitForSelector("input[name='debut']", { visible: true });
    await page.type(
      "input[name='debut']",
      process.env.SEASON_START || "15/10/2024"
    );

    // fin: input type text name fin
    await page.waitForSelector("input[name='fin']", { visible: true });
    await page.type(
      "input[name='fin']",
      process.env.SEASON_END || "30/04/2025"
    );

    // click the search button
    await page.click("#recherche_competition");

    await delay(300);

    // Wait for results container
    await page.waitForSelector("#container_competition", { visible: true });

    await page.waitForNetworkIdle();

    // Check number of competitions found
    const competitionsCount = await page.evaluate(() => {
      const title = document.querySelector("#container_competition h2");
      const match = title?.textContent?.match(/(\d+)\s+trouvées/);
      return match ? parseInt(match[1]) : 0;
    });

    if (competitionsCount === 0) {
      log.error("Aucune compétition trouvée pour le code " + competitionCode);
      throw new Error(
        "Aucune compétition trouvée pour le code " + competitionCode
      );
    }

    if (competitionsCount > 1) {
      log.error(
        "Plusieurs compétitions trouvées pour le code " + competitionCode
      );
      throw new Error(
        `${competitionsCount} compétitions trouvées au lieu de 1`
      );
    }

    log.success("Compétition trouvée ✅");

    const url = await page.evaluate(() => {
      const url = document.querySelector("tr a") as HTMLAnchorElement;
      return url?.href;
    });
    const commiteeCode = await page.evaluate(() => {
      const commiteeCode = document.querySelector(
        "tr td:nth-child(13)"
      ) as HTMLAnchorElement;
      return commiteeCode?.textContent;
    });

    if (!commiteeCode) {
      throw new Error("Aucun comité trouvé pour la compétition");
    }

    if (!url) {
      throw new Error("Aucune url trouvée pour la compétition");
    }

    if (!COMMITTEE_CODES[commiteeCode as keyof typeof COMMITTEE_CODES]) {
      throw new Error("Comité non supporté : " + commiteeCode);
    }

    log.info("Url de la compétition : " + url);
    log.info(
      "Comité : " +
        COMMITTEE_CODES[commiteeCode as keyof typeof COMMITTEE_CODES]
    );

    await retry(
      async () => {
        await page.goto(url);
        await page.waitForNetworkIdle();
      },
      {
        delay: 1000,
        maxAttempts: 3,
      }
    );

    s.stop("Compétition trouvée ✅");
    return {
      committeeCode: commiteeCode as CommitteeCode,
    };
  } catch (error) {
    s.stop("Erreur lors de la recherche ❌");
    throw error;
  }
}
