import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  restaurants: defineTable({
    name: v.string(),
    slug: v.string(),
    tier: v.number(),
    smsLimit: v.number(),
    smsUsed: v.number(),
    overageRate: v.number(),
    googleBusinessUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    active: v.boolean(),
  })
    .index("by_twilioNumber", ["twilioNumber"])
    .index("by_slug", ["slug"]),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("SUPER_ADMIN"),
      v.literal("OWNER"),
      v.literal("STAFF")
    ),
    restaurantId: v.optional(v.id("restaurants")),
  }).index("by_clerkId", ["clerkId"]),

  restaurantSettings: defineTable({
    restaurantId: v.id("restaurants"),
    sendDelayMinutes: v.number(),
    birthdayEnabled: v.boolean(),
    birthdayTemplate: v.optional(v.string()),
    reengagement30: v.boolean(),
    reengagement60: v.boolean(),
    reengagement90: v.boolean(),
    kioskAccentColor: v.optional(v.string()),
    kioskLogoUrl: v.optional(v.string()),
    kioskDisplayName: v.optional(v.string()),
    kioskBgImageUrl: v.optional(v.string()),
  }).index("by_restaurantId", ["restaurantId"]),

  customers: defineTable({
    name: v.string(),
    phone: v.string(),
    birthdayMonth: v.optional(v.number()),
    birthdayDay: v.optional(v.number()),
    points: v.number(),
    visitCount: v.number(),
    optedInSms: v.boolean(),
    visitNote: v.optional(v.string()),
    restaurantId: v.id("restaurants"),
    createdAt: v.number(),
    lastVisitAt: v.optional(v.number()),
  }).index("by_restaurant_phone", ["restaurantId", "phone"]),

  smsLogs: defineTable({
    smsType: v.union(
      v.literal("WELCOME"),
      v.literal("GOOGLE_REVIEW"),
      v.literal("APOLOGY"),
      v.literal("DEAL"),
      v.literal("BIRTHDAY"),
      v.literal("REENGAGEMENT")
    ),
    content: v.string(),
    status: v.union(
      v.literal("PENDING_APPROVAL"),
      v.literal("SENT"),
      v.literal("FAILED")
    ),
    cost: v.number(),
    isOverage: v.boolean(),
    approvedBy: v.optional(v.string()),
    restaurantId: v.id("restaurants"),
    customerId: v.optional(v.id("customers")),
    sentAt: v.number(),
  }).index("by_restaurant_sentAt", ["restaurantId", "sentAt"]),

  feedback: defineTable({
    rating: v.number(),
    sentiment: v.optional(
      v.union(
        v.literal("POSITIVE"),
        v.literal("NEUTRAL"),
        v.literal("NEGATIVE")
      )
    ),
    aiResponse: v.optional(v.string()),
    atRisk: v.optional(v.boolean()),
    restaurantId: v.id("restaurants"),
    customerId: v.optional(v.id("customers")),
    createdAt: v.number(),
  }),

  notifications: defineTable({
    type: v.literal("PENDING_APOLOGY_APPROVAL"),
    restaurantId: v.id("restaurants"),
    smsLogId: v.id("smsLogs"),
    customerId: v.optional(v.id("customers")),
    createdAt: v.number(),
  }),

  receipts: defineTable({
    imageUrl: v.optional(v.string()),
    billAmount: v.number(),
    pointsEarned: v.number(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("APPROVED"),
      v.literal("REJECTED")
    ),
    customerId: v.id("customers"),
    restaurantId: v.id("restaurants"),
    submittedAt: v.number(),
  }),
  globalSettings: defineTable({
    key: v.string(),
    value: v.string(),
  }),
});
