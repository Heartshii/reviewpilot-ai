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

export const sendWelcomeSms = action({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const customer = await ctx.runQuery(internal.smsMutations.getCustomer, { customerId });
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId: customer.restaurantId,
    });
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");
    const isOverage = restaurant.smsUsed >= restaurant.smsLimit;
    const cost = isOverage ? restaurant.overageRate : 0;
    let message = "Hi [name]! Thanks for visiting [restaurant]. Rate us 1-5 by replying with a number. We read every reply!"
      .replace("[name]", customer.name)
      .replace("[restaurant]", restaurant.name);
    if (customer.visitNote) {
      const adjusted = await ctx.runAction(internal.sms.adjustMessageTone, {
        baseMessage: message,
        visitNote: customer.visitNote,
      });
      if (adjusted) message = adjusted;
    }
    const client = getTwilioClient();
    const sent = await client.messages.create({
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
    return { sid: sent.sid };
  },
});

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
    await ctx.runMutation(internal.smsMutations.saveFeedback, {
      rating,
      restaurantId,
      customerId,
      atRisk: rating <= 2,
    });
    if (rating >= 4) {
      const url = restaurant.googleBusinessUrl ?? "";
      const name = customer?.name ?? "there";
      const msg = `Thanks ${name}! Please leave us a Google review: ${url}`;
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
      if (customerId && restaurant.twilioNumber) {
        await ctx.scheduler.runAfter(
          24 * 60 * 60 * 1000,
          internal.sms.sendReviewFollowUp,
          { customerPhone, customerId, restaurantId }
        );
      }
    } else {
      const name = customer?.name ?? "there";
      const apology = `Hi ${name}, we're sorry! We'd love to make it right. Reply and we'll sort it out. - ${restaurant.name}`;
      const logId = await ctx.runMutation(internal.smsMutations.saveSmsLog, {
        smsType: "APOLOGY",
        content: apology,
        status: "PENDING_APPROVAL",
        cost: 0,
        isOverage: false,
        restaurantId,
        customerId,
      });
      const owner = await ctx.runQuery(internal.smsMutations.getOwnerForRestaurant, {
        restaurantId,
      });
      if (owner) {
        await ctx.runMutation(internal.smsMutations.saveNotification, {
          restaurantId,
          smsLogId: logId,
          customerId,
        });
      }
    }
  },
});

export const sendReviewFollowUp = internalAction({
  args: {
    customerPhone: v.string(),
    customerId: v.id("customers"),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { customerPhone, customerId, restaurantId }) => {
    const customer = await ctx.runQuery(internal.smsMutations.getCustomer, { customerId });
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, { restaurantId });
    if (!customer.optedInSms || !restaurant.twilioNumber) return;
    const msg = `Reply YES for 50 bonus points! - ${restaurant.name}`;
    const client = getTwilioClient();
    await client.messages.create({
      body: msg,
      from: restaurant.twilioNumber,
      to: customerPhone,
    });
    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "GOOGLE_REVIEW",
      content: msg,
      status: "SENT",
      cost: 0,
      isOverage: false,
      restaurantId,
      customerId,
    });
  },
});

export const handleReviewConfirmation = internalAction({
  args: {
    customerPhone: v.string(),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { customerPhone, restaurantId }) => {
    const customer = await ctx.runQuery(internal.smsMutations.getCustomerByPhone, {
      restaurantId,
      phone: customerPhone,
    });
    if (!customer) return;
    await ctx.runMutation(internal.smsMutations.addPoints, {
      customerId: customer._id,
      points: 50,
    });
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, { restaurantId });
    const msg = `Thanks! 50 loyalty points added. We appreciate you! - ${restaurant.name}`;
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
      customerId: customer._id,
    });
  },
});

export const generateApology = internalAction({
  args: {
    rating: v.number(),
    customerName: v.string(),
    restaurantName: v.string(),
  },
  handler: async (ctx, { rating, customerName, restaurantName }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return `Dear ${customerName}, we're sorry your experience at ${restaurantName} wasn't perfect. We'd love to make it right.`;
    }
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
            content: "Draft a brief sincere SMS apology for a restaurant. Keep it under 120 characters. Be empathetic and offer to make it right. No markdown.",
          },
          {
            role: "user",
            content: `Restaurant: ${restaurantName}. Customer: ${customerName}. Rating: ${rating}/5.`,
          },
        ],
        max_tokens: 100,
      }),
    });
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? `We're sorry ${customerName}. We'd love to make it right. Please reach out to us.`;
  },
});

export const sendBirthdaySms = action({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const customer = await ctx.runQuery(internal.smsMutations.getCustomer, { customerId });
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId: customer.restaurantId,
    });
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");
    const msg = `Happy Birthday ${customer.name}! Free dessert on your next visit. Show this text. - ${restaurant.name}`;
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
    return { ok: true };
  },
});

export const sendReengagementSms = action({
  args: {
    customerId: v.id("customers"),
    daysSinceVisit: v.union(v.literal(30), v.literal(60), v.literal(90)),
  },
  handler: async (ctx, { customerId, daysSinceVisit }) => {
    const customer = await ctx.runQuery(internal.smsMutations.getCustomer, { customerId });
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId: customer.restaurantId,
    });
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");
    const messages = {
      30: `Hi ${customer.name}! We miss you at ${restaurant.name}. Come back soon!`,
      60: `Hi ${customer.name}! It's been a while. Visit ${restaurant.name} for a special offer!`,
      90: `Hi ${customer.name}! 20% off your next visit at ${restaurant.name}. Show this text!`,
    };
    const msg = messages[daysSinceVisit];
    const client = getTwilioClient();
    await client.messages.create({
      body: msg,
      from: restaurant.twilioNumber,
      to: customer.phone,
    });
    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "REENGAGEMENT",
      content: msg,
      status: "SENT",
      cost: 0,
      isOverage: false,
      restaurantId: restaurant._id,
      customerId: customer._id,
    });
    return { ok: true };
  },
});

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

export const generateDealMessage = action({
  args: {
    restaurantName: v.string(),
    dealDescription: v.string(),
  },
  handler: async (ctx, { restaurantName, dealDescription }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return `Hi! ${dealDescription} - ${restaurantName}`;
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
            content: "Write a short SMS marketing message (under 120 chars) for a restaurant. Use [name] as placeholder for customer name. Be punchy and include a call to action.",
          },
          {
            role: "user",
            content: `Restaurant: ${restaurantName}. Deal/offer: ${dealDescription}`,
          },
        ],
        max_tokens: 80,
      }),
    });
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? `Hi [name]! ${dealDescription} - ${restaurantName}`;
  },
});

export const adjustMessageTone = internalAction({
  args: {
    baseMessage: v.string(),
    visitNote: v.string(),
  },
  handler: async (ctx, { baseMessage, visitNote }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
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
            content: "Adjust this SMS tone based on the visit note. Return only the adjusted message under 120 chars.",
          },
          {
            role: "user",
            content: `Base message: ${baseMessage}\nVisit note: ${visitNote}`,
          },
        ],
        max_tokens: 150,
      }),
    });
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  },
});

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

    const client = getTwilioClient();
    await client.messages.create({
      body: smsLog.content,
      from: process.env.TWILIO_PHONE_NUMBER!,
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