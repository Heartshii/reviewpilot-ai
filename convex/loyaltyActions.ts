/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { hasWorkspaceBillingAccess } from "../lib/billing-plans";
import twilio from "twilio";
import {
  toTwilioMessagingAddress,
  type PhoneMessagingChannel,
} from "../lib/validation";

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("Twilio is not configured for loyalty SMS.");
  }
  return twilio(sid, token);
}

function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  );
}

function buildRewardMessage(args: {
  customerName: string;
  rewardTitle: string;
  pointsCost: number;
  businessName: string;
  link: string;
  smsCopy?: string;
}) {
  if (args.smsCopy?.trim()) {
    const message = args.smsCopy
      .replaceAll("[name]", args.customerName)
      .replaceAll("[reward]", args.rewardTitle)
      .replaceAll("[points]", String(args.pointsCost))
      .replaceAll("[business]", args.businessName)
      .replaceAll("[link]", args.link);

    if (!message.includes(args.link)) {
      return `${message}\n\nRedeem link: ${args.link}`;
    }

    return message;
  }

  return `Hi ${args.customerName}! You can now claim ${args.rewardTitle} for ${args.pointsCost} points at ${args.businessName}.\n\nRedeem link: ${args.link}`;
}

function buildPointsReminderMessage(args: {
  customerName: string;
  customerPoints: number;
  businessName: string;
  rewardTitle?: string;
  link?: string;
}) {
  if (args.rewardTitle) {
    if (args.link) {
      return `Hi ${args.customerName}! You have ${args.customerPoints} loyalty points waiting at ${args.businessName}. You can already redeem them for ${args.rewardTitle}.\n\nRedeem link: ${args.link}`;
    }

    return `Hi ${args.customerName}! You have ${args.customerPoints} loyalty points waiting at ${args.businessName}. Visit soon to redeem them for ${args.rewardTitle}.`;
  }

  return `Hi ${args.customerName}! You have ${args.customerPoints} loyalty points waiting at ${args.businessName}. Visit soon to redeem them on your next visit.`;
}

async function getLoyaltyMessagingContext(args: {
  ctx: Parameters<typeof sendRewardClaimLink["handler"]>[0];
  actorClerkId: string;
  restaurantId: string;
  customerId: string;
  locationId?: string;
}) {
  const [actor, restaurant, customer, locations] = await Promise.all([
    args.ctx.runQuery(api.users.getCurrentUserByClerkId, {
      clerkId: args.actorClerkId,
    }),
    args.ctx.runQuery(api.queries.getRestaurant, {
      restaurantId: args.restaurantId as never,
    }),
    args.ctx.runQuery(internal.smsMutations.getCustomer, {
      customerId: args.customerId as never,
    }),
    args.ctx.runQuery(api.queries.getLocationsForRestaurant, {
      restaurantId: args.restaurantId as never,
    }),
  ]);
  const settings = await args.ctx.runQuery(internal.smsMutations.getRestaurantSettings, {
    restaurantId: args.restaurantId as never,
  });

  if (!actor) {
    throw new Error("User record not found");
  }
  if (
    !["SUPER_ADMIN", "OWNER", "MANAGER"].includes(actor.role) ||
    (actor.role !== "SUPER_ADMIN" && actor.restaurantId !== args.restaurantId)
  ) {
    throw new Error("You do not have permission for this action");
  }
  if (!customer || customer.restaurantId !== args.restaurantId) {
    throw new Error("Customer not found");
  }
  if (!customer.optedInSms) {
    throw new Error("Customer has SMS opt-out enabled.");
  }

  const locationScopeId = args.locationId ?? customer.lastLocationId;
  const location = locationScopeId
    ? locations.find((item) => item._id === locationScopeId)
    : null;
  const twilioNumber = location?.twilioNumber ?? restaurant.twilioNumber;
  const deliveryChannel =
    (settings?.preferredMessagingChannel as PhoneMessagingChannel | undefined) ??
    "SMS";

  if (!twilioNumber) {
    throw new Error("Business has no Twilio number configured for this scope.");
  }

  if (
    !hasWorkspaceBillingAccess({
      subscriptionStatus: restaurant.subscriptionStatus ?? "NONE",
      trialEndsAt: restaurant.trialEndsAt,
      stripeSubscriptionId: restaurant.stripeSubscriptionId,
    })
  ) {
    throw new Error(
      "This workspace trial has ended. Activate billing to continue sending automated messages."
    );
  }

  return {
    actor,
    restaurant,
    customer,
    location,
    locationScopeId,
    twilioNumber,
    deliveryChannel,
  };
}

export const sendRewardClaimLink = action({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    rewardId: v.id("loyaltyRewards"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const [{ restaurant, customer, location, locationScopeId, twilioNumber, deliveryChannel }, reward] =
      await Promise.all([
        getLoyaltyMessagingContext({
          ctx,
          actorClerkId: args.actorClerkId,
          restaurantId: args.restaurantId,
          customerId: args.customerId,
          locationId: args.locationId,
        }),
        ctx.runQuery(api.loyalty.getLoyaltyRewards, {
          restaurantId: args.restaurantId,
        }),
      ]);
    const rewardRow = reward.find((item) => item._id === args.rewardId);

    if (!rewardRow || !rewardRow.active) {
      throw new Error("Reward not found or inactive.");
    }
    if (customer.points < rewardRow.pointsCost) {
      throw new Error("Customer does not have enough points for this reward.");
    }

    const claim = await ctx.runMutation(api.loyalty.createLoyaltyClaim, {
      actorClerkId: args.actorClerkId,
      restaurantId: args.restaurantId,
      locationId: locationScopeId,
      rewardId: args.rewardId,
      customerId: args.customerId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const link = `${getAppBaseUrl()}/redeem/${claim.token}`;
    const message = buildRewardMessage({
      customerName: customer.name,
      rewardTitle: rewardRow.title,
      pointsCost: rewardRow.pointsCost,
      businessName: location?.kioskDisplayName ?? restaurant.name,
      link,
      smsCopy: rewardRow.smsCopy,
    });

    const client = getTwilioClient();
    await client.messages.create({
      body: message,
      from: toTwilioMessagingAddress(deliveryChannel, twilioNumber),
      to: toTwilioMessagingAddress(deliveryChannel, customer.phone),
    });

    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "LOYALTY_REWARD",
      content: message,
      status: "SENT",
      cost: 0,
      isOverage: false,
      restaurantId: args.restaurantId,
      locationId: locationScopeId,
      customerId: args.customerId,
      deliveryChannel,
    });

    await ctx.runMutation(internal.smsMutations.incrementSmsUsed, {
      restaurantId: args.restaurantId,
    });

    return {
      ok: true,
      token: claim.token,
      link,
      message,
    };
  },
});

export const sendPointsBalanceReminder = action({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    customerId: v.id("customers"),
    rewardId: v.optional(v.id("loyaltyRewards")),
    rewardTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { restaurant, customer, location, locationScopeId, twilioNumber, deliveryChannel } =
      await getLoyaltyMessagingContext({
        ctx,
        actorClerkId: args.actorClerkId,
        restaurantId: args.restaurantId,
        customerId: args.customerId,
        locationId: args.locationId,
      });

    let link: string | undefined;
    let rewardTitle = args.rewardTitle?.trim() || undefined;

    if (args.rewardId) {
      const rewardRows = await ctx.runQuery(api.loyalty.getLoyaltyRewards, {
        restaurantId: args.restaurantId,
      });
      const reward = rewardRows.find((item) => item._id === args.rewardId);

      if (!reward || !reward.active) {
        throw new Error("Reward not found or inactive.");
      }

      rewardTitle = reward.title;

      if (customer.points >= reward.pointsCost) {
        const claim = await ctx.runMutation(api.loyalty.createLoyaltyClaim, {
          actorClerkId: args.actorClerkId,
          restaurantId: args.restaurantId,
          locationId: locationScopeId,
          rewardId: args.rewardId,
          customerId: args.customerId,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
        link = `${getAppBaseUrl()}/redeem/${claim.token}`;
      }
    }

    const message = buildPointsReminderMessage({
      customerName: customer.name,
      customerPoints: customer.points,
      businessName: location?.kioskDisplayName ?? restaurant.name,
      rewardTitle,
      link,
    });

    const client = getTwilioClient();
    await client.messages.create({
      body: message,
      from: toTwilioMessagingAddress(deliveryChannel, twilioNumber),
      to: toTwilioMessagingAddress(deliveryChannel, customer.phone),
    });

    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "LOYALTY_REWARD",
      content: message,
      status: "SENT",
      cost: 0,
      isOverage: false,
      restaurantId: args.restaurantId,
      locationId: locationScopeId,
      customerId: args.customerId,
      deliveryChannel,
    });

    await ctx.runMutation(internal.smsMutations.incrementSmsUsed, {
      restaurantId: args.restaurantId,
    });

    return {
      ok: true,
      link,
      message,
    };
  },
});
