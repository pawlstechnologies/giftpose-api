
import express from "express";

import { stripe } from "../../config/stripe";

import { SubscriptionModel } from "../subscription/subscription.model";

const router = express.Router();

router.post(
    "/stripe-webhook",

    express.raw({
        type: "application/json",
    }),

    async (req, res) => {

        const signature =
            req.headers["stripe-signature"]!;

        let event;

        try {

            event =
                stripe.webhooks.constructEvent(
                    req.body,
                    signature,
                    process.env
                        .STRIPE_WEBHOOK_SECRET!
                );

        } catch (err) {

            return res
                .status(400)
                .send("Webhook Error");
        }

        switch (event.type) {

            case "invoice.payment_succeeded": {

                const invoice =
                    event.data.object as any;

                const subscriptionId =
                    invoice.subscription;

                await SubscriptionModel.findOneAndUpdate(
                    {
                        stripeSubscriptionId:
                            subscriptionId,
                    },
                    {
                        status: "active",

                        currentPeriodEnd:
                            new Date(
                                invoice.lines.data[0]
                                    .period.end * 1000
                            ),
                    }
                );

                break;
            }

            case "invoice.payment_failed": {

                const invoice =
                    event.data.object as any;

                await SubscriptionModel.findOneAndUpdate(
                    {
                        stripeSubscriptionId:
                            invoice.subscription,
                    },
                    {
                        status: "past_due",
                    }
                );

                break;
            }

            case "customer.subscription.deleted": {

                const subscription =
                    event.data.object as any;

                await SubscriptionModel.findOneAndUpdate(
                    {
                        stripeSubscriptionId:
                            subscription.id,
                    },
                    {
                        status: "cancelled",
                    }
                );

                break;
            }
        }

        res.json({
            received: true,
        });
    }
);

export default router;