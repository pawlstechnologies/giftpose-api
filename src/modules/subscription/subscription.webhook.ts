import express from "express";
import { stripe } from "../../config/stripe";
import { handleStripeEvent } from "./stripeWebhook.service";
import { sendStripeDebugEmail } from "../../utils/email";

const router = express.Router();

router.post("/", async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const rawSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const webhookSecret = rawSecret ? rawSecret.trim().replace(/^["']|["']$/g, "") : undefined;

    const bodyIsBuffer = Buffer.isBuffer(req.body);
    const bodyLength = req.body ? (bodyIsBuffer ? req.body.length : JSON.stringify(req.body).length) : 0;

    if (!signature || !webhookSecret || webhookSecret.includes("XXXX")) {
        await sendStripeDebugEmail({
            stage: "Webhook Error: Secret Not Configured",
            description: "A Stripe webhook request hit the server, but the backend does not have a valid STRIPE_WEBHOOK_SECRET configured in .env (it is missing or contains placeholder 'XXXX').",
            details: {
                hasSignatureHeader: Boolean(signature),
                webhookSecretConfigured: Boolean(webhookSecret),
                configuredSecretPrefix: webhookSecret ? `${webhookSecret.slice(0, 10)}...` : "None",
            },
        });
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
        await sendStripeDebugEmail({
            stage: "Webhook Error: Signature Verification Failed",
            description: "Stripe signature verification failed using stripe.webhooks.constructEvent. This happens when the signing secret in .env does not match the Stripe endpoint (e.g. Test vs Live secret mismatch) or the request body was modified.",
            details: {
                errorMessage: (err as Error).message,
                signaturePrefix: typeof signature === "string" ? `${signature.slice(0, 25)}...` : "Invalid",
                webhookSecretPrefix: `${webhookSecret.slice(0, 10)}...`,
                bodyType: typeof req.body,
                bodyIsBuffer,
                bodyLengthBytes: bodyLength,
            },
        });
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
