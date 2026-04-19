"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import twilio from "twilio";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) throw new Error("Missing Twilio credentials");
  return twilio(accountSid, authToken);
}

// ─────────────────────────────────────────────
// 1. WELCOME SMS (auto, 60 min after registration)
//    Asks customer to rate 1-5
// ─────────────────────────────────────────────
export const sendWelcomeSms = action({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const customer = await ctx.runQuery(internal.smsMutations.getCustomer, { customerId });
    if (!customer.optedInSms) return;

    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId: customer.restaurantId,
    });
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const isOverage = restaurant.smsUsed >= restaurant.smsLimit;
    const cost = isOverage ? restaurant.overageRate : 0;

    const message = `Hi ${customer.name}! Thanks for visiting ${restaurant.name}. How was your experience? Reply with a number from 1 to 5. (1=Poor, 5=Excellent)`;

    const client = getTwilioClient();
    await client.messages.create({
      body: message,
      from: restaurant.twilioNumber,
      to: customer.phone,
    });

    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "WELCOME",
      content: message,
      status: "SENT",
      cost,
      isOverage,
      restaurantId: restaurant._id,
      customerId: customer._id,
    });

    await ctx.runMutation(internal.smsMutations.incrementSmsUsed, {
      restaurantId: restaurant._id,
    });
  },
});

// ─────────────────────────────────────────────
// 2. HANDLE RATING REPLY (triggered by incoming SMS)
//    1-3 → save apology as PENDING_APPROVAL for owner
//    4-5 → send Google review link immediately
// ─────────────────────────────────────────────
export const handleRatingReply = internalAction({
  args: {
    customerPhone: v.string(),
    rating: v.number(),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { customerPhone, rating, restaurantId }) => {
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId,
    });
    const customer = await ctx.runQuery(internal.smsMutations.getCustomerByPhone, {
      restaurantId,
      phone: customerPhone,
    });
    const customerId = customer?._id ?? undefined;

    // Save feedback
    await ctx.runMutation(internal.smsMutations.saveFeedback, {
      rating,
      restaurantId,
      customerId,
      atRisk: rating <= 3,
    });

    if (rating >= 4) {
      // ── Good rating: send Google review link immediately ──
      const url = restaurant.googleBusinessUrl ?? "";
      const name = customer?.name ?? "there";
      const msg = `Thanks ${name}! We're so glad you had a great experience. Would you mind leaving us a Google review? It means a lot! ${url}`;

      if (restaurant.twilioNumber) {
        const client = getTwilioClient();
        await client.messages.create({
          body: msg,
          from: restaurant.twilioNumber,
          to: customerPhone,
        });
      }

      await ctx.runMutation(internal.smsMutations.saveSmsLog, {
        smsType: "GOOGLE_REVIEW",
        content: msg,
        status: "SENT",
        cost: 0,
        isOverage: false,
        restaurantId,
        customerId,
      });

    } else {
      // ── Bad rating (1-3): save apology for owner to approve ──
      const name = customer?.name ?? "there";
      const apology = `Hi ${name}, we're really sorry your experience at ${restaurant.name} wasn't great. We'd love to make it right — please reply and we'll sort it out!`;

      await ctx.runMutation(internal.smsMutations.saveSmsLog, {
        smsType: "APOLOGY",
        content: apology,
        status: "PENDING_APPROVAL",
        cost: 0,
        isOverage: false,
        restaurantId,
        customerId,
      });
    }
  },
});

// ─────────────────────────────────────────────
// 3. APPROVE SMS (owner clicks approve on dashboard)
//    Sends the pending apology message
// ─────────────────────────────────────────────
export const approveSms = action({
  args: {
    smsLogId: v.id("smsLogs"),
    approvedByUserId: v.string(),
  },
  handler: async (ctx, { smsLogId, approvedByUserId }) => {
    const smsLog = await ctx.runQuery(internal.smsMutations.getSmsLog, { smsLogId });
    if (!smsLog) throw new Error("SMS log not found");
    if (!smsLog.customerId) throw new Error("SMS log has no customer");

    const customer = await ctx.runQuery(internal.smsMutations.getCustomer, {
      customerId: smsLog.customerId,
    });
    if (!customer) throw new Error("Customer not found");

    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId: smsLog.restaurantId,
    });
    if (!restaurant) throw new Error("Restaurant not found");
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const client = getTwilioClient();
    await client.messages.create({
      body: smsLog.content,
      from: restaurant.twilioNumber, // ✅ fixed: uses restaurant's number
      to: customer.phone,
    });

    await ctx.runMutation(internal.smsMutations.updateSmsLogStatus, {
      smsLogId,
      status: "SENT",
      approvedBy: approvedByUserId,
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────
// 4. BIRTHDAY SMS (auto, runs daily via cron)
//    Only fires if birthdayEnabled in settings
// ─────────────────────────────────────────────
export const sendBirthdaySms = action({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const customer = await ctx.runQuery(internal.smsMutations.getCustomer, { customerId });
    if (!customer.optedInSms) return;

    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId: customer.restaurantId,
    });
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");

    // Check if birthday SMS is enabled for this restaurant
    const settings = await ctx.runQuery(internal.smsMutations.getRestaurantSettings, {
      restaurantId: customer.restaurantId,
    });
    if (!settings?.birthdayEnabled) return;

    const template = settings?.birthdayTemplate
      ?? `Happy Birthday ${customer.name}! 🎂 Free dessert on your next visit. Show this text. - ${restaurant.name}`;

    const msg = template
      .replace("[name]", customer.name)
      .replace("[restaurant]", restaurant.name);

    const client = getTwilioClient();
    await client.messages.create({
      body: msg,
      from: restaurant.twilioNumber,
      to: customer.phone,
    });

    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "BIRTHDAY",
      content: msg,
      status: "SENT",
      cost: 0,
      isOverage: false,
      restaurantId: restaurant._id,
      customerId: customer._id,
    });
  },
});

// ─────────────────────────────────────────────
// 5. BULK SMS (owner sends manually from dashboard)
// ─────────────────────────────────────────────
export const sendBulkSms = action({
  args: {
    restaurantId: v.id("restaurants"),
    message: v.string(),
    segment: v.union(
      v.literal("ALL"),
      v.literal("LOYAL"),
      v.literal("NEW"),
      v.literal("ATRISK"),
      v.literal("INACTIVE"),
      v.literal("VIP")
    ),
  },
  handler: async (ctx, { restaurantId, message, segment }) => {
    const customerIds = await ctx.runQuery(internal.smsMutations.getSegmentCustomers, {
      restaurantId,
      segment,
    });
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, { restaurantId });
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const client = getTwilioClient();
    let sentCount = 0;
    let failedCount = 0;

    for (const cid of customerIds) {
      const customer = await ctx.runQuery(internal.smsMutations.getCustomer, { customerId: cid });
      try {
        await client.messages.create({
          body: message.replace("[name]", customer.name),
          from: restaurant.twilioNumber,
          to: customer.phone,
        });
        await ctx.runMutation(internal.smsMutations.saveSmsLog, {
          smsType: "DEAL",
          content: message,
          status: "SENT",
          cost: 0,
          isOverage: false,
          restaurantId,
          customerId: cid,
        });
        sentCount++;
      } catch {
        await ctx.runMutation(internal.smsMutations.saveSmsLog, {
          smsType: "DEAL",
          content: message,
          status: "FAILED",
          cost: 0,
          isOverage: false,
          restaurantId,
          customerId: cid,
        });
        failedCount++;
      }
    }
    return { sentCount, failedCount };
  },
});

// ─────────────────────────────────────────────
// 6. AI DEAL MESSAGE GENERATOR (owner uses from dashboard)
// ─────────────────────────────────────────────
export const generateDealMessage = action({
  args: {
    restaurantName: v.string(),
    dealDescription: v.string(),
  },
  handler: async (ctx, { restaurantName, dealDescription }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return `Hi [name]! ${dealDescription} - ${restaurantName}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Write a short SMS deal message for a restaurant. Under 120 characters. Use [name] as a placeholder for the customer name. Friendly tone. No markdown.",
          },
          {
            role: "user",
            content: `Restaurant: ${restaurantName}. Deal: ${dealDescription}`,
          },
        ],
        max_tokens: 100,
      }),
    });

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return (
      data.choices?.[0]?.message?.content?.trim() ??
      `Hi [name]! ${dealDescription} - ${restaurantName}`
    );
  },
  
});
// ─────────────────────────────────────────────
// SEND TO SPECIFIC CUSTOMERS (owner selects manually)
// ─────────────────────────────────────────────
export const sendToSpecificCustomers = action({
  args: {
    restaurantId: v.id("restaurants"),
    customerIds: v.array(v.id("customers")),
    message: v.string(),
  },
  handler: async (ctx, { restaurantId, customerIds, message }) => {
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, { restaurantId });
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const client = getTwilioClient();
    let sentCount = 0;
    let failedCount = 0;

    for (const customerId of customerIds) {
      const customer = await ctx.runQuery(internal.smsMutations.getCustomer, { customerId });
      if (!customer.optedInSms) continue;

      try {
        await client.messages.create({
          body: message.replace("[name]", customer.name),
          from: restaurant.twilioNumber,
          to: customer.phone,
        });
        await ctx.runMutation(internal.smsMutations.saveSmsLog, {
          smsType: "DEAL",
          content: message.replace("[name]", customer.name),
          status: "SENT",
          cost: 0,
          isOverage: false,
          restaurantId,
          customerId,
        });
        sentCount++;
      } catch {
        await ctx.runMutation(internal.smsMutations.saveSmsLog, {
          smsType: "DEAL",
          content: message.replace("[name]", customer.name),
          status: "FAILED",
          cost: 0,
          isOverage: false,
          restaurantId,
          customerId,
        });
        failedCount++;
      }
    }

    return { sentCount, failedCount };
  },
});