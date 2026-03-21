import { DiscordPresence } from "@prisma/client";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createSmartOpenLinkForTargets } from "../../utils/links.js";

const redirectSchema = z.object({
  redirectUri: z.string().url().optional()
});

const exchangeSchema = z.object({
  code: z.string(),
  redirectUri: z.string().url().optional()
});

const presenceSchema = z.object({
  presence: z.nativeEnum(DiscordPresence)
});

export const discordRouter = Router();

discordRouter.get(
  "/oauth-url",
  requireAuth,
  asyncHandler(async (request, response) => {
    const query = redirectSchema.parse(request.query);
    const redirectUri =
      query.redirectUri ?? env.DISCORD_REDIRECT_URI ?? "nowly://discord/callback";
    const url = new URL("https://discord.com/api/oauth2/authorize");
    url.searchParams.set("client_id", env.DISCORD_CLIENT_ID ?? "");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "identify guilds");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", request.userId!);

    response.json({ data: { url: url.toString() } });
  })
);

discordRouter.post(
  "/link",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = exchangeSchema.parse(request.body);
    const redirectUri =
      body.redirectUri ?? env.DISCORD_REDIRECT_URI ?? "nowly://discord/callback";

    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
      response.status(StatusCodes.BAD_REQUEST).json({
        error: "Discord is not configured"
      });
      return;
    }

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: body.code,
        redirect_uri: redirectUri
      })
    });

    const tokenJson = (await tokenResponse.json()) as {
      access_token: string;
    };

    const [profileResponse, guildResponse] = await Promise.all([
      fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` }
      }),
      fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` }
      })
    ]);

    const profile = (await profileResponse.json()) as {
      id: string;
      username: string;
      avatar: string | null;
    };
    const guilds = (await guildResponse.json()) as Array<{ id: string }>;

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: request.userId },
        data: {
          discordId: profile.id,
          discordUsername: profile.username,
          discordAvatar: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null
        }
      });

      await transaction.discordServerConnection.deleteMany({
        where: { userId: request.userId }
      });

      if (guilds.length) {
        await transaction.discordServerConnection.createMany({
          data: guilds.map((guild) => ({
            userId: request.userId!,
            serverId: guild.id
          })),
          skipDuplicates: true
        });
      }

      const sharedUsers = await transaction.discordServerConnection.groupBy({
        by: ["userId"],
        where: {
          serverId: {
            in: guilds.map((guild) => guild.id)
          },
          userId: {
            not: request.userId!
          }
        },
        _count: {
          serverId: true
        }
      });

      const updates = sharedUsers.map((entry) =>
        transaction.user.update({
          where: { id: entry.userId },
          data: {
            sharedServerCount: entry._count.serverId
          }
        })
      );

      await Promise.all(updates);
      await transaction.user.update({
        where: { id: request.userId },
        data: {
          sharedServerCount: guilds.length
        }
      });
    });

    response.status(StatusCodes.CREATED).json({ data: { linked: true } });
  })
);

discordRouter.post(
  "/presence",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = presenceSchema.parse(request.body);
    const user = await prisma.user.update({
      where: { id: request.userId },
      data: {
        discordPresence: body.presence
      }
    });

    response.json({ data: user });
  })
);

discordRouter.post(
  "/invite-link",
  requireAuth,
  asyncHandler(async (request, response) => {
    const invitation = await prisma.invitation.create({
      data: {
        inviterId: request.userId!,
        channel: "DISCORD"
      }
    });

    const link = createSmartOpenLinkForTargets(
      `/onboarding?referralToken=${invitation.deepLinkToken}`,
      `/onboarding?referralToken=${invitation.deepLinkToken}`,
    );
    response.status(StatusCodes.CREATED).json({
      data: {
        link,
        template: `Anyone free tonight? Let's link on Nowly -> ${link}`
      }
    });
  })
);
