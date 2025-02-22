import type { CommitteeCode } from "./constants";

export type CommitteeEntry = {
  committee: CommitteeCode;
  percentage: number;
  count: number;
  isHomeCommittee?: boolean;
  picked?: boolean;
  isHandpicked?: boolean;
};

export type CommitteeResults = {
  manche1: CommitteeEntry[];
  manche2: CommitteeEntry[];
  manche3: CommitteeEntry[];
  manche4: CommitteeEntry[];
};

export const generateCommitteeResults = (
  committeeCounts: Record<CommitteeCode, number>,
  comiteCode: CommitteeCode
): CommitteeResults => {
  const nonHomeCommittees = Object.entries(committeeCounts).filter(
    ([c, count]) => c && c !== comiteCode && count > 0
  );

  const totalNonHome = nonHomeCommittees.reduce(
    (sum, [, count]) => sum + count,
    0
  );

  // Calcul des probabilités pour manche 2 et 4
  const weightedProbabilities = nonHomeCommittees.map(([committee, count]) => ({
    committee: committee as CommitteeCode,
    percentage: Math.round((count / totalNonHome) * 100) || 0,
    count,
  }));

  const homeCount = committeeCounts[comiteCode] || 0;

  return performRandomDraw({
    manche1: [
      {
        committee: comiteCode,
        isHomeCommittee: true,
        count: homeCount,
        percentage: 100,
        picked: true,
      },
    ],
    manche2: weightedProbabilities,
    manche3: [
      {
        committee: comiteCode,
        isHomeCommittee: true,
        count: homeCount,
        percentage: 100,
        picked: true,
      },
    ],
    manche4: weightedProbabilities,
  });
};

export const performRandomDraw = (
  results: CommitteeResults
): CommitteeResults => {
  const pickFromWeightedList = (
    choices: Array<{
      percentage: number;
      committee: CommitteeCode;
    }>,
    excludeCommittee?: CommitteeCode
  ) => {
    // Si on doit exclure un comité, on ajuste les pourcentages des autres
    const validChoices = excludeCommittee
      ? choices.map((choice) => ({
          ...choice,
          percentage:
            choice.committee === excludeCommittee ? 0 : choice.percentage,
        }))
      : choices;

    // Recalcule la somme totale des pourcentages
    const totalPercentage = validChoices.reduce(
      (sum, { percentage }) => sum + percentage,
      0
    );

    // Normalise les pourcentages pour qu'ils totalisent 100%
    const normalizedChoices = validChoices.map((choice) => ({
      ...choice,
      percentage: (choice.percentage / totalPercentage) * 100,
    }));

    let random = Math.random() * 100;
    return normalizedChoices.findIndex(({ percentage }) => {
      random -= percentage;
      return random < 0;
    });
  };

  // Tire d'abord pour la manche 2
  const manche2Index = pickFromWeightedList(results.manche2);
  const manche2Committee = results.manche2[manche2Index].committee;

  // Tire pour la manche 4 en excluant le comité de la manche 2
  const manche4Index = pickFromWeightedList(results.manche4, manche2Committee);

  return {
    ...results,
    manche2: results.manche2.map((entry, index) => ({
      ...entry,
      picked: index === manche2Index,
    })),
    manche4: results.manche4.map((entry, index) => ({
      ...entry,
      picked: index === manche4Index,
    })),
  };
};
