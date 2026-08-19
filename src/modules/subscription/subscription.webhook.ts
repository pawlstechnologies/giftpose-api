import express from "express";
import { stripe } from "../../config/stripe";
import { handleStripeEvent } from "./stripeWebhook.service";

const router = express.Router();

router.post("/", async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret || webhookSecret.includes("XXXX")) {
        return res.status(400).send("Webhook secret is not configured");
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            webhookSecret
        );
    } catch (err) {
        console.error("Stripe webhook signature failed:", (err as Error).message);
        return res.status(400).send("Webhook Error");
    }

    try {
        await handleStripeEvent(event);
        return res.json({ received: true });
    } catch (err) {
        console.error("Stripe webhook handler failed:", err);
        return res.status(500).send("Webhook handler failed");
    }
});

export default router;
