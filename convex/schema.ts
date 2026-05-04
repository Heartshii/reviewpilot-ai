import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const businessType = v.union(
  v.literal("RESTAURANT"),
  v.literal("DENTAL_CLINIC"),
  v.literal("GROCERY_STORE"),
  v.literal("SALON_SPA"),
  v.literal("FITNESS_STUDIO"),
  v.literal("HOME_SERVICE"),
  v.literal("AUTOMOTIVE_SERVICE"),
  v.literal("RETAIL_STORE"),
  v.literal("PROFESSIONAL_SERVICE"),
  v.literal("GENERAL_SERVICE")
);

export default defineSchema({
  restaurants: defineTable({
    name: v.string(),
    slug: v.string(),
    businessType: v.optional(businessType),
    businessSubtype: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    tier: v.number(),
    smsLimit: v.number(),
    smsUsed: v.number(),
    overageRate: v.number(),
    googleBusinessUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("TRIALING"),
        v.literal("ACTIVE"),
        v.literal("PAST_DUE"),
        v.literal("CANCELED"),
        v.literal("UNPAID"),
        v.literal("INCOMPLETE"),
        v.literal("INCOMPLETE_EXPIRED")
      )
    ),
    subscriptionCurrentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    active: v.boolean(),
  })
    .index("by_twilioNumber", ["twilioNumber"])
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"])
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
    aiTone: v.optional(
      v.union(
        v.literal("Friendly"),
        v.literal("Professional"),
        v.literal("Casual")
      )
    ),
    responseLength: v.optional(
      v.union(
        v.literal("Short"),
        v.literal("Medium"),
        v.literal("Detailed")
      )
    ),
    autoApprove: v.optional(v.boolean()),
    includeReviewLink: v.optional(v.boolean()),
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
