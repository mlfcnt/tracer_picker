import type { CommitteeCode } from "./constants";

export type CommitteeEntry = {
  committee: CommitteeCode;
  percentage: number;
  count: number;
  isHomeCommittee?: boolean;
  isPicked?: boolean;
  isHandpicked?: boolean;
  lastDate?: Date;
  occurrences?: number;
};

export type CommitteeResults = {
  manche1: CommitteeEntry[];
  manche2: CommitteeEntry[];
  manche3: CommitteeEntry[];
  manche4: CommitteeEntry[];
};

export type HistoricalEntry = {
  traceurs: {
    manche1: CommitteeCode;
    manche2: CommitteeCode;
    manche3: CommitteeCode;
    manche4: CommitteeCode;
  };
};

type HistoricalKey = `${string}_${string}_${string}_${string}`;

export type SelectionHistory = Record<HistoricalKey, HistoricalEntry>;

// Helper functions to calculate weights based on history
const calculateHistoricalWeights = (
  committees: CommitteeEntry[],
  history: SelectionHistory,
  excludeCommittee?: CommitteeCode
): CommitteeEntry[] => {
  const now = new Date();
  const occurrences = new Map<CommitteeCode, number>();
  const lastSelection = new Map<CommitteeCode, Date>();

  // Count occurrences and find last selection for each committee
  Object.entries(history).forEach(([dateKey, data]) => {
    // Créer une date à 00:00
    const dateStr = dateKey.split("_")[0].split("/").reverse().join("-");
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    Object.values(data.traceurs).forEach((committee) => {
      occurrences.set(committee, (occurrences.get(committee) || 0) + 1);
      const currentLastDate = lastSelection.get(committee);
      if (!currentLastDate || date > currentLastDate) {
        lastSelection.set(committee, date);
      }
    });
  });

  // Pour la date courante aussi
  now.setHours(0, 0, 0, 0);

  return committees.map((entry) => {
    if (excludeCommittee && entry.committee === excludeCommittee) {
      return { ...entry, percentage: 0 };
    }

    const basePercentage = entry.percentage;
    const occurrenceWeight = 1 / (occurrences.get(entry.committee) || 1);
    const lastDate = lastSelection.get(entry.committee);
    const timeWeight = lastDate
      ? Math.max(
          1,
          (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 5;

    const newPercentage = basePercentage * occurrenceWeight * timeWeight;

    console.log(`
      Comité ${entry.committee}:
      - Base %: ${basePercentage}%
      - Occurrences: ${
        occurrences.get(entry.committee) || 0
      } fois (weight: ${occurrenceWeight.toFixed(2)})
      - Dernier tirage: ${
        lastDate ? `il y a ${timeWeight.toFixed(1)} jours` : "jamais"
      } (weight: ${timeWeight.toFixed(2)})
      - Nouveau %: ${newPercentage.toFixed(2)}%
    `);

    return {
      ...entry,
      percentage: newPercentage,
      lastDate: lastSelection.get(entry.committee),
      occurrences: occurrences.get(entry.committee) || 0,
    };
  });
};

export const generateCommitteeResults = (
  committeeCounts: Record<CommitteeCode, number>,
  comiteCode: CommitteeCode,
  history: SelectionHistory
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

  return performRandomDraw(
    {
      manche1: [
        {
          committee: comiteCode,
          isHomeCommittee: true,
          count: homeCount,
          percentage: 100,
          isPicked: true,
        },
      ],
      manche2: weightedProbabilities,
      manche3: [
        {
          committee: comiteCode,
          isHomeCommittee: true,
          count: homeCount,
          percentage: 100,
          isPicked: true,
        },
      ],
      manche4: weightedProbabilities,
    },
    history
  );
};

export const performRandomDraw = (
  results: CommitteeResults,
  history: SelectionHistory
): CommitteeResults => {
  const pickFromWeightedList = (
    choices: CommitteeEntry[],
    excludeCommittee?: CommitteeCode
  ) => {
    const weightedChoices = calculateHistoricalWeights(
      choices,
      history,
      excludeCommittee
    );
    const totalPercentage = weightedChoices.reduce(
      (sum, { percentage }) => sum + percentage,
      0
    );

    const normalizedChoices = weightedChoices.map((choice) => ({
      ...choice,
      percentage: (choice.percentage / totalPercentage) * 100,
    }));

    let random = Math.random() * 100;
    const selectedIndex = normalizedChoices.findIndex(({ percentage }) => {
      random -= percentage;
      return random < 0;
    });

    return { selectedIndex, weightedChoices: normalizedChoices };
  };

  // Tire d'abord pour la manche 2
  const { selectedIndex: manche2Index, weightedChoices: manche2Weighted } =
    pickFromWeightedList(results.manche2);
  const manche2Committee = results.manche2[manche2Index].committee;

  // Tire pour la manche 4 en excluant le comité de la manche 2
  const { selectedIndex: manche4Index, weightedChoices: manche4Weighted } =
    pickFromWeightedList(results.manche4, manche2Committee);

  return {
    ...results,
    manche2: results.manche2.map((entry, index) => {
      const weightedEntry = manche2Weighted[index];
      return {
        ...entry,
        ...weightedEntry,
        isPicked: index === manche2Index,
      };
    }),
    manche4: results.manche4.map((entry, index) => {
      const weightedEntry = manche4Weighted[index];
      return {
        ...entry,
        ...weightedEntry,
        isPicked: index === manche4Index,
      };
    }),
  };
};
