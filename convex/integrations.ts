import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { hasWorkspaceBillingAccess } from "../lib/billing-plans";
import {
  clampCurrencyAmount,
  DEFAULT_POS_IMPORT_DELAY_MINUTES,
  DEFAULT_RESERVATION_DELAY_MINUTES,
  formatIntegrationPath,
  getCategoryForProvider,
  makeIntegrationToken,
  PROVIDER_DESCRIPTIONS,
  PROVIDER_LABELS,
} from "../lib/integrations";
import {
  getPhoneLookupCandidates,
  normalizeUsPhoneNumber,
} from "../lib/validation";

const integrationCategoryValidator = v.union(
  v.literal("POS"),
  v.literal("RESERVATIONS")
);

const integrationProviderValidator = v.union(
  v.literal("SQUARE"),
  v.literal("TOAST"),
  v.literal("CLOVER"),
  v.literal("OPENTABLE"),
  v.literal("RESY")
);

type WorkspaceRole = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "STAFF";

type ImportedVisitResult = {
  customerId: Id<"customers">;
  receiptId?: Id<"receipts">;
  pointsEarned: number;
};

type DbReaderCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">;
type MutationDbCtx = Pick<MutationCtx, "db">;
type MutationHelpersCtx = Pick<MutationCtx, "db" | "scheduler">;

async function requireIntegrationPermission(
  ctx: DbReaderCtx,
  actorClerkId: string,
  restaurantId: Id<"restaurants">,
  allowedRoles: WorkspaceRole[]
) {
  const actor = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", actorClerkId))
    .first();

  if (!actor) {
    throw new Error("User record not found");
  }
  if (!allowedRoles.includes(actor.role)) {
    throw new Error("You do not have permission for this action");
  }
  if (actor.role !== "SUPER_ADMIN" && actor.restaurantId !== restaurantId) {
    throw new Error("Workspace access denied");
  }

  return actor;
}

async function findCustomerByPhone(
  ctx: DbReaderCtx,
  restaurantId: Id<"restaurants">,
  phone: string
) {
  for (const candidate of getPhoneLookupCandidates(phone)) {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_restaurant_phone", (q) =>
        q.eq("restaurantId", restaurantId).eq("phone", candidate)
      )
      .first();

    if (customer) {
      return customer;
    }
  }

  return null;
}

async function createIntegrationEvent(
  ctx: MutationDbCtx,
  args: {
    integrationId: Id<"integrations">;
    restaurantId: Id<"restaurants">;
    locationId?: Id<"locations">;
    provider: Doc<"integrations">["provider"];
    category: Doc<"integrations">["category"];
    externalId: string;
    eventType: string;
    status: "RECEIVED" | "SCHEDULED" | "PROCESSED" | "IGNORED" | "FAILED";
    summary: string;
    payloadPreview?: string;
    customerId?: Id<"customers">;
    receiptId?: Id<"receipts">;
    processedAt?: number;
    error?: string;
  }
) {
  return await ctx.db.insert("integrationEvents", {
    ...args,
    createdAt: Date.now(),
  });
}

async function patchIntegrationEvent(
  ctx: MutationDbCtx,
  eventId: Id<"integrationEvents">,
  patch: Partial<Doc<"integrationEvents">>
) {
  await ctx.db.patch(eventId, patch);
}

async function upsertImportedVisit(
  ctx: MutationHelpersCtx,
  args: {
    integration: Doc<"integrations">;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    occurredAt: number;
    billAmount?: number;
  }
): Promise<ImportedVisitResult> {
  const restaurant = await ctx.db.get(args.integration.restaurantId);
  if (!restaurant) {
    throw new Error("Workspace not found");
  }

  if (
    !hasWorkspaceBillingAccess({
      subscriptionStatus: restaurant.subscriptionStatus ?? "NONE",
      trialEndsAt: restaurant.trialEndsAt,
      stripeSubscriptionId: restaurant.stripeSubscriptionId,
    })
  ) {
    throw new Error("Billing inactive for this workspace.");
  }

  const settings = await ctx.db
    .query("restaurantSettings")
    .withIndex("by_restaurantId", (q) =>
      q.eq("restaurantId", args.integration.restaurantId)
    )
    .first();

  const normalizedPhone = normalizeUsPhoneNumber(args.customerPhone);
  const billAmount = clampCurrencyAmount(
    args.billAmount ?? args.integration.defaultBillAmount ?? 0
  );
  const pointsEarned = Math.round(billAmount * 10);
  const followupDelayMinutes =
    args.integration.followupDelayMinutes ??
    settings?.sendDelayMinutes ??
    (args.integration.category === "POS"
      ? DEFAULT_POS_IMPORT_DELAY_MINUTES
      : DEFAULT_RESERVATION_DELAY_MINUTES);
  const scheduleDelayMs = Math.max(
    0,
    args.occurredAt + followupDelayMinutes * 60_000 - Date.now()
  );

  const existingCustomer = await findCustomerByPhone(
    ctx,
    args.integration.restaurantId,
    normalizedPhone
  );

  let customerId: Id<"customers">;
  let optedInSms = true;

  if (existingCustomer) {
    optedInSms = existingCustomer.optedInSms;
    customerId = existingCustomer._id;
    await ctx.db.patch(existingCustomer._id, {
      name: args.customerName.trim() || existingCustomer.name,
      phone: normalizedPhone,
      email: args.customerEmail ?? existingCustomer.email,
      lastLocationId:
        args.integration.locationId ?? existingCustomer.lastLocationId,
      lastVisitAt: args.occurredAt,
      visitCount: existingCustomer.visitCount + 1,
      points: existingCustomer.points + pointsEarned,
      optedInEmail:
        args.customerEmail !== undefined
          ? existingCustomer.optedInEmail ?? true
          : existingCustomer.optedInEmail,
    });
  } else {
    if (!args.integration.autoCreateCustomers) {
      throw new Error("This integration is not allowed to create customers.");
    }

    customerId = await ctx.db.insert("customers", {
      name: args.customerName.trim(),
      phone: normalizedPhone,
      email: args.customerEmail,
      points: pointsEarned,
      visitCount: 1,
      optedInSms: true,
      optedInEmail: args.customerEmail ? true : false,
      visitNote: `${PROVIDER_LABELS[args.integration.provider]} import`,
      restaurantId: args.integration.restaurantId,
      lastLocationId: args.integration.locationId,
      createdAt: args.occurredAt,
      lastVisitAt: args.occurredAt,
    });
  }

  let receiptId: Id<"receipts"> | undefined;
  if (args.integration.autoImportReceipts && billAmount > 0) {
    receiptId = await ctx.db.insert("receipts", {
      billAmount,
      pointsEarned,
      status: "APPROVED",
      customerId,
      restaurantId: args.integration.restaurantId,
      locationId: args.integration.locationId,
      submittedAt: args.occurredAt,
    });
  }

  if (args.integration.autoSendFollowupSms && optedInSms) {
    await ctx.scheduler.runAfter(scheduleDelayMs, api.sms.sendWelcomeSms, {
      customerId,
    });
  }

  return {
    customerId,
    receiptId,
    pointsEarned,
  };
}

export const getIntegrationsForRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const integrations = await ctx.db
      .query("integrations")
      .withIndex("by_restaurant_category", (q) => q.eq("restaurantId", restaurantId))
      .collect();

    return integrations
      .sort((a, b) => a.provider.localeCompare(b.provider))
      .map((integration) => ({
        ...integration,
        endpointPath: formatIntegrationPath({
          provider: integration.provider,
          token: integration.publicToken,
        }),
        description: PROVIDER_DESCRIPTIONS[integration.provider],
      }));
  },
});

export const getRecentIntegrationEvents = query({
  args: {
    restaurantId: v.id("restaurants"),
    category: v.optional(integrationCategoryValidator),
  },
  handler: async (ctx, { restaurantId, category }) => {
    const events = await ctx.db
      .query("integrationEvents")
      .withIndex("by_restaurant_createdAt", (q) => q.eq("restaurantId", restaurantId))
      .order("desc")
      .take(24);

    return events.filter((event) => (category ? event.category === category : true));
  },
});

export const upsertIntegration = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    integrationId: v.optional(v.id("integrations")),
    provider: integrationProviderValidator,
    locationId: v.optional(v.id("locations")),
    providerLocationId: v.optional(v.string()),
    status: v.union(v.literal("ACTIVE"), v.literal("PAUSED")),
    followupDelayMinutes: v.optional(v.number()),
    defaultBillAmount: v.optional(v.number()),
    autoCreateCustomers: v.boolean(),
    autoImportReceipts: v.boolean(),
    autoSendFollowupSms: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireIntegrationPermission(ctx, args.actorClerkId, args.restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const category = getCategoryForProvider(args.provider);
    const label = PROVIDER_LABELS[args.provider];
    const now = Date.now();

    if (args.locationId) {
      const location = await ctx.db.get(args.locationId);
      if (!location || location.restaurantId !== args.restaurantId) {
        throw new Error("Location does not belong to this workspace.");
      }
    }

    const existingIntegration =
      args.integrationId != null ? await ctx.db.get(args.integrationId) : null;

    if (existingIntegration && existingIntegration.restaurantId !== args.restaurantId) {
      throw new Error("Integration not found in this workspace.");
    }

    const patch = {
      locationId: args.locationId,
      category,
      provider: args.provider,
      label,
      status: args.status,
      providerLocationId: args.providerLocationId?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      followupDelayMinutes:
        args.followupDelayMinutes != null
          ? Math.max(0, Math.min(10_080, Math.round(args.followupDelayMinutes)))
          : undefined,
      defaultBillAmount:
        args.defaultBillAmount != null
          ? clampCurrencyAmount(args.defaultBillAmount)
          : undefined,
      autoCreateCustomers: args.autoCreateCustomers,
      autoImportReceipts: args.autoImportReceipts,
      autoSendFollowupSms: args.autoSendFollowupSms,
      updatedAt: now,
      lastError: undefined,
    };

    if (existingIntegration) {
      await ctx.db.patch(existingIntegration._id, patch);
      return existingIntegration._id;
    }

    return await ctx.db.insert("integrations", {
      restaurantId: args.restaurantId,
      publicToken: makeIntegrationToken("intg"),
      webhookSecret: makeIntegrationToken("sec"),
      createdByClerkId: args.actorClerkId,
      createdAt: now,
      ...patch,
    });
  },
});

export const rotateIntegrationSecret = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, { actorClerkId, restaurantId, integrationId }) => {
    await requireIntegrationPermission(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const integration = await ctx.db.get(integrationId);
    if (!integration || integration.restaurantId !== restaurantId) {
      throw new Error("Integration not found.");
    }

    const webhookSecret = makeIntegrationToken("sec");
    await ctx.db.patch(integrationId, {
      webhookSecret,
      updatedAt: Date.now(),
    });

    return { webhookSecret };
  },
});

export const ingestPosImport = mutation({
  args: {
    integrationId: v.id("integrations"),
    externalId: v.string(),
    eventType: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    billAmount: v.optional(v.number()),
    occurredAt: v.optional(v.number()),
    payloadPreview: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration || integration.category !== "POS") {
      throw new Error("POS integration not found.");
    }
    return await processPosImportInternal(ctx, {
      integration,
      externalId: args.externalId,
      eventType: args.eventType,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      billAmount: args.billAmount,
      occurredAt: args.occurredAt ?? Date.now(),
      payloadPreview: args.payloadPreview,
    });
  },
});

async function processPosImportInternal(
  ctx: MutationHelpersCtx,
  args: {
    integration: Doc<"integrations">;
    externalId: string;
    eventType: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    billAmount?: number;
    occurredAt: number;
    payloadPreview?: string;
  }
) {
  if (args.integration.status !== "ACTIVE") {
    throw new Error("This integration is paused.");
  }

  const existingEvent = await ctx.db
    .query("integrationEvents")
    .withIndex("by_integration_externalId", (q) =>
      q.eq("integrationId", args.integration._id).eq("externalId", args.externalId)
    )
    .first();

  if (existingEvent?.status === "PROCESSED") {
    return { duplicate: true } as const;
  }

  const eventId =
    existingEvent?._id ??
    (await createIntegrationEvent(ctx, {
      integrationId: args.integration._id,
      restaurantId: args.integration.restaurantId,
      locationId: args.integration.locationId,
      provider: args.integration.provider,
      category: args.integration.category,
      externalId: args.externalId,
      eventType: args.eventType,
      status: "RECEIVED",
      summary: `${PROVIDER_LABELS[args.integration.provider]} receipt received`,
      payloadPreview: args.payloadPreview,
    }));

  try {
    const result = await upsertImportedVisit(ctx, {
      integration: args.integration,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      billAmount: args.billAmount,
      occurredAt: args.occurredAt,
    });

    await patchIntegrationEvent(ctx, eventId, {
      status: "PROCESSED",
      summary: `${args.customerName} imported from ${PROVIDER_LABELS[args.integration.provider]} with $${clampCurrencyAmount(args.billAmount).toFixed(2)} spend`,
      customerId: result.customerId,
      receiptId: result.receiptId,
      processedAt: Date.now(),
      error: undefined,
    });

    await ctx.db.patch(args.integration._id, {
      lastSyncAt: Date.now(),
      lastError: undefined,
      updatedAt: Date.now(),
    });

    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import POS event.";
    await patchIntegrationEvent(ctx, eventId, {
      status: "FAILED",
      summary: `${PROVIDER_LABELS[args.integration.provider]} receipt failed`,
      error: message,
      processedAt: Date.now(),
    });
    await ctx.db.patch(args.integration._id, {
      lastError: message,
      updatedAt: Date.now(),
    });
    throw error;
  }
}

export const ingestPosWebhook = mutation({
  args: {
    provider: integrationProviderValidator,
    token: v.string(),
    sharedSecret: v.string(),
    externalId: v.string(),
    eventType: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    billAmount: v.optional(v.number()),
    occurredAt: v.optional(v.number()),
    payloadPreview: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_publicToken", (q) => q.eq("publicToken", args.token))
      .first();

    if (
      !integration ||
      integration.provider !== args.provider ||
      integration.category !== "POS"
    ) {
      throw new Error("Integration not found.");
    }
    if (integration.webhookSecret !== args.sharedSecret) {
      throw new Error("Invalid webhook secret.");
    }

    return await processPosImportInternal(ctx, {
      integration,
      externalId: args.externalId,
      eventType: args.eventType,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      billAmount: args.billAmount,
      occurredAt: args.occurredAt ?? Date.now(),
      payloadPreview: args.payloadPreview,
    });
  },
});

export const ingestReservationImport = mutation({
  args: {
    integrationId: v.id("integrations"),
    externalId: v.string(),
    eventType: v.string(),
    reservationStatus: v.union(
      v.literal("BOOKED"),
      v.literal("SEATED"),
      v.literal("COMPLETED"),
      v.literal("CANCELED")
    ),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    partySize: v.optional(v.number()),
    scheduledStartAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    payloadPreview: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration || integration.category !== "RESERVATIONS") {
      throw new Error("Reservation integration not found.");
    }
    if (integration.status !== "ACTIVE") {
      throw new Error("This integration is paused.");
    }

    const existingEvent = await ctx.db
      .query("integrationEvents")
      .withIndex("by_integration_externalId", (q) =>
        q.eq("integrationId", integration._id).eq("externalId", args.externalId)
      )
      .first();

    if (args.reservationStatus === "CANCELED") {
      if (existingEvent) {
        await patchIntegrationEvent(ctx, existingEvent._id, {
          status: "IGNORED",
          summary: `${PROVIDER_LABELS[integration.provider]} reservation canceled`,
          processedAt: Date.now(),
          error: undefined,
        });
      } else {
        await createIntegrationEvent(ctx, {
          integrationId: integration._id,
          restaurantId: integration.restaurantId,
          locationId: integration.locationId,
          provider: integration.provider,
          category: integration.category,
          externalId: args.externalId,
          eventType: args.eventType,
          status: "IGNORED",
          summary: `${PROVIDER_LABELS[integration.provider]} reservation canceled`,
          payloadPreview: args.payloadPreview,
          processedAt: Date.now(),
        });
      }

      return { canceled: true };
    }

    if (existingEvent?.status === "PROCESSED") {
      return { duplicate: true };
    }

    const referenceTime =
      args.completedAt ??
      args.scheduledStartAt ??
      Date.now();
    const futureDelayMs = Math.max(
      0,
      referenceTime +
        (integration.followupDelayMinutes ?? DEFAULT_RESERVATION_DELAY_MINUTES) *
          60_000 -
        Date.now()
    );

    if (args.reservationStatus !== "COMPLETED" && futureDelayMs > 0) {
      const eventId =
        existingEvent?._id ??
        (await createIntegrationEvent(ctx, {
          integrationId: integration._id,
          restaurantId: integration.restaurantId,
          locationId: integration.locationId,
          provider: integration.provider,
          category: integration.category,
          externalId: args.externalId,
          eventType: args.eventType,
          status: "SCHEDULED",
          summary: `${PROVIDER_LABELS[integration.provider]} reservation scheduled for follow-up`,
          payloadPreview: args.payloadPreview,
        }));

      await ctx.scheduler.runAfter(
        futureDelayMs,
        api.integrations.processScheduledReservationImport,
        {
          integrationId: integration._id,
          externalId: args.externalId,
          eventType: args.eventType,
          customerName: args.customerName,
          customerPhone: args.customerPhone,
          customerEmail: args.customerEmail,
          partySize: args.partySize,
          occurredAt: referenceTime,
        }
      );

      await ctx.db.patch(integration._id, {
        lastSyncAt: Date.now(),
        lastError: undefined,
        updatedAt: Date.now(),
      });

      return { scheduled: true, eventId };
    }

    return await processReservationImportInternal(ctx, {
      integration,
      existingEventId: existingEvent?._id,
      externalId: args.externalId,
      eventType: args.eventType,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      partySize: args.partySize,
      occurredAt: referenceTime,
      payloadPreview: args.payloadPreview,
    });
  },
});

export const ingestReservationWebhook = mutation({
  args: {
    provider: integrationProviderValidator,
    token: v.string(),
    sharedSecret: v.string(),
    externalId: v.string(),
    eventType: v.string(),
    reservationStatus: v.union(
      v.literal("BOOKED"),
      v.literal("SEATED"),
      v.literal("COMPLETED"),
      v.literal("CANCELED")
    ),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    partySize: v.optional(v.number()),
    scheduledStartAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    payloadPreview: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_publicToken", (q) => q.eq("publicToken", args.token))
      .first();

    if (
      !integration ||
      integration.provider !== args.provider ||
      integration.category !== "RESERVATIONS"
    ) {
      throw new Error("Integration not found.");
    }
    if (integration.webhookSecret !== args.sharedSecret) {
      throw new Error("Invalid webhook secret.");
    }

    const existingEvent = await ctx.db
      .query("integrationEvents")
      .withIndex("by_integration_externalId", (q) =>
        q.eq("integrationId", integration._id).eq("externalId", args.externalId)
      )
      .first();

    if (args.reservationStatus === "CANCELED") {
      if (existingEvent) {
        await patchIntegrationEvent(ctx, existingEvent._id, {
          status: "IGNORED",
          summary: `${PROVIDER_LABELS[integration.provider]} reservation canceled`,
          processedAt: Date.now(),
          error: undefined,
        });
      } else {
        await createIntegrationEvent(ctx, {
          integrationId: integration._id,
          restaurantId: integration.restaurantId,
          locationId: integration.locationId,
          provider: integration.provider,
          category: integration.category,
          externalId: args.externalId,
          eventType: args.eventType,
          status: "IGNORED",
          summary: `${PROVIDER_LABELS[integration.provider]} reservation canceled`,
          payloadPreview: args.payloadPreview,
          processedAt: Date.now(),
        });
      }
      return { canceled: true };
    }

    if (existingEvent?.status === "PROCESSED") {
      return { duplicate: true };
    }

    const referenceTime =
      args.completedAt ?? args.scheduledStartAt ?? Date.now();
    const futureDelayMs = Math.max(
      0,
      referenceTime +
        (integration.followupDelayMinutes ?? DEFAULT_RESERVATION_DELAY_MINUTES) *
          60_000 -
        Date.now()
    );

    if (args.reservationStatus !== "COMPLETED" && futureDelayMs > 0) {
      const eventId =
        existingEvent?._id ??
        (await createIntegrationEvent(ctx, {
          integrationId: integration._id,
          restaurantId: integration.restaurantId,
          locationId: integration.locationId,
          provider: integration.provider,
          category: integration.category,
          externalId: args.externalId,
          eventType: args.eventType,
          status: "SCHEDULED",
          summary: `${PROVIDER_LABELS[integration.provider]} reservation scheduled for follow-up`,
          payloadPreview: args.payloadPreview,
        }));

      await ctx.scheduler.runAfter(
        futureDelayMs,
        api.integrations.processScheduledReservationImport,
        {
          integrationId: integration._id,
          externalId: args.externalId,
          eventType: args.eventType,
          customerName: args.customerName,
          customerPhone: args.customerPhone,
          customerEmail: args.customerEmail,
          partySize: args.partySize,
          occurredAt: referenceTime,
        }
      );

      await ctx.db.patch(integration._id, {
        lastSyncAt: Date.now(),
        lastError: undefined,
        updatedAt: Date.now(),
      });

      return { scheduled: true, eventId };
    }

    return await processReservationImportInternal(ctx, {
      integration,
      existingEventId: existingEvent?._id,
      externalId: args.externalId,
      eventType: args.eventType,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      partySize: args.partySize,
      occurredAt: referenceTime,
      payloadPreview: args.payloadPreview,
    });
  },
});

async function processReservationImportInternal(
  ctx: MutationHelpersCtx,
  args: {
    integration: Doc<"integrations">;
    existingEventId?: Id<"integrationEvents">;
    externalId: string;
    eventType: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    partySize?: number;
    occurredAt: number;
    payloadPreview?: string;
  }
) {
  const eventId =
    args.existingEventId ??
    (await createIntegrationEvent(ctx, {
      integrationId: args.integration._id,
      restaurantId: args.integration.restaurantId,
      locationId: args.integration.locationId,
      provider: args.integration.provider,
      category: args.integration.category,
      externalId: args.externalId,
      eventType: args.eventType,
      status: "RECEIVED",
      summary: `${PROVIDER_LABELS[args.integration.provider]} reservation received`,
      payloadPreview: args.payloadPreview,
    }));

  try {
    const result = await upsertImportedVisit(ctx, {
      integration: args.integration,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      billAmount: args.integration.defaultBillAmount,
      occurredAt: args.occurredAt,
    });

    await patchIntegrationEvent(ctx, eventId, {
      status: "PROCESSED",
      summary: `${args.customerName} completed a ${PROVIDER_LABELS[args.integration.provider]} reservation${args.partySize ? ` for ${args.partySize}` : ""}`,
      customerId: result.customerId,
      receiptId: result.receiptId,
      processedAt: Date.now(),
      error: undefined,
    });

    await ctx.db.patch(args.integration._id, {
      lastSyncAt: Date.now(),
      lastError: undefined,
      updatedAt: Date.now(),
    });

    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process reservation import.";
    await patchIntegrationEvent(ctx, eventId, {
      status: "FAILED",
      summary: `${PROVIDER_LABELS[args.integration.provider]} reservation failed`,
      error: message,
      processedAt: Date.now(),
    });
    await ctx.db.patch(args.integration._id, {
      lastError: message,
      updatedAt: Date.now(),
    });
    throw error;
  }
}

export const processScheduledReservationImport = mutation({
  args: {
    integrationId: v.id("integrations"),
    externalId: v.string(),
    eventType: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    partySize: v.optional(v.number()),
    occurredAt: v.number(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration || integration.category !== "RESERVATIONS") {
      return { skipped: true };
    }

    const existingEvent = await ctx.db
      .query("integrationEvents")
      .withIndex("by_integration_externalId", (q) =>
        q.eq("integrationId", integration._id).eq("externalId", args.externalId)
      )
      .first();

    if (existingEvent?.status === "PROCESSED") {
      return { duplicate: true };
    }

    return await processReservationImportInternal(ctx, {
      integration,
      existingEventId: existingEvent?._id,
      externalId: args.externalId,
      eventType: args.eventType,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      partySize: args.partySize,
      occurredAt: args.occurredAt,
    });
  },
});

export const sendTestPosImport = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, { actorClerkId, restaurantId, integrationId }) => {
    await requireIntegrationPermission(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const integration = await ctx.db.get(integrationId);
    if (!integration || integration.restaurantId !== restaurantId) {
      throw new Error("Integration not found.");
    }

    const result = await upsertImportedVisit(ctx, {
      integration,
      customerName: "Jordan Test",
      customerPhone: "4155550199",
      customerEmail: "jordan.test@example.com",
      billAmount: 84.5,
      occurredAt: Date.now(),
    });

    await createIntegrationEvent(ctx, {
      integrationId,
      restaurantId,
      locationId: integration.locationId,
      provider: integration.provider,
      category: integration.category,
      externalId: `test-pos-${Date.now()}`,
      eventType: "test.imported",
      status: "PROCESSED",
      summary: "Dashboard test POS import completed",
      payloadPreview: '{"test":true,"source":"dashboard"}',
      customerId: result.customerId,
      receiptId: result.receiptId,
      processedAt: Date.now(),
    });

    return result;
  },
});

export const sendTestReservationImport = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    integrationId: v.id("integrations"),
  },
  handler: async (ctx, { actorClerkId, restaurantId, integrationId }) => {
    await requireIntegrationPermission(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const integration = await ctx.db.get(integrationId);
    if (!integration || integration.restaurantId !== restaurantId) {
      throw new Error("Integration not found.");
    }

    return await processReservationImportInternal(ctx, {
      integration,
      externalId: `test-reservation-${Date.now()}`,
      eventType: "reservation.completed",
      customerName: "Avery Sample",
      customerPhone: "4155550147",
      customerEmail: "avery.sample@example.com",
      partySize: 2,
      occurredAt: Date.now(),
      payloadPreview: '{"test":true,"source":"dashboard"}',
    });
  },
});
