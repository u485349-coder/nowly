export const schedulingTypes = ["ONE_ON_ONE", "GROUP"] as const;
export type SchedulingType = (typeof schedulingTypes)[number];

export const schedulingDecisionModes = [
  "INSTANT_CONFIRM",
  "EVERYONE_AGREES",
  "MINIMUM_REQUIRED",
  "HOST_DECIDES",
] as const;
export type SchedulingDecisionMode = (typeof schedulingDecisionModes)[number];

export const schedulingVisibilityModes = ["PUBLIC", "ANONYMOUS"] as const;
export type SchedulingVisibilityMode = (typeof schedulingVisibilityModes)[number];

export const schedulingVoteStates = ["AVAILABLE", "MAYBE", "UNAVAILABLE"] as const;
export type SchedulingVoteState = (typeof schedulingVoteStates)[number];

export const groupSchedulingHighlightLabels = [
  "Best overall",
  "Works for everyone",
  "Best for majority",
  "Earliest possible",
] as const;
export type GroupSchedulingHighlightLabel = (typeof groupSchedulingHighlightLabels)[number];

export const collaborationPalette = [
  "#7DD3FC",
  "#A78BFA",
  "#F9A8D4",
  "#FCA5A5",
  "#FDBA74",
  "#FDE68A",
  "#86EFAC",
  "#6EE7B7",
  "#93C5FD",
  "#C4B5FD",
  "#F5D0FE",
  "#67E8F9",
] as const;

export const schedulingVoteScoreMap: Record<SchedulingVoteState, number> = {
  AVAILABLE: 2,
  MAYBE: 1,
  UNAVAILABLE: 0,
};

export type RankedSchedulingSlotInput = {
  slotId: string;
  startsAt: string | Date;
  yesCount: number;
  maybeCount: number;
  noCount: number;
  participantCap: number;
  minimumConfirmations: number;
  respondedCount: number;
  decisionMode: SchedulingDecisionMode;
};

export type RankedSchedulingSlot = RankedSchedulingSlotInput & {
  totalScore: number;
  eligible: boolean;
  rank: number;
  highlightLabel: GroupSchedulingHighlightLabel | null;
};

const toDateValue = (value: string | Date) =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

const getUnanimousThreshold = (participantCap: number, minimumConfirmations: number) =>
  Math.max(2, participantCap, minimumConfirmations);

export const getSchedulingSlotEligibility = (input: RankedSchedulingSlotInput) => {
  const { decisionMode, minimumConfirmations, participantCap, respondedCount, yesCount, noCount } =
    input;

  if (decisionMode === "INSTANT_CONFIRM") {
    return yesCount >= 1;
  }

  if (decisionMode === "EVERYONE_AGREES") {
    const threshold = getUnanimousThreshold(participantCap, minimumConfirmations);
    return respondedCount >= threshold && yesCount >= threshold && noCount === 0;
  }

  if (decisionMode === "MINIMUM_REQUIRED") {
    return yesCount >= Math.max(2, minimumConfirmations);
  }

  return respondedCount >= Math.max(2, minimumConfirmations) && yesCount > 0;
};

export const rankSchedulingSlots = (inputs: RankedSchedulingSlotInput[]): RankedSchedulingSlot[] => {
  const ranked = inputs
    .map((input) => ({
      ...input,
      totalScore:
        input.yesCount * schedulingVoteScoreMap.AVAILABLE +
        input.maybeCount * schedulingVoteScoreMap.MAYBE,
      eligible: getSchedulingSlotEligibility(input),
      rank: 0,
      highlightLabel: null as GroupSchedulingHighlightLabel | null,
    }))
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (right.yesCount !== left.yesCount) {
        return right.yesCount - left.yesCount;
      }

      if (left.noCount !== right.noCount) {
        return left.noCount - right.noCount;
      }

      return toDateValue(left.startsAt) - toDateValue(right.startsAt);
    })
    .map((slot, index) => ({
      ...slot,
      rank: index + 1,
    }));

  const firstEligible = ranked.find((slot) => slot.eligible) ?? null;

  return ranked.map((slot, index) => {
    let highlightLabel: GroupSchedulingHighlightLabel | null = null;

    if (slot.decisionMode === "EVERYONE_AGREES" && slot.eligible) {
      highlightLabel = "Works for everyone";
    } else if (slot.eligible && firstEligible?.slotId === slot.slotId) {
      highlightLabel = slot.decisionMode === "MINIMUM_REQUIRED" ? "Best for majority" : "Best overall";
    } else if (index === 0) {
      highlightLabel = "Best overall";
    }

    if (
      slot.eligible &&
      firstEligible &&
      firstEligible.slotId !== slot.slotId &&
      toDateValue(slot.startsAt) < toDateValue(firstEligible.startsAt)
    ) {
      highlightLabel = "Earliest possible";
    }

    return {
      ...slot,
      highlightLabel,
    };
  });
};
