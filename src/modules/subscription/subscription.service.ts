import { stripe } from "../../config/stripe";
import { SubscriptionModel } from "./subscription.model";
import { PlanType, SubscriptionStatus } from "./subscription.types";
import ApiError from "../../utils/ApiError";
import { sendStripeDebugEmail } from "../../utils/email";

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

        await sendStripeDebugEmail({
            stage: "1. Payment Initiated (Subscription Checkout Created)",
            eventType: "subscription.checkout_initiated",
            description: "A subscription checkout was initiated by the mobile app. A Stripe subscription was created in 'incomplete' status and clientSecret was generated for PaymentSheet confirmation.",
            details: {
                deviceId,
                userId,
                plan,
                stripePriceId: priceId,
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: customerId,
                status: subscription.status,
                clientSecretPrefix: clientSecret ? `${clientSecret.slice(0, 15)}...` : "None",
            },
        });

        return {
            subscriptionId: subscription.id,
            clientSecret,
        };
    }

    async changePlan(
        deviceId: string,
        newPlan: PlanType,
        requesterUserId?: string
    ) {
        if (!deviceId?.trim() && !requesterUserId?.trim()) {
            throw new ApiError(400, "Device ID or user is required");
        }

        if (!ALLOWED_PLANS.includes(newPlan)) {
            throw new ApiError(400, "plan must be monthly or annual");
        }

        const conditions: Record<string, string>[] = [];

        if (deviceId?.trim()) {
            conditions.push({ deviceId });
        }

        if (requesterUserId?.trim()) {
            conditions.push({ userId: requesterUserId });
        }

        const [byDeviceId, byUserId] = await Promise.all([
            deviceId?.trim()
                ? SubscriptionModel.find({ deviceId }).sort({ createdAt: -1 }).lean()
                : Promise.resolve([]),
            requesterUserId?.trim()
                ? SubscriptionModel.find({ userId: requesterUserId }).sort({ createdAt: -1 }).lean()
                : Promise.resolve([]),
        ]);

       

        const active = await SubscriptionModel.findOne({
            status: "active",
            ...(conditions.length > 1 ? { $or: conditions } : conditions[0]),
        }).sort({ createdAt: -1 });

      

        if (!active) {
            throw new ApiError(
                400,
                "No active subscription in database to change",
               
            );
        }

        if (
            requesterUserId &&
            active.userId &&
            active.userId !== requesterUserId
        ) {
            throw new ApiError(403, "Not allowed to change this subscription");
        }

        if (active.plan === newPlan) {
            throw new ApiError(400, `Already on the ${newPlan} plan`);
        }

        let stripeSubscription: any;
        try {
            stripeSubscription = await stripe.subscriptions.retrieve(
                active.stripeSubscriptionId
            );
        } catch (err: any) {
            throw new ApiError(
                400,
                "Subscription exists in database but was not found on Stripe",
                {
                    stripeSubscriptionId: active.stripeSubscriptionId,
                    stripeError: err?.message,
                }
            );
        }

        console.log("CHANGE PLAN STRIPE STATUS:", {
            stripeSubscriptionId: stripeSubscription.id,
            stripeStatus: stripeSubscription.status,
            dbStatus: active.status,
            currentPeriodEnd: stripeSubscription.current_period_end
                ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
                : null,
        });

        // Keep DB in sync with Stripe
        if (active.status !== stripeSubscription.status) {
            active.status = ["active", "inactive", "canceled", "past_due", "incomplete", "incomplete_expired", "unpaid"].includes(
                stripeSubscription.status
            )
                ? stripeSubscription.status
                : active.status;
            await active.save();
        }

        if (stripeSubscription.status !== "active") {
            throw new ApiError(
                400,
                `Subscription is "${stripeSubscription.status}" on Stripe, not active. Database was out of sync.`,
                {
                    matchedActiveSubscription: {
                        _id: active._id,
                        status: active.status,
                        plan: active.plan,
                        stripeSubscriptionId: active.stripeSubscriptionId,
                    },
                    stripeStatus: stripeSubscription.status,
                }
            );
        }

        const periodEndUnix = stripeSubscription.current_period_end as number;
        const currentPlanEndsAt = new Date(periodEndUnix * 1000);
        // New plan starts at the end of the current period (e.g. monthly ends 2 Sept → annual from that boundary / 3 Sept).
        const newPlanStartsAt = currentPlanEndsAt;

        active.currentPeriodEnd = currentPlanEndsAt;
        await active.save();

        const newPriceId = getPriceId(newPlan);
        const price = await stripe.prices.retrieve(newPriceId);

        if (!price.unit_amount || !price.currency) {
            throw new ApiError(500, "Stripe price amount is not configured");
        }

        const reusableStatuses = [
            "requires_payment_method",
            "requires_confirmation",
            "requires_action",
        ];

        if (
            active.pendingPlanChange?.status === "pending_payment" &&
            active.pendingPlanChange.plan === newPlan &&
            active.pendingPlanChange.paymentIntentId
        ) {
            try {
                const existingIntent = await stripe.paymentIntents.retrieve(
                    active.pendingPlanChange.paymentIntentId
                );

                if (reusableStatuses.includes(existingIntent.status)) {
                    return {
                        clientSecret: existingIntent.client_secret,
                        currentPlan: active.plan,
                        newPlan,
                        currentPlanEndsAt,
                        newPlanStartsAt,
                        amount: price.unit_amount,
                        currency: price.currency,
                        message: `Pay now for ${newPlan}. Your ${active.plan} plan stays active until ${currentPlanEndsAt.toISOString()}. ${newPlan} starts on ${newPlanStartsAt.toISOString()}.`,
                        debug: {
                        
                            matchedActiveSubscription: active.toObject(),
                        },
                    };
                }
            } catch {
                // Create a fresh payment intent below.
            }
        }

        if (active.pendingPlanChange?.status === "scheduled") {
            throw new ApiError(
                400,
                `A switch to ${active.pendingPlanChange.plan} is already scheduled for ${active.pendingPlanChange.startsAt.toISOString()}`
            );
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: price.unit_amount,
            currency: price.currency,
            customer: active.stripeCustomerId,
            metadata: {
                type: "PLAN_CHANGE",
                deviceId,
                userId: active.userId || "",
                newPlan,
                currentSubscriptionId: active.stripeSubscriptionId,
                startsAt: String(periodEndUnix),
                newPriceId,
            },
            automatic_payment_methods: {
                enabled: true,
            },
            setup_future_usage: "off_session",
        });

        active.pendingPlanChange = {
            plan: newPlan,
            stripePriceId: newPriceId,
            paymentIntentId: paymentIntent.id,
            startsAt: newPlanStartsAt,
            status: "pending_payment",
        };
        await active.save();

        return {
            clientSecret: paymentIntent.client_secret,
            currentPlan: active.plan,
            newPlan,
            currentPlanEndsAt,
            newPlanStartsAt,
            amount: price.unit_amount,
            currency: price.currency,
            message: `Pay now for ${newPlan}. Your ${active.plan} plan stays active until ${currentPlanEndsAt.toISOString()}. ${newPlan} starts on ${newPlanStartsAt.toISOString()}.`,
            debug: {
                matchedActiveSubscription: active.toObject(),
            },
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
