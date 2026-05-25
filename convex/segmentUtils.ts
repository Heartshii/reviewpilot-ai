import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { CampaignSegmentKey } from "../lib/campaign-segments";

type SegmentCtx = Pick<QueryCtx | MutationCtx, "db">;
type AudienceChannel = "SMS" | "WHATSAPP" | "EMAIL";

type SegmentCustomer = Doc<"customers"> & {
  totalSpent: number;
  latestRating?: number;
  latestSentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  lastVisitAtValue: number;
};

async function loadSegmentDataset(
  ctx: SegmentCtx,
  restaurantId: Id<"restaurants">,
  locationId?: Id<"locations">
) {
  const [allCustomers, allFeedback, allReceipts] = await Promise.all([
    ctx.db
      .query("customers")
      .filter((q) =>
        q.and(
          q.eq(q.field("restaurantId"), restaurantId),
          q.eq(q.field("optedInSms"), true)
        )
      )
      .collect(),
    ctx.db
      .query("feedback")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect(),
    ctx.db
      .query("receipts")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect(),
  ]);

  const customers = allCustomers.filter((customer) =>
    locationId ? customer.lastLocationId === locationId : true
  );
  const feedback = allFeedback.filter((entry) =>
    locationId ? entry.locationId === locationId : true
  );
  const receipts = allReceipts.filter((receipt) =>
    locationId ? receipt.locationId === locationId : true
  );

  const latestFeedbackByCustomer = new Map<
    string,
    { rating: number; createdAt: number }
  >();
  for (const entry of feedback) {
    if (!entry.customerId) continue;
    const existing = latestFeedbackByCustomer.get(entry.customerId);
    if (!existing || entry.createdAt > existing.createdAt) {
      latestFeedbackByCustomer.set(entry.customerId, {
        rating: entry.rating,
        createdAt: entry.createdAt,
      });
    }
  }

  const spendByCustomer = new Map<string, number>();
  for (const receipt of receipts) {
    spendByCustomer.set(
      receipt.customerId,
      (spendByCustomer.get(receipt.customerId) ?? 0) + receipt.billAmount
    );
  }

  const customersWithSignals: SegmentCustomer[] = customers.map((customer) => ({
    ...customer,
    totalSpent: spendByCustomer.get(customer._id) ?? 0,
    latestRating: latestFeedbackByCustomer.get(customer._id)?.rating,
    latestSentiment:
      feedback
        .filter((entry) => entry.customerId === customer._id)
        .sort((a, b) => b.createdAt - a.createdAt)[0]?.sentiment,
    lastVisitAtValue: customer.lastVisitAt ?? customer.createdAt,
  }));

  return { customers: customersWithSignals };
}

function matchesSegment(customer: SegmentCustomer, segment: CampaignSegmentKey) {
  const now = Date.now();
  const daysSinceVisit =
    (now - customer.lastVisitAtValue) / (24 * 60 * 60 * 1000);

  switch (segment) {
    case "ALL":
      return true;
    case "NEW":
      return customer.visitCount === 1;
    case "LOYAL":
      return customer.visitCount >= 5;
    case "VIP":
      return customer.points >= 500 || customer.totalSpent >= 250;
    case "HIGH_SPEND":
      return customer.totalSpent >= 120;
    case "RECENT":
      return daysSinceVisit <= 21;
    case "INACTIVE_30":
      return daysSinceVisit >= 30;
    case "INACTIVE_60":
      return daysSinceVisit >= 60;
    case "NEEDS_ATTENTION":
      return customer.latestSentiment === "NEGATIVE" || (customer.latestRating ?? 5) <= 3;
    case "REVIEW_READY":
      return (
        customer.visitCount >= 2 &&
        daysSinceVisit <= 45 &&
        (customer.latestRating === undefined || customer.latestRating >= 4)
      );
    default:
      return false;
  }
}

export async function getCustomersForSegment(args: {
  ctx: SegmentCtx;
  restaurantId: Id<"restaurants">;
  segment: CampaignSegmentKey;
  locationId?: Id<"locations">;
  channel?: AudienceChannel;
}) {
  const { customers } = await loadSegmentDataset(
    args.ctx,
    args.restaurantId,
    args.locationId
  );
  return customers.filter((customer) => {
    const isReachable =
      args.channel === "EMAIL"
        ? !!customer.email && customer.optedInEmail === true
        : customer.optedInSms;
    return isReachable && matchesSegment(customer, args.segment);
  });
}

export async function getSegmentCounts(args: {
  ctx: SegmentCtx;
  restaurantId: Id<"restaurants">;
  segments: readonly CampaignSegmentKey[];
  locationId?: Id<"locations">;
  channel?: AudienceChannel;
}) {
  const { customers } = await loadSegmentDataset(
    args.ctx,
    args.restaurantId,
    args.locationId
  );

  return args.segments.map((segment) => ({
    segment,
    count: customers.filter((customer) => {
      const isReachable =
        args.channel === "EMAIL"
          ? !!customer.email && customer.optedInEmail === true
          : customer.optedInSms;
      return isReachable && matchesSegment(customer, segment);
    }).length,
  }));
}
