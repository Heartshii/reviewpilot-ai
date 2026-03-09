import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/twilio/incoming",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const contentType = request.headers.get("content-type") ?? "";
      let from = "";
      let body = "";
      let to = "";

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        from = (formData.get("From") as string) ?? "";
        body = ((formData.get("Body") as string) ?? "").trim();
        to = (formData.get("To") as string) ?? "";
      } else {
        const json = (await request.json()) as Record<string, string>;
        from = json.From ?? "";
        body = (json.Body ?? "").trim();
        to = json.To ?? "";
      }

      if (from && to) {
        const restaurant = await ctx.runQuery(
          internal.restaurants.findRestaurantByTwilioNumber,
          { twilioNumber: to }
        );

        if (restaurant) {
          const rating = parseInt(body, 10);
          if (!Number.isNaN(rating) && rating >= 1 && rating <= 5) {
            await ctx.runAction(internal.sms.handleRatingReply, {
              customerPhone: from,
              rating,
              restaurantId: restaurant._id,
            });
          } else if (body.toUpperCase() === "YES") {
            await ctx.runAction(internal.sms.handleReviewConfirmation, {
              customerPhone: from,
              restaurantId: restaurant._id,
            });
          } else if (body.toUpperCase() === "STOP") {
            await ctx.runMutation(internal.smsMutations.handleOptOut, {
              customerPhone: from,
              restaurantId: restaurant._id,
            });
          }
        }
      }
    } catch (err) {
      console.error("Webhook error:", err);
    }

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          "Content-Type": "text/xml",
          "Cache-Control": "no-cache",
        },
      }
    );
  }),
});

export default http;
