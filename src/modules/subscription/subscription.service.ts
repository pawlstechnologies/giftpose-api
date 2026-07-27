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
            throw new ApiError(
                400,
                "Device ID required"
            );
        }

        const priceId =
            plan === "monthly"
                ? process.env
                    .STRIPE_MONTHLY_PRICE_ID!
                : process.env
                    .STRIPE_ANNUAL_PRICE_ID!;

        const existing =
            await SubscriptionModel.findOne({
                deviceId,
            });

        // EXISTING SUBSCRIPTION
        if (existing) {

            let stripeSubscription: any = null;

            try {

                stripeSubscription =
                    await stripe.subscriptions.retrieve(
                        existing.stripeSubscriptionId,
                        {
                            expand: [
                                "latest_invoice.payment_intent",
                            ],
                        }
                    );

            } catch (error) {

                // Subscription no longer exists on Stripe
                await SubscriptionModel.deleteOne({
                    _id: existing._id,
                });
            }

            // VALID STRIPE SUBSCRIPTION
            if (stripeSubscription) {

                const stripeStatus =
                    stripeSubscription.status;

                // Sync DB status
                existing.status =
                    stripeStatus;

                await existing.save();

                // ACTIVE SUBSCRIPTION
                if (
                    stripeStatus === "active" ||
                    stripeStatus === "past_due"
                ) {
                    throw new ApiError(
                        400,
                        "Subscription already exists"
                    );
                }

                // INCOMPLETE SUBSCRIPTION
                if (
                    stripeStatus === "incomplete"
                ) {

                    // SAME PLAN
                    if (
                        existing.plan === plan
                    ) {

                        const invoice =
                            stripeSubscription
                                .latest_invoice;

                        const paymentIntent =
                            invoice?.payment_intent;

                        if (
                            !paymentIntent?.client_secret
                        ) {
                            throw new ApiError(
                                500,
                                "Unable to retrieve payment intent"
                            );
                        }

                        return {
                            subscriptionId:
                                stripeSubscription.id,

                            clientSecret:
                                paymentIntent.client_secret,
                        };
                    }

                    // DIFFERENT PLAN

                    // Cancel old incomplete subscription
                    await stripe.subscriptions.cancel(
                        stripeSubscription.id
                    );

                    // Remove old DB record
                    await SubscriptionModel.deleteOne({
                        _id: existing._id,
                    });
                }

                // CANCELED / EXPIRED
                if (
                    stripeStatus === "canceled" ||
                    stripeStatus ===
                    "incomplete_expired" ||
                    stripeStatus ===
                    "unpaid"
                ) {

                    await SubscriptionModel.deleteOne({
                        _id: existing._id,
                    });
                }
            }
        }

        // CREATE NEW SUBSCRIPTION

        const customer =
            await stripe.customers.create({
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

                payment_behavior:
                    "default_incomplete",

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
            }) as any;

        const invoice =
            subscription.latest_invoice;

        const paymentIntent =
            invoice?.payment_intent;

        if (
            !paymentIntent?.client_secret
        ) {
            throw new ApiError(
                500,
                "Unable to retrieve payment intent"
            );
        }

        await SubscriptionModel.create({
            deviceId,

            stripeCustomerId:
                customer.id,

            stripeSubscriptionId:
                subscription.id,

            stripePriceId:
                priceId,

            plan,

            status:
                subscription.status,

            currentPeriodEnd:
                new Date(
                    subscription.current_period_end *
                    1000
                ),
        });

        return {
            subscriptionId:
                subscription.id,

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

    async getSubscriptions(deviceId?: string, userId?: string) {

        const conditions: Record<string, string>[] = [];

        if (deviceId?.trim()) {
            conditions.push({ deviceId });
        }

        if (userId?.trim()) {
            conditions.push({ userId });
        }

        if (!conditions.length) {
            throw new ApiError(
                400,
                "deviceId or userId is required"
            );
        }

        const query =
            conditions.length > 1
                ? { $or: conditions }
                : conditions[0];

        const subscriptions =
            await SubscriptionModel.find(query).sort({
                createdAt: -1,
            });

        return subscriptions;
    }

    async getCurrentSubscription(deviceId?: string, userId?: string) {

        const conditions: Record<string, string>[] = [];

        if (deviceId?.trim()) {
            conditions.push({ deviceId });
        }

        if (userId?.trim()) {
            conditions.push({ userId });
        }

        if (!conditions.length) {
            throw new ApiError(
                400,
                "deviceId or userId is required"
            );
        }

        const query =
            conditions.length > 1
                ? { $or: conditions }
                : conditions[0];

        const subscription =
            await SubscriptionModel.findOne(query).sort({
                createdAt: -1,
            });

        return subscription;
    }

    async updateStatus(
        subscriptionId: string,
        status: string
    ) {

        if (!subscriptionId?.trim()) {
            throw new ApiError(
                400,
                "subscriptionId is required"
            );
        }

        const allowedStatuses = [
            "active",
            "inactive",
            "canceled",
            "past_due",
            "incomplete",
            "incomplete_expired",
        ];

        if (!allowedStatuses.includes(status)) {
            throw new ApiError(
                400,
                `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
            );
        }

        const subscription =
            await SubscriptionModel.findOneAndUpdate(
                { stripeSubscriptionId: subscriptionId },
                { status },
                { new: true }
            );

        if (!subscription) {
            throw new ApiError(
                404,
                "Subscription not found"
            );
        }

        return subscription;
    }

}

export const subscriptionService =
    new SubscriptionService();