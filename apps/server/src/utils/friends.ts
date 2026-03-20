export const normalizeFriendPair = (leftId: string, rightId: string) =>
  leftId < rightId ? [leftId, rightId] : [rightId, leftId];
