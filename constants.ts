export const COMMITTEE_CODES = {
  EQ: "EQ",
  SA: "SA",
  MB: "MB",
  AP: "AP",
  DA: "DA",
  ORS: "ORS",
  APEX: "APEX",
  MV: "MV",
  MJ: "MJ",
  PE: "PE",
  CA: "CA",
  AU: "AU",
};

export type CommitteeCode = keyof typeof COMMITTEE_CODES;

export const EXTRA_COMMITTEES_COUNT: Partial<Record<CommitteeCode, number>> = {
  APEX: 6,
  ORS: 20,
};

export const SEASON_DATES = {
  start: "15/10/2024",
  end: "30/04/2025",
};
