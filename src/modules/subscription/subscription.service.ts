import { stripe } from "../../config/stripe";

import { SubscriptionModel } from "../../modules/subscription/subscription.model";
import { PlanType } from "../../modules/subscription/subscription.types";
import ApiError from "../../utils/ApiError";



export class SubscriptionService {
    async createSubscription(
        deviceId: string,
        plan: PlanType
    ) {

        if (!deviceId?.trim()) {
            throw new ApiError(400, "Device ID required");
        }

        const existing = await SubscriptionModel.findOne({
            deviceId,
            status: {
                $in: ["active", "incomplete", "past_due"],
            },
        });

        if (existing) {
            throw new ApiError(
                400,
                "Subscription already exists"
            );
        }

        const priceId =
            plan === "monthly"
                ? process.env.STRIPE_MONTHLY_PRICE_ID!
                : process.env.STRIPE_ANNUAL_PRICE_ID!;

        const customer = await stripe.customers.create({
            metadata: {
                deviceId,
            },
        });

        const subscription =
            await stripe.subscriptions.create({
                customer: customer.id,

                items: [
                    {
                        price: priceId,
                    },
                ],

                payment_behavior: "default_incomplete",

                payment_settings: {
                    save_default_payment_method:
                        "on_subscription",
                },

                expand: [
                    "latest_invoice.payment_intent",
                ],

                metadata: {
                    deviceId,
                    plan,
                },
            });

        const invoice =
            subscription.latest_invoice as any;

        const paymentIntent =
            invoice.payment_intent;

        await SubscriptionModel.create({
            deviceId,

            stripeCustomerId: customer.id,

            stripeSubscriptionId:
                subscription.id,

            stripePriceId: priceId,

            plan,

            status: subscription.status,

            currentPeriodEnd: new Date(
                subscription.current_period_end *
                1000
            ),
        });

        return {
            subscriptionId: subscription.id,

            clientSecret:
                paymentIntent.client_secret,
        };
    }


    async cancelSubscription(
        subscriptionId: string,
        cancelImmediately = false
    ) {

        const subscription =
            await SubscriptionModel.findOne({
                stripeSubscriptionId:
                    subscriptionId,
            });

        if (!subscription) {
            throw new ApiError(
                404,
                "Subscription not found"
            );
        }

        if (cancelImmediately) {

            await stripe.subscriptions.cancel(
                subscriptionId
            );

            subscription.status =
                "cancelled";

        } else {

            await stripe.subscriptions.update(
                subscriptionId,
                {
                    cancel_at_period_end:
                        true,
                }
            );

            subscription.cancelAtPeriodEnd =
                true;
        }

        await subscription.save();

        return {
            success: true,
        };
    }
}

export const subscriptionService =
    new SubscriptionService();