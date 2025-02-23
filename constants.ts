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
