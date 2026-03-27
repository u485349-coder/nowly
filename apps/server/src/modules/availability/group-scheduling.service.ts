import {
  MessageType,
  MicroCommitment,
  ParticipantResponse,
  Prisma,
  SchedulingDecisionMode,
  SchedulingSessionStatus,
  SchedulingVisibilityMode,
  SchedulingVoteState,
} from "@prisma/client";
import {
  collaborationPalette,
  rankSchedulingSlots,
  type MobileBookingProfile,
  type MobileGroupSchedulingMessage,
  type MobileGroupSchedulingSession,
  type MobileGroupSchedulingSlot,
  type MobileGroupSchedulingVote,
} from "@nowly/shared";
import { prisma } from "../../db/prisma.js";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HORIZON_DAYS = 28;
const MAX_GROUP_SLOTS = 42;

type DateSpecificWindowInput = {
  dateKey: string;
  startMinute: number;
  endMinute: number;
};

type CreateGroupSchedulingSessionInput = {
  hostId: string;
  title: string;
  description?: string | null;
  locationName: string;
  durationMinutes: number;
  timezone: string;
  participantCap: number;
  minimumConfirmations: number;
  decisionMode: SchedulingDecisionMode;
  visibilityMode: SchedulingVisibilityMode;
  responseDeadline?: Date | null;
  dateSpecificWindows: DateSpecificWindowInput[];
};

const mobileUserSelect = {
  id: true,
  name: true,
  city: true,
  communityTag: true,
  photoUrl: true,
  phone: true,
  inviteCode: true,
  responsivenessScore: true,
  discordUsername: true,
  sharedServerCount: true,
  notificationIntensity: true,
} satisfies Prisma.UserSelect;

type SessionGraph = Prisma.SchedulingSessionGetPayload<{
  include: {
    host: {
      select: typeof mobileUserSelect;
    };
    slots: {
      orderBy: { startsAt: "asc" };
      include: {
        votes: {
          include: {
            participant: {
              include: {
                user: {
                  select: typeof mobileUserSelect;
                };
              };
            };
          };
        };
      };
    };
    participants: {
      orderBy: { joinedAt: "asc" };
      include: {
        user: {
          select: typeof mobileUserSelect;
        };
      };
    };
    messages: {
      orderBy: { createdAt: "asc" };
      take: 80;
      include: {
        senderParticipant: {
          include: {
            user: {
              select: typeof mobileUserSelect;
            };
          };
        };
      };
    };
  };
}>;

const startOfPseudoLocalDayMs = (offsetMinutes: number) => {
  const pseudoLocalNow = new Date(Date.now() - offsetMinutes * MINUTE_MS);
  return Date.UTC(
    pseudoLocalNow.getUTCFullYear(),
    pseudoLocalNow.getUTCMonth(),
    pseudoLocalNow.getUTCDate(),
  );
};

const listRecurringOccurrences = (
  window: Prisma.RecurringAvailabilityWindowGetPayload<Record<string, never>>,
  horizonDays = HORIZON_DAYS,
) => {
  const localStartDayMs = startOfPseudoLocalDayMs(window.utcOffsetMinutes);
  const occurrences: Array<{ startsAt: Date; endsAt: Date }> = [];

  for (let index = 0; index < horizonDays; index += 1) {
    const localMidnightMs = localStartDayMs + index * DAY_MS;
    const localDate = new Date(localMidnightMs);
    const dayOfWeek = localDate.getUTCDay();
    const dayOfMonth = localDate.getUTCDate();
    const applies =
      (window.recurrence === "WEEKLY" && window.dayOfWeek === dayOfWeek) ||
      (window.recurrence === "MONTHLY" && window.dayOfMonth === dayOfMonth);

    if (!applies) {
      continue;
    }

    const startsAt = new Date(
      localMidnightMs + (window.startMinute + window.utcOffsetMinutes) * MINUTE_MS,
    );
    const endsAt = new Date(
      localMidnightMs + (window.endMinute + window.utcOffsetMinutes) * MINUTE_MS,
    );

    if (endsAt.getTime() <= Date.now() + 15 * MINUTE_MS) {
      continue;
    }

    occurrences.push({ startsAt, endsAt });
  }

  return occurrences;
};

const buildDateSpecificOccurrence = (window: DateSpecificWindowInput) => {
  const [year, month, day] = window.dateKey.split("-").map(Number);
  const startsAt = new Date(
    year,
    (month || 1) - 1,
    day || 1,
    Math.floor(window.startMinute / 60),
    window.startMinute % 60,
  );
  const endsAt = new Date(
    year,
    (month || 1) - 1,
    day || 1,
    Math.floor(window.endMinute / 60),
    window.endMinute % 60,
  );

  if (endsAt.getTime() <= startsAt.getTime() || endsAt.getTime() <= Date.now() + 15 * MINUTE_MS) {
    return null;
  }

  return { startsAt, endsAt };
};

const sliceOccurrenceIntoSlots = (
  occurrence: { startsAt: Date; endsAt: Date },
  durationMinutes: number,
) => {
  const slots: Array<{ startsAt: Date; endsAt: Date }> = [];
  const incrementMs = durationMinutes * MINUTE_MS;

  for (
    let cursor = occurrence.startsAt.getTime();
    cursor + incrementMs <= occurrence.endsAt.getTime();
    cursor += incrementMs
  ) {
    slots.push({
      startsAt: new Date(cursor),
      endsAt: new Date(cursor + incrementMs),
    });
  }

  return slots;
};

const toMobileUser = (
  user: Prisma.UserGetPayload<{ select: typeof mobileUserSelect }>,
) => ({
  id: user.id,
  name: user.name ?? "Nowly user",
  city: user.city ?? "Nearby",
  communityTag: user.communityTag ?? null,
  photoUrl: user.photoUrl ?? null,
  phone: user.phone,
  inviteCode: user.inviteCode,
  responsivenessScore: user.responsivenessScore,
  discordUsername: user.discordUsername ?? null,
  sharedServerCount: user.sharedServerCount ?? 0,
  notificationIntensity: user.notificationIntensity,
});

const getCollaborationColor = (index: number) =>
  collaborationPalette[index % collaborationPalette.length] ?? collaborationPalette[0];

const getCollaborationVariant = (index: number) =>
  Math.floor(index / collaborationPalette.length);

const formatSlotLabel = (startsAt: Date, endsAt: Date, timezone: string) =>
  `${startsAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  })} · ${startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  })} - ${endsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  })}`;

const isEditingLocked = (session: Pick<SessionGraph, "status" | "pollLockedAt" | "finalizedAt" | "responseDeadline">) => {
  if (session.finalizedAt || session.status === SchedulingSessionStatus.FINALIZED) {
    return true;
  }

  if (session.pollLockedAt || session.status === SchedulingSessionStatus.LOCKED) {
    return true;
  }

  if (session.responseDeadline && session.responseDeadline.getTime() <= Date.now()) {
    return true;
  }

  if (session.status === SchedulingSessionStatus.EXPIRED || session.status === SchedulingSessionStatus.CANCELLED) {
    return true;
  }

  return false;
};

const ensureParticipantForSession = async (
  tx: Prisma.TransactionClient,
  session: Pick<SessionGraph, "id" | "participantCap" | "hostId">,
  userId: string,
) => {
  const existing = await tx.schedulingSessionParticipant.findUnique({
    where: {
      sessionId_userId: {
        sessionId: session.id,
        userId,
      },
    },
  });

  if (existing) {
    return tx.schedulingSessionParticipant.update({
      where: { id: existing.id },
      data: { lastActiveAt: new Date() },
    });
  }

  const count = await tx.schedulingSessionParticipant.count({
    where: { sessionId: session.id },
  });

  if (count >= session.participantCap) {
    return null;
  }

  return tx.schedulingSessionParticipant.create({
    data: {
      sessionId: session.id,
      userId,
      isHost: userId === session.hostId,
      collaborationIndex: count,
      lastActiveAt: new Date(),
    },
  });
};

const createSystemMessage = async (
  tx: Prisma.TransactionClient,
  sessionId: string,
  text: string,
  metadata?: Prisma.JsonObject,
) =>
  tx.schedulingSessionMessage.create({
    data: {
      sessionId,
      text,
      type: MessageType.SYSTEM,
      metadata,
    },
  });

const loadSessionGraph = async (shareCode: string) =>
  prisma.schedulingSession.findUnique({
    where: { shareCode },
    include: {
      host: {
        select: mobileUserSelect,
      },
      slots: {
        orderBy: { startsAt: "asc" },
        include: {
          votes: {
            include: {
              participant: {
                include: {
                  user: {
                    select: mobileUserSelect,
                  },
                },
              },
            },
          },
        },
      },
      participants: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: mobileUserSelect,
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 80,
        include: {
          senderParticipant: {
            include: {
              user: {
                select: mobileUserSelect,
              },
            },
          },
        },
      },
    },
  });

const serializeSession = (
  session: SessionGraph,
  viewerId?: string | null,
): MobileGroupSchedulingSession => {
  const currentParticipant =
    (viewerId
      ? session.participants.find((participant) => participant.userId === viewerId)
      : null) ?? null;
  const editingLocked = isEditingLocked(session);
  const deadlinePassed = Boolean(
    session.responseDeadline && session.responseDeadline.getTime() <= Date.now(),
  );
  const respondedCount = session.participants.filter((participant) => participant.hasSubmittedAvailability).length;
  const waitingCount = Math.max(0, session.participantCap - respondedCount);

  const rankedSlots = rankSchedulingSlots(
    session.slots.map((slot) => {
      const yesCount = slot.votes.filter((vote) => vote.status === SchedulingVoteState.AVAILABLE).length;
      const maybeCount = slot.votes.filter((vote) => vote.status === SchedulingVoteState.MAYBE).length;
      const noCount = slot.votes.filter((vote) => vote.status === SchedulingVoteState.UNAVAILABLE).length;

      return {
        slotId: slot.id,
        startsAt: slot.startsAt.toISOString(),
        yesCount,
        maybeCount,
        noCount,
        participantCap: session.participantCap,
        minimumConfirmations: session.minimumConfirmations,
        respondedCount,
        decisionMode: session.decisionMode as never,
      };
    }),
  );

  const rankedById = new Map(rankedSlots.map((slot) => [slot.slotId, slot]));

  const slots: MobileGroupSchedulingSlot[] = session.slots.map((slot) => {
    const ranked = rankedById.get(slot.id);
    const voters: MobileGroupSchedulingVote[] =
      session.visibilityMode === SchedulingVisibilityMode.ANONYMOUS
        ? []
        : slot.votes
            .slice()
            .sort((left, right) => {
              const order = {
                [SchedulingVoteState.AVAILABLE]: 0,
                [SchedulingVoteState.MAYBE]: 1,
                [SchedulingVoteState.UNAVAILABLE]: 2,
              };

              if (order[left.status] !== order[right.status]) {
                return order[left.status] - order[right.status];
              }

              return (left.participant.user.name ?? "").localeCompare(right.participant.user.name ?? "");
            })
            .map((vote) => ({
              participantId: vote.participantId,
              userId: vote.participant.userId,
              name: vote.participant.user.name ?? "Friend",
              photoUrl: vote.participant.user.photoUrl ?? null,
              collaborationColor: getCollaborationColor(vote.participant.collaborationIndex),
              collaborationVariant: getCollaborationVariant(vote.participant.collaborationIndex),
              status: vote.status as never,
            }));

    return {
      id: slot.id,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      label: formatSlotLabel(slot.startsAt, slot.endsAt, session.timezone),
      totalScore: ranked?.totalScore ?? 0,
      yesCount: ranked?.yesCount ?? 0,
      maybeCount: ranked?.maybeCount ?? 0,
      noCount: ranked?.noCount ?? 0,
      eligible: ranked?.eligible ?? false,
      isFinal: session.finalizedSlotId === slot.id,
      rank: ranked?.rank ?? session.slots.length,
      highlightLabel: ranked?.highlightLabel ?? null,
      voters,
    };
  });

  const bestFits = slots
    .slice()
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
    })
    .slice(0, 4);

  const currentUserHasSubmittedAvailability = Boolean(currentParticipant?.hasSubmittedAvailability);
  const canFinalize =
    !session.finalizedAt &&
    slots.some((slot) => slot.eligible) &&
    Boolean(
      currentParticipant &&
        (session.decisionMode === SchedulingDecisionMode.HOST_DECIDES
          ? currentParticipant.isHost
          : true),
    );
  const decisionHint =
    session.decisionMode === SchedulingDecisionMode.EVERYONE_AGREES
      ? `Waiting for ${Math.max(session.participantCap, session.minimumConfirmations)} yes votes on the same slot.`
      : session.decisionMode === SchedulingDecisionMode.MINIMUM_REQUIRED
        ? `${session.minimumConfirmations} yes votes can lock a time.`
        : session.decisionMode === SchedulingDecisionMode.HOST_DECIDES
          ? `Once ${session.minimumConfirmations} people respond, the host can lock the best slot.`
          : "1:1 links still confirm instantly.";

  const progressSummary =
    session.decisionMode === SchedulingDecisionMode.MINIMUM_REQUIRED
      ? `${respondedCount} of ${session.participantCap} responded · ${Math.min(
          session.minimumConfirmations,
          respondedCount,
        )} of ${session.minimumConfirmations} minimum ready`
      : `${respondedCount} of ${session.participantCap} responded`;

  const messages: MobileGroupSchedulingMessage[] = session.messages.map((message) => ({
    id: message.id,
    text: message.text,
    type: message.type === MessageType.SYSTEM ? "SYSTEM" : "TEXT",
    createdAt: message.createdAt.toISOString(),
    sender: message.senderParticipant
      ? {
          id: message.senderParticipant.user.id,
          name: message.senderParticipant.user.name ?? "Friend",
          photoUrl: message.senderParticipant.user.photoUrl ?? null,
        }
      : null,
    collaborationColor: message.senderParticipant
      ? getCollaborationColor(message.senderParticipant.collaborationIndex)
      : null,
    collaborationVariant: message.senderParticipant
      ? getCollaborationVariant(message.senderParticipant.collaborationIndex)
      : null,
  }));

  return {
    id: session.id,
    shareCode: session.shareCode,
    schedulingType: session.schedulingType as never,
    title: session.title,
    description: session.description,
    locationName: session.locationName,
    durationMinutes: session.durationMinutes,
    timezone: session.timezone,
    participantCap: session.participantCap,
    minimumConfirmations: session.minimumConfirmations,
    decisionMode: session.decisionMode as never,
    visibilityMode: session.visibilityMode as never,
    responseDeadline: session.responseDeadline?.toISOString() ?? null,
    editingLocked,
    hostLocked: Boolean(session.pollLockedAt || session.status === SchedulingSessionStatus.LOCKED),
    finalizedAt: session.finalizedAt?.toISOString() ?? null,
    finalHangoutId: session.finalHangoutId ?? null,
    finalSlotId: session.finalizedSlotId ?? null,
    participantCount: session.participants.length,
    participants: session.participants.map((participant) => ({
      id: participant.id,
      user: toMobileUser(participant.user),
      isHost: participant.isHost,
      collaborationColor: getCollaborationColor(participant.collaborationIndex),
      collaborationVariant: getCollaborationVariant(participant.collaborationIndex),
      hasSubmittedAvailability: participant.hasSubmittedAvailability,
      submittedAt: participant.submittedAt?.toISOString() ?? null,
      lastActiveAt: participant.lastActiveAt?.toISOString() ?? null,
    })),
    slots,
    bestFits,
    progress: {
      respondedCount,
      participantCap: session.participantCap,
      waitingCount,
      minimumConfirmations: session.minimumConfirmations,
      responseDeadline: session.responseDeadline?.toISOString() ?? null,
      deadlinePassed,
      summary: progressSummary,
      decisionHint,
    },
    messages,
    currentUserParticipantId: currentParticipant?.id ?? null,
    currentUserHasSubmittedAvailability,
    currentUserCanEdit: Boolean(currentParticipant && !editingLocked),
    currentUserCanFinalize: canFinalize,
    currentUserIsHost: Boolean(currentParticipant?.isHost),
    canFinalize,
  };
};

export const createGroupSchedulingSession = async (
  input: CreateGroupSchedulingSessionInput,
) => {
  const host = await prisma.user.findUnique({
    where: { id: input.hostId },
    select: mobileUserSelect,
  });

  if (!host) {
    throw new Error("Host not found.");
  }

  const recurringWindows = await prisma.recurringAvailabilityWindow.findMany({
    where: {
      userId: input.hostId,
      isActive: true,
    },
    orderBy: [{ recurrence: "asc" }, { startMinute: "asc" }],
  });

  const recurringOccurrences = recurringWindows.flatMap((window) => listRecurringOccurrences(window));
  const exactOccurrences = input.dateSpecificWindows
    .map((window) => buildDateSpecificOccurrence(window))
    .filter(Boolean) as Array<{ startsAt: Date; endsAt: Date }>;
  const slotMap = new Map<string, { startsAt: Date; endsAt: Date }>();

  [...recurringOccurrences, ...exactOccurrences]
    .flatMap((occurrence) => sliceOccurrenceIntoSlots(occurrence, input.durationMinutes))
    .forEach((slot) => {
      const key = `${slot.startsAt.toISOString()}:${slot.endsAt.toISOString()}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, slot);
      }
    });

  const slots = [...slotMap.values()]
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
    .slice(0, MAX_GROUP_SLOTS);

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.schedulingSession.create({
      data: {
        hostId: input.hostId,
        schedulingType: "GROUP",
        title: input.title,
        description: input.description?.trim() || "",
        locationName: input.locationName,
        durationMinutes: input.durationMinutes,
        timezone: input.timezone,
        participantCap: input.participantCap,
        minimumConfirmations: input.minimumConfirmations,
        decisionMode: input.decisionMode,
        visibilityMode: input.visibilityMode,
        responseDeadline: input.responseDeadline ?? null,
        participants: {
          create: {
            userId: input.hostId,
            isHost: true,
            collaborationIndex: 0,
            lastActiveAt: new Date(),
          },
        },
        slots: {
          create: slots.map((slot, index) => ({
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            sortOrder: index,
          })),
        },
      },
    });

    await createSystemMessage(
      tx,
      created.id,
      `${host.name ?? "Host"} opened group scheduling for ${input.title}.`,
    );

    return created;
  });

  const graph = await loadSessionGraph(session.shareCode);

  if (!graph) {
    throw new Error("Group session could not be created.");
  }

  return {
    host: toMobileUser(host),
    session: serializeSession(graph, input.hostId),
  };
};

export const fetchGroupSchedulingProfile = async (
  shareCode: string,
  viewerId?: string | null,
): Promise<MobileBookingProfile | null> => {
  const baseSession = await prisma.schedulingSession.findUnique({
    where: { shareCode },
    select: {
      id: true,
      participantCap: true,
      hostId: true,
    },
  });

  if (!baseSession) {
    return null;
  }

  if (viewerId) {
    await prisma.$transaction(async (tx) => {
      await ensureParticipantForSession(tx, baseSession, viewerId);
    });
  }

  const session = await loadSessionGraph(shareCode);

  if (!session) {
    return null;
  }

  return {
    type: "GROUP",
    host: toMobileUser(session.host),
    session: serializeSession(session, viewerId),
    viewerHasRecurringSchedule: false,
  };
};

export const submitGroupSchedulingAvailability = async (
  shareCode: string,
  userId: string,
  votes: Array<{ slotId: string; status: SchedulingVoteState }>,
) => {
  const session = await prisma.schedulingSession.findUnique({
    where: { shareCode },
    select: {
      id: true,
      hostId: true,
      participantCap: true,
      finalizedAt: true,
      responseDeadline: true,
      pollLockedAt: true,
      status: true,
      slots: {
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
        },
      },
    },
  });

  if (!session) {
    throw new Error("Scheduling session not found.");
  }

  if (isEditingLocked(session)) {
    throw new Error("This scheduling poll is locked.");
  }

  const slotIdSet = new Set(session.slots.map((slot) => slot.id));
  if (!votes.length || votes.some((vote) => !slotIdSet.has(vote.slotId))) {
    throw new Error("Pick valid slots before submitting availability.");
  }

  await prisma.$transaction(async (tx) => {
    const participant = await ensureParticipantForSession(tx, session, userId);

    if (!participant) {
      throw new Error("This group session is full.");
    }

    const existingVotes = await tx.schedulingSessionVote.findMany({
      where: {
        sessionId: session.id,
        participantId: participant.id,
      },
      include: {
        slot: true,
      },
    });
    const existingBySlotId = new Map(existingVotes.map((vote) => [vote.slotId, vote]));
    const changedVotes = votes.filter(
      (vote) => existingBySlotId.get(vote.slotId)?.status !== vote.status,
    );

    await tx.schedulingSessionVote.deleteMany({
      where: {
        sessionId: session.id,
        participantId: participant.id,
      },
    });

    await tx.schedulingSessionVote.createMany({
      data: votes.map((vote) => ({
        sessionId: session.id,
        slotId: vote.slotId,
        participantId: participant.id,
        status: vote.status,
      })),
    });

    await tx.schedulingSessionParticipant.update({
      where: { id: participant.id },
      data: {
        hasSubmittedAvailability: true,
        submittedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    const participantUser = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true },
    });

    const headline =
      changedVotes.length === 1
        ? (() => {
            const slot = session.slots.find((item) => item.id === changedVotes[0].slotId);
            const stateLabel =
              changedVotes[0].status === SchedulingVoteState.AVAILABLE
                ? "Available"
                : changedVotes[0].status === SchedulingVoteState.MAYBE
                  ? "Maybe"
                  : "Unavailable";

            return `${participantUser.name ?? "Someone"} marked ${slot ? formatSlotLabel(slot.startsAt, slot.endsAt, "UTC") : "a slot"} as ${stateLabel}.`;
          })()
        : existingVotes.length
          ? `${participantUser.name ?? "Someone"} updated availability.`
          : `${participantUser.name ?? "Someone"} submitted availability.`;

    await createSystemMessage(tx, session.id, headline);
  });

  const graph = await loadSessionGraph(shareCode);

  if (!graph) {
    throw new Error("Scheduling session not found.");
  }

  return serializeSession(graph, userId);
};

export const postGroupSchedulingMessage = async (
  shareCode: string,
  userId: string,
  text: string,
) => {
  const session = await prisma.schedulingSession.findUnique({
    where: { shareCode },
    select: {
      id: true,
      hostId: true,
      participantCap: true,
      status: true,
      finalizedAt: true,
      responseDeadline: true,
      pollLockedAt: true,
    },
  });

  if (!session) {
    throw new Error("Scheduling session not found.");
  }

  const message = await prisma.$transaction(async (tx) => {
    const participant = await ensureParticipantForSession(tx, session, userId);

    if (!participant) {
      throw new Error("This group session is full.");
    }

    await tx.schedulingSessionParticipant.update({
      where: { id: participant.id },
      data: { lastActiveAt: new Date() },
    });

    return tx.schedulingSessionMessage.create({
      data: {
        sessionId: session.id,
        senderParticipantId: participant.id,
        text,
        type: MessageType.TEXT,
      },
      include: {
        senderParticipant: {
          include: {
            user: {
              select: mobileUserSelect,
            },
          },
        },
      },
    });
  });

  const senderParticipant = message.senderParticipant;

  return {
    id: message.id,
    text: message.text,
    type: "TEXT" as const,
    createdAt: message.createdAt.toISOString(),
    sender: senderParticipant
      ? {
          id: senderParticipant.user.id,
          name: senderParticipant.user.name ?? "Friend",
          photoUrl: senderParticipant.user.photoUrl ?? null,
        }
      : null,
    collaborationColor: senderParticipant
      ? getCollaborationColor(senderParticipant.collaborationIndex)
      : null,
    collaborationVariant: senderParticipant
      ? getCollaborationVariant(senderParticipant.collaborationIndex)
      : null,
  };
};

export const finalizeGroupSchedulingSession = async (
  shareCode: string,
  userId: string,
  slotId: string,
) => {
  const session = await loadSessionGraph(shareCode);

  if (!session) {
    throw new Error("Scheduling session not found.");
  }

  if (session.finalizedAt) {
    return serializeSession(session, userId);
  }

  const rankedSlots = rankSchedulingSlots(
    session.slots.map((slot) => ({
      slotId: slot.id,
      startsAt: slot.startsAt.toISOString(),
      yesCount: slot.votes.filter((vote) => vote.status === SchedulingVoteState.AVAILABLE).length,
      maybeCount: slot.votes.filter((vote) => vote.status === SchedulingVoteState.MAYBE).length,
      noCount: slot.votes.filter((vote) => vote.status === SchedulingVoteState.UNAVAILABLE).length,
      participantCap: session.participantCap,
      minimumConfirmations: session.minimumConfirmations,
      respondedCount: session.participants.filter((participant) => participant.hasSubmittedAvailability).length,
      decisionMode: session.decisionMode as never,
    })),
  );
  const rankedSlot = rankedSlots.find((slot) => slot.slotId === slotId);

  if (!rankedSlot?.eligible) {
    throw new Error("That slot is not ready to finalize yet.");
  }

  const currentParticipant = session.participants.find((participant) => participant.userId === userId);
  if (!currentParticipant) {
    throw new Error("Join the group session before finalizing.");
  }

  if (
    session.decisionMode === SchedulingDecisionMode.HOST_DECIDES &&
    currentParticipant.userId !== session.hostId
  ) {
    throw new Error("Only the host can lock a final time in this session.");
  }

  const targetSlot = session.slots.find((slot) => slot.id === slotId);
  if (!targetSlot) {
    throw new Error("That slot no longer exists.");
  }

  await prisma.$transaction(async (tx) => {
    const freshSession = await tx.schedulingSession.findUniqueOrThrow({
      where: { id: session.id },
      include: {
        participants: {
          include: {
            user: {
              select: { name: true },
            },
            votes: {
              where: { slotId },
            },
          },
        },
      },
    });

    if (freshSession.finalizedAt) {
      return;
    }

    const participantsForHangout = freshSession.participants
      .filter((participant) => {
        if (participant.userId === freshSession.hostId) {
          return true;
        }

        const vote = participant.votes[0];
        return vote && vote.status !== SchedulingVoteState.UNAVAILABLE;
      })
      .map((participant) => ({
        userId: participant.userId,
        responseStatus:
          participant.userId === freshSession.hostId ||
          participant.votes[0]?.status === SchedulingVoteState.AVAILABLE
            ? ParticipantResponse.ACCEPTED
            : ParticipantResponse.SUGGESTED_CHANGE,
      }));

    const hangout = await tx.hangout.create({
      data: {
        creatorId: freshSession.hostId,
        activity: freshSession.title,
        commitmentLevel:
          freshSession.durationMinutes <= 90
            ? MicroCommitment.QUICK_WINDOW
            : MicroCommitment.OPEN_ENDED,
        locationName: freshSession.locationName,
        scheduledFor: targetSlot.startsAt,
        status: "CONFIRMED",
        participants: {
          create: participantsForHangout,
        },
        thread: {
          create: {
            lastMessageAt: new Date(),
            messages: {
              create: {
                senderId: freshSession.hostId,
                text: `Group scheduling locked ${freshSession.title} for ${targetSlot.startsAt.toISOString()}.`,
                type: MessageType.SYSTEM,
              },
            },
          },
        },
      },
    });

    await tx.schedulingSession.update({
      where: { id: freshSession.id },
      data: {
        finalizedAt: new Date(),
        finalizedSlotId: slotId,
        finalHangoutId: hangout.id,
        pollLockedAt: new Date(),
        status: SchedulingSessionStatus.FINALIZED,
      },
    });

    await createSystemMessage(
      tx,
      freshSession.id,
      `${currentParticipant.user.name ?? "Someone"} finalized ${freshSession.title} for ${formatSlotLabel(
        targetSlot.startsAt,
        targetSlot.endsAt,
        freshSession.timezone,
      )}.`,
      {
        slotId,
        hangoutId: hangout.id,
      },
    );
  });

  const graph = await loadSessionGraph(shareCode);

  if (!graph) {
    throw new Error("Scheduling session not found.");
  }

  return serializeSession(graph, userId);
};

export const lockGroupSchedulingPoll = async (shareCode: string, userId: string) => {
  const session = await prisma.schedulingSession.findUnique({
    where: { shareCode },
    include: {
      host: {
        select: { name: true },
      },
    },
  });

  if (!session) {
    throw new Error("Scheduling session not found.");
  }

  if (session.hostId !== userId) {
    throw new Error("Only the host can lock this poll.");
  }

  if (session.finalizedAt) {
    throw new Error("This scheduling poll has already been finalized.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.schedulingSession.update({
      where: { id: session.id },
      data: {
        pollLockedAt: new Date(),
        status: SchedulingSessionStatus.LOCKED,
      },
    });

    await createSystemMessage(
      tx,
      session.id,
      `${session.host.name ?? "Host"} locked the poll. Availability edits are closed now.`,
    );
  });

  const graph = await loadSessionGraph(shareCode);

  if (!graph) {
    throw new Error("Scheduling session not found.");
  }

  return serializeSession(graph, userId);
};
