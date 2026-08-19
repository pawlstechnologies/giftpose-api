import { stripe } from "../../config/stripe";
import { SubscriptionModel } from "./subscription.model";
import { PlanType, SubscriptionStatus } from "./subscription.types";
import ApiError from "../../utils/ApiError";

const ALLOWED_PLANS: PlanType[] = ["monthly", "annual"];

const extractClientSecret = (subscription: any): string | undefined => {
    const invoice = subscription?.latest_invoice;
    const paymentIntent = invoice?.payment_intent;

    if (paymentIntent?.client_secret) {
        return paymentIntent.client_secret;
    }

    return invoice?.confirmation_secret?.client_secret;
};

const getPriceId = (plan: PlanType) => {
    const priceId =
        plan === "monthly"
            ? process.env.STRIPE_MONTHLY_PRICE_ID
            : process.env.STRIPE_ANNUAL_PRICE_ID;

    if (!priceId) {
        throw new ApiError(500, "Stripe price is not configured");
    }

    return priceId;
};

const ensureCustomer = async (
    existingCustomerId: string | undefined,
    deviceId: string,
    userId: string
) => {
    if (existingCustomerId) {
        try {
            const customer = await stripe.customers.retrieve(existingCustomerId);
            if (!(customer as { deleted?: boolean }).deleted) {
                return existingCustomerId;
            }
        } catch {
            // Customer no longer exists on Stripe; create a new one below.
        }
    }

    const customer = await stripe.customers.create({
        metadata: { deviceId, userId },
    });

    return customer.id;
};

export class SubscriptionService {
    async createSubscription(
        deviceId: string,
        userId: string,
        plan: PlanType
    ) {
        if (!deviceId?.trim()) {
            throw new ApiError(400, "Device ID required");
        }

        if (!userId?.trim()) {
            throw new ApiError(400, "User ID required");
        }

        if (!ALLOWED_PLANS.includes(plan)) {
            throw new ApiError(400, "plan must be monthly or annual");
        }

        const priceId = getPriceId(plan);
        const existing = await SubscriptionModel.findOne({ deviceId });

        if (existing && existing.userId !== userId) {
            existing.userId = userId;
            await existing.save();
        }

        if (existing?.stripeSubscriptionId) {
            try {
                const stripeSubscription: any = await stripe.subscriptions.retrieve(
                    existing.stripeSubscriptionId,
                    {
                        expand: ["latest_invoice.payment_intent"],
                    }
                );

                existing.status = stripeSubscription.status;
                await existing.save();

                if (
                    stripeSubscription.status === "active" ||
                    stripeSubscription.status === "past_due"
                ) {
                    throw new ApiError(400, "Subscription already exists");
                }

                if (stripeSubscription.status === "incomplete" && existing.plan === plan) {
                    const clientSecret = extractClientSecret(stripeSubscription);

                    if (!clientSecret) {
                        throw new ApiError(500, "Unable to retrieve payment intent");
                    }

                    return {
                        subscriptionId: stripeSubscription.id,
                        clientSecret,
                    };
                }

                if (stripeSubscription.status === "incomplete") {
                    await stripe.subscriptions.cancel(stripeSubscription.id);
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    throw error;
                }
            }
        }

        const customerId = await ensureCustomer(
            existing?.stripeCustomerId,
            deviceId,
            userId
        );

        const subscription: any = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: "default_incomplete",
            payment_settings: {
                save_default_payment_method: "on_subscription",
            },
            expand: ["latest_invoice.payment_intent"],
            metadata: {
                deviceId,
                userId,
                plan,
            },
        });

        const clientSecret = extractClientSecret(subscription);

        if (!clientSecret) {
            throw new ApiError(500, "Unable to retrieve payment intent");
        }

        const payload = {
            deviceId,
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            plan,
            status: ["active", "inactive", "canceled", "past_due", "incomplete", "incomplete_expired", "unpaid"].includes(
                subscription.status
            )
                ? subscription.status
                : "incomplete",
            currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : undefined,
            cancelAtPeriodEnd: false,
        };

        if (existing) {
            Object.assign(existing, payload);
            await existing.save();
        } else {
            await SubscriptionModel.create(payload);
        }

        return {
            subscriptionId: subscription.id,
            clientSecret,
        };
    }

    async cancelSubscription(
        subscriptionId: string,
        cancelImmediately = false,
        requesterUserId?: string
    ) {
        const subscription = await SubscriptionModel.findOne({
            stripeSubscriptionId: subscriptionId,
        });

        if (!subscription) {
            throw new ApiError(404, "Subscription not found");
        }

        if (requesterUserId && subscription.userId !== requesterUserId) {
            throw new ApiError(403, "Not allowed to cancel this subscription");
        }

        if (cancelImmediately) {
            await stripe.subscriptions.cancel(subscriptionId);
            subscription.status = "canceled";
            subscription.cancelAtPeriodEnd = false;
        } else {
            await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true,
            });
            subscription.cancelAtPeriodEnd = true;
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
            throw new ApiError(400, "deviceId or userId is required");
        }

        const query =
            conditions.length > 1
                ? { $or: conditions }
                : conditions[0];

        return SubscriptionModel.find(query).sort({
            createdAt: -1,
        });
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
            throw new ApiError(400, "deviceId or userId is required");
        }

        const query = {
            $and: [
                { status: { $in: ["active", "past_due"] } },
                conditions.length > 1 ? { $or: conditions } : conditions[0],
            ],
        };

        return SubscriptionModel.findOne(query).sort({
            createdAt: -1,
        });
    }

    async updateStatus(
        subscriptionId: string,
        status: string,
        requesterUserId?: string
    ) {
        if (!subscriptionId?.trim()) {
            throw new ApiError(400, "subscriptionId is required");
        }

        const allowedStatuses: SubscriptionStatus[] = [
            "inactive",
            "canceled",
            "past_due",
            "incomplete",
            "incomplete_expired",
            "unpaid",
        ];

        if (status === "active") {
            throw new ApiError(403, "Active status is set by the billing webhook");
        }

        if (!allowedStatuses.includes(status as SubscriptionStatus)) {
            throw new ApiError(
                400,
                `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
            );
        }

        const subscription = await SubscriptionModel.findOne({
            stripeSubscriptionId: subscriptionId,
        });

        if (!subscription) {
            throw new ApiError(404, "Subscription not found");
        }

        if (requesterUserId && subscription.userId !== requesterUserId) {
            throw new ApiError(403, "Not allowed to update this subscription");
        }

        subscription.status = status as SubscriptionStatus;
        await subscription.save();

        return subscription;
    }
}

export const subscriptionService = new SubscriptionService();
