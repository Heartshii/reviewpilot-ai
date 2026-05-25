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

const integrationCategory = v.union(
  v.literal("POS"),
  v.literal("RESERVATIONS")
);

const integrationProvider = v.union(
  v.literal("SQUARE"),
  v.literal("TOAST"),
  v.literal("CLOVER"),
  v.literal("OPENTABLE"),
  v.literal("RESY")
);

export default defineSchema({
  restaurants: defineTable({
    name: v.string(),
    slug: v.string(),
    businessType: v.optional(businessType),
    businessSubtype: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    referralCode: v.optional(v.string()),
    tier: v.number(),
    smsLimit: v.number(),
    smsUsed: v.number(),
    smsCreditsBalance: v.optional(v.number()),
    overageRate: v.number(),
    premiumAiEnabled: v.optional(v.boolean()),
    referralCreditsEarnedCents: v.optional(v.number()),
    googleBusinessUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    billingInterval: v.optional(
      v.union(v.literal("MONTHLY"), v.literal("ANNUAL"))
    ),
    stripePremiumAiSubscriptionId: v.optional(v.string()),
    stripePremiumAiPriceId: v.optional(v.string()),
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

  locations: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    slug: v.string(),
    contactPhone: v.optional(v.string()),
    googleBusinessUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    kioskDisplayName: v.optional(v.string()),
    kioskAccentColor: v.optional(v.string()),
    kioskLogoUrl: v.optional(v.string()),
    kioskBgImageUrl: v.optional(v.string()),
    active: v.boolean(),
  })
    .index("by_restaurantId", ["restaurantId"])
    .index("by_slug", ["slug"])
    .index("by_twilioNumber", ["twilioNumber"]),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("SUPER_ADMIN"),
      v.literal("OWNER"),
      v.literal("MANAGER"),
      v.literal("STAFF")
    ),
    restaurantId: v.optional(v.id("restaurants")),
  }).index("by_clerkId", ["clerkId"]),

  staffInvites: defineTable({
    restaurantId: v.id("restaurants"),
    email: v.string(),
    role: v.union(v.literal("MANAGER"), v.literal("STAFF")),
    token: v.string(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("ACCEPTED"),
      v.literal("REVOKED")
    ),
    invitedByClerkId: v.string(),
    invitedByEmail: v.string(),
    createdAt: v.number(),
    acceptedAt: v.optional(v.number()),
    acceptedByClerkId: v.optional(v.string()),
  })
    .index("by_restaurantId", ["restaurantId"])
    .index("by_token", ["token"])
    .index("by_email", ["email"]),

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
    testimonialWidgetEnabled: v.optional(v.boolean()),
    testimonialWidgetHeadline: v.optional(v.string()),
    testimonialWidgetSubheadline: v.optional(v.string()),
    testimonialWidgetTheme: v.optional(
      v.union(
        v.literal("EMERALD"),
        v.literal("MIDNIGHT"),
        v.literal("GLASS")
      )
    ),
    whiteLabelEnabled: v.optional(v.boolean()),
    whiteLabelBrandName: v.optional(v.string()),
    whiteLabelSupportEmail: v.optional(v.string()),
    whiteLabelHideReviewPilot: v.optional(v.boolean()),
    leaderboardOptIn: v.optional(v.boolean()),
    leaderboardBadgeLabel: v.optional(v.string()),
    preferredMessagingChannel: v.optional(
      v.union(v.literal("SMS"), v.literal("WHATSAPP"))
    ),
  }).index("by_restaurantId", ["restaurantId"]),

  integrations: defineTable({
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    category: integrationCategory,
    provider: integrationProvider,
    label: v.string(),
    status: v.union(v.literal("ACTIVE"), v.literal("PAUSED")),
    publicToken: v.string(),
    webhookSecret: v.string(),
    providerLocationId: v.optional(v.string()),
    notes: v.optional(v.string()),
    followupDelayMinutes: v.optional(v.number()),
    defaultBillAmount: v.optional(v.number()),
    autoCreateCustomers: v.boolean(),
    autoImportReceipts: v.boolean(),
    autoSendFollowupSms: v.boolean(),
    createdByClerkId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
  })
    .index("by_restaurant_category", ["restaurantId", "category"])
    .index("by_restaurant_provider", ["restaurantId", "provider"])
    .index("by_publicToken", ["publicToken"]),

  integrationEvents: defineTable({
    integrationId: v.id("integrations"),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    provider: integrationProvider,
    category: integrationCategory,
    externalId: v.string(),
    eventType: v.string(),
    status: v.union(
      v.literal("RECEIVED"),
      v.literal("SCHEDULED"),
      v.literal("PROCESSED"),
      v.literal("IGNORED"),
      v.literal("FAILED")
    ),
    summary: v.string(),
    payloadPreview: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    receiptId: v.optional(v.id("receipts")),
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_integration_createdAt", ["integrationId", "createdAt"])
    .index("by_integration_externalId", ["integrationId", "externalId"])
    .index("by_restaurant_createdAt", ["restaurantId", "createdAt"]),

  customers: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    birthdayMonth: v.optional(v.number()),
    birthdayDay: v.optional(v.number()),
    points: v.number(),
    visitCount: v.number(),
    optedInSms: v.boolean(),
    optedInEmail: v.optional(v.boolean()),
    visitNote: v.optional(v.string()),
    restaurantId: v.id("restaurants"),
    lastLocationId: v.optional(v.id("locations")),
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
      v.literal("REENGAGEMENT"),
      v.literal("LOYALTY_REWARD")
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
    locationId: v.optional(v.id("locations")),
    customerId: v.optional(v.id("customers")),
    deliveryChannel: v.optional(v.union(v.literal("SMS"), v.literal("WHATSAPP"))),
    sentAt: v.number(),
  }).index("by_restaurant_sentAt", ["restaurantId", "sentAt"]),

  campaigns: defineTable({
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    channel: v.union(
      v.literal("SMS"),
      v.literal("WHATSAPP"),
      v.literal("EMAIL")
    ),
    title: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
    audienceType: v.union(v.literal("SEGMENT"), v.literal("MANUAL")),
    segment: v.optional(
      v.union(
        v.literal("ALL"),
        v.literal("NEW"),
        v.literal("LOYAL"),
        v.literal("VIP"),
        v.literal("HIGH_SPEND"),
        v.literal("RECENT"),
        v.literal("INACTIVE_30"),
        v.literal("INACTIVE_60"),
        v.literal("NEEDS_ATTENTION"),
        v.literal("REVIEW_READY")
      )
    ),
    customerIds: v.optional(v.array(v.id("customers"))),
    status: v.union(
      v.literal("SCHEDULED"),
      v.literal("RUNNING"),
      v.literal("SENT"),
      v.literal("FAILED"),
      v.literal("CANCELED")
    ),
    createdByClerkId: v.string(),
    createdAt: v.number(),
    scheduledFor: v.number(),
    startedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    sentCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_restaurant_createdAt", ["restaurantId", "createdAt"])
    .index("by_status_scheduledFor", ["status", "scheduledFor"]),

  competitors: defineTable({
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    placeId: v.string(),
    name: v.string(),
    formattedAddress: v.optional(v.string()),
    googleMapsUri: v.optional(v.string()),
    primaryType: v.optional(v.string()),
    active: v.boolean(),
    addedAt: v.number(),
    lastSyncedAt: v.optional(v.number()),
  })
    .index("by_restaurantId", ["restaurantId"])
    .index("by_restaurant_placeId", ["restaurantId", "placeId"])
    .index("by_locationId", ["locationId"]),

  competitorSnapshots: defineTable({
    competitorId: v.id("competitors"),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    reviewSummary: v.optional(v.string()),
    latestReviewSnippet: v.optional(v.string()),
    latestReviewPublishedAt: v.optional(v.number()),
    highlights: v.optional(v.array(v.string())),
    fetchedAt: v.number(),
  })
    .index("by_competitorId", ["competitorId"])
    .index("by_restaurantId", ["restaurantId"])
    .index("by_restaurant_fetchedAt", ["restaurantId", "fetchedAt"]),

  billingPurchases: defineTable({
    restaurantId: v.id("restaurants"),
    stripeCheckoutSessionId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    kind: v.union(v.literal("SMS_PACK"), v.literal("PREMIUM_AI")),
    reference: v.string(),
    smsCreditsGranted: v.optional(v.number()),
    amountPaid: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_restaurantId", ["restaurantId"])
    .index("by_checkoutSessionId", ["stripeCheckoutSessionId"]),

  referrals: defineTable({
    referrerRestaurantId: v.id("restaurants"),
    referredRestaurantId: v.optional(v.id("restaurants")),
    referralCode: v.string(),
    referredEmail: v.optional(v.string()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("ONBOARDED"),
      v.literal("SUBSCRIBED"),
      v.literal("REWARDED")
    ),
    rewardAmountCents: v.number(),
    stripeCheckoutSessionId: v.optional(v.string()),
    referrerStripeCustomerId: v.optional(v.string()),
    referredStripeCustomerId: v.optional(v.string()),
    referrerBalanceTransactionId: v.optional(v.string()),
    onboardedAt: v.optional(v.number()),
    subscribedAt: v.optional(v.number()),
    rewardedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_referralCode", ["referralCode"])
    .index("by_referrerRestaurantId", ["referrerRestaurantId"])
    .index("by_referredRestaurantId", ["referredRestaurantId"]),

  agencyClients: defineTable({
    agencyRestaurantId: v.id("restaurants"),
    clientRestaurantId: v.id("restaurants"),
    ownerEmail: v.string(),
    contactName: v.optional(v.string()),
    notes: v.optional(v.string()),
    monthlyRetainerCents: v.optional(v.number()),
    status: v.union(
      v.literal("ACTIVE"),
      v.literal("PAUSED"),
      v.literal("REMOVED")
    ),
    createdAt: v.number(),
    activatedAt: v.optional(v.number()),
  })
    .index("by_agencyRestaurantId", ["agencyRestaurantId"])
    .index("by_clientRestaurantId", ["clientRestaurantId"]),

  feedback: defineTable({
    rating: v.number(),
    customerMessage: v.optional(v.string()),
    sentiment: v.optional(
      v.union(
        v.literal("POSITIVE"),
        v.literal("NEUTRAL"),
        v.literal("NEGATIVE")
      )
    ),
    sentimentCategory: v.optional(
      v.union(
        v.literal("SERVICE"),
        v.literal("STAFF"),
        v.literal("WAIT_TIME"),
        v.literal("PRICE"),
        v.literal("QUALITY"),
        v.literal("CLEANLINESS"),
        v.literal("COMMUNICATION"),
        v.literal("OTHER")
      )
    ),
    sentimentConfidence: v.optional(v.number()),
    sentimentSummary: v.optional(v.string()),
    aiResponse: v.optional(v.string()),
    publicReplySuggestion: v.optional(v.string()),
    publicReplyGeneratedAt: v.optional(v.number()),
    atRisk: v.optional(v.boolean()),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    customerId: v.optional(v.id("customers")),
    createdAt: v.number(),
  }),

  notifications: defineTable({
    type: v.literal("PENDING_APOLOGY_APPROVAL"),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
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
    locationId: v.optional(v.id("locations")),
    submittedAt: v.number(),
  }),
  loyaltyRewards: defineTable({
    restaurantId: v.id("restaurants"),
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    pointsCost: v.number(),
    smsCopy: v.optional(v.string()),
    active: v.boolean(),
    createdByClerkId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_restaurantId", ["restaurantId"]),
  loyaltyClaims: defineTable({
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    customerId: v.id("customers"),
    rewardId: v.id("loyaltyRewards"),
    token: v.string(),
    claimCode: v.optional(v.string()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("CLAIMED"),
      v.literal("REDEEMED"),
      v.literal("EXPIRED"),
      v.literal("CANCELED")
    ),
    pointsCostSnapshot: v.number(),
    createdByClerkId: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    claimedAt: v.optional(v.number()),
    redeemedAt: v.optional(v.number()),
  })
    .index("by_restaurant_createdAt", ["restaurantId", "createdAt"])
    .index("by_token", ["token"])
    .index("by_customerId", ["customerId"]),
  voiceRecoveryCalls: defineTable({
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    customerId: v.id("customers"),
    feedbackId: v.id("feedback"),
    triggeredByClerkId: v.string(),
    callSid: v.optional(v.string()),
    status: v.union(
      v.literal("QUEUED"),
      v.literal("INITIATED"),
      v.literal("RINGING"),
      v.literal("IN_PROGRESS"),
      v.literal("ANSWERED"),
      v.literal("COMPLETED"),
      v.literal("NO_ANSWER"),
      v.literal("BUSY"),
      v.literal("FAILED"),
      v.literal("CANCELED")
    ),
    script: v.string(),
    aiSummary: v.optional(v.string()),
    totalSpent: v.number(),
    visitCount: v.number(),
    callDurationSeconds: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant_createdAt", ["restaurantId", "createdAt"])
    .index("by_callSid", ["callSid"])
    .index("by_feedbackId", ["feedbackId"]),
  requestGuards: defineTable({
    scope: v.union(v.literal("KIOSK_CHECKIN"), v.literal("TWILIO_INBOUND")),
    key: v.string(),
    attempts: v.number(),
    createdAt: v.number(),
    lastSeenAt: v.number(),
    expiresAt: v.number(),
  }).index("by_scope_key", ["scope", "key"]),
  adminAuditLogs: defineTable({
    action: v.string(),
    actorEmail: v.optional(v.string()),
    targetRestaurantId: v.optional(v.id("restaurants")),
    summary: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  globalSettings: defineTable({
    key: v.string(),
    value: v.string(),
  }),
});
