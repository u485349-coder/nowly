import {
  AvailabilityState,
  BudgetMood,
  DiscordPresence,
  EnergyLevel,
  FriendshipStatus,
  HangoutIntent,
  MicroCommitment,
  MicroResponse,
  ParticipantResponse,
  Prisma,
  PrismaClient,
  SocialBattery,
  Vibe
} from "@prisma/client";

const prisma = new PrismaClient();

const demoUsers = [
  {
    phone: "+15550000001",
    name: "Avery",
    city: "New York",
    communityTag: "NYU",
    lat: 40.73061,
    lng: -73.935242,
    onboardingCompleted: true,
    responsivenessScore: 0.89,
    discordUsername: "averyloop",
    sharedServerCount: 3
  },
  {
    phone: "+15550000002",
    name: "Jordan",
    city: "New York",
    communityTag: "NYU",
    lat: 40.7321,
    lng: -73.98,
    onboardingCompleted: true,
    responsivenessScore: 0.83,
    discordUsername: "jordango",
    sharedServerCount: 2,
    discordPresence: DiscordPresence.ONLINE
  },
  {
    phone: "+15550000003",
    name: "Mina",
    city: "Brooklyn",
    communityTag: "Brooklyn crew",
    lat: 40.6782,
    lng: -73.9442,
    onboardingCompleted: true,
    responsivenessScore: 0.75,
    sharedServerCount: 1,
    discordPresence: DiscordPresence.IDLE
  },
  {
    phone: "+15550000004",
    name: "Leo",
    city: "Queens",
    communityTag: "Queens nights",
    lat: 40.7282,
    lng: -73.7949,
    onboardingCompleted: true,
    responsivenessScore: 0.66
  }
];

const sortedPair = (leftId: string, rightId: string) =>
  leftId < rightId
    ? { userAId: leftId, userBId: rightId }
    : { userAId: rightId, userBId: leftId };

const run = async () => {
  await prisma.message.deleteMany();
  await prisma.hangoutParticipant.deleteMany();
  await prisma.hangoutThread.deleteMany();
  await prisma.recapMemory.deleteMany();
  await prisma.hangout.deleteMany();
  await prisma.overlapMatch.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.availabilitySignal.deleteMany();
  await prisma.discordServerConnection.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.user.deleteMany();

  const users = [];
  for (const user of demoUsers) {
    users.push(
      await prisma.user.create({
        data: user
      })
    );
  }

  await prisma.friendship.createMany({
    data: [
      {
        ...sortedPair(users[0]!.id, users[1]!.id),
        status: FriendshipStatus.ACCEPTED
      },
      {
        ...sortedPair(users[0]!.id, users[2]!.id),
        status: FriendshipStatus.ACCEPTED
      },
      {
        ...sortedPair(users[1]!.id, users[2]!.id),
        status: FriendshipStatus.ACCEPTED
      }
    ]
  });

  await prisma.availabilitySignal.createMany({
    data: [
      {
        userId: users[0]!.id,
        state: AvailabilityState.FREE_NOW,
        radiusKm: 10,
        vibe: Vibe.COFFEE,
        energyLevel: EnergyLevel.MEDIUM,
        budgetMood: BudgetMood.LOW_SPEND,
        socialBattery: SocialBattery.OPEN,
        hangoutIntent: HangoutIntent.COFFEE_RUN,
        expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000)
      },
      {
        userId: users[1]!.id,
        state: AvailabilityState.FREE_NOW,
        radiusKm: 8,
        vibe: Vibe.FOOD,
        energyLevel: EnergyLevel.HIGH,
        budgetMood: BudgetMood.FLEXIBLE,
        socialBattery: SocialBattery.SOCIAL,
        hangoutIntent: HangoutIntent.QUICK_BITE,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
      },
      {
        userId: users[2]!.id,
        state: AvailabilityState.FREE_LATER,
        radiusKm: 12,
        vibe: Vibe.CHILL,
        energyLevel: EnergyLevel.LOW,
        budgetMood: BudgetMood.LOW_SPEND,
        socialBattery: SocialBattery.LOW_KEY,
        hangoutIntent: HangoutIntent.QUICK_CHILL,
        expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000)
      }
    ]
  });

  const hangout = await prisma.hangout.create({
    data: {
      creatorId: users[0]!.id,
      activity: "grab ramen",
      microType: HangoutIntent.QUICK_BITE,
      commitmentLevel: MicroCommitment.QUICK_WINDOW,
      locationName: "St. Marks",
      scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: "CONFIRMED",
      participants: {
        create: [
          {
            userId: users[0]!.id,
            responseStatus: ParticipantResponse.ACCEPTED,
            microResponse: MicroResponse.PULLING_UP
          },
          {
            userId: users[1]!.id,
            responseStatus: ParticipantResponse.ACCEPTED,
            microResponse: MicroResponse.TEN_MIN_ONLY
          }
        ]
      },
      thread: {
        create: {
          lastMessageAt: new Date(),
          messages: {
            create: [
              {
                senderId: users[0]!.id,
                text: "Down for noodles at 8?"
              },
              {
                senderId: users[1]!.id,
                text: "Absolutely."
              }
            ]
          }
        }
      }
    }
  });

  await prisma.recapMemory.create({
    data: {
      hangoutId: hangout.id,
      ownerId: users[0]!.id,
      title: "Noodle night streak",
      summary: "Quick plan, real night out, zero overthinking.",
      streakCount: 2,
      sharePayload: {
        cardStyle: "electric"
      } as Prisma.JsonObject
    }
  });

  console.log("Nowly seed complete");
};

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
