import { SubscriptionModel } from "./subscription.model";
import { PaymentModel } from "../payment/payment.model";
import LocationModel from "../location/location.model";
import { stripe } from "../../config/stripe";
import { PlanType } from "./subscription.types";
import { sendStripeDebugEmail } from "../../utils/email";

const getSubscriptionIdFromInvoice = (invoice: any): string | undefined => {
    const raw =
        invoice?.subscription ||
        invoice?.parent?.subscription_details?.subscription ||
        invoice?.lines?.data?.[0]?.subscription ||
        invoice?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription;

    if (!raw) return undefined;
    return typeof raw === "string" ? raw : raw.id;
};

const getPeriodEndFromInvoice = (invoice: any): Date | undefined => {
    const end =
        invoice?.lines?.data?.[0]?.period?.end ||
        invoice?.period_end;

    if (!end) return undefined;
    return new Date(end * 1000);
};

const setLocationFromSubscription = async (
    subscription: { _id: any; deviceId?: string; stripeSubscriptionId?: string } | null,
    premium: boolean
) => {
    if (!subscription?.deviceId) return;

    await LocationModel.findOneAndUpdate(
        { deviceId: subscription.deviceId },
        {
            adEnabled: !premium,
            isPremium: premium,
            subscriptionId: subscription.stripeSubscriptionId,
            subscription: subscription._id,
        }
    );
};

const activateScheduledPlanChange = async (stripeSubscription: any) => {
    if (stripeSubscription.metadata?.type !== "PLAN_CHANGE_SCHEDULED") {
        return false;
    }

    const deviceId = stripeSubscription.metadata.deviceId;
    const newPlan = stripeSubscription.metadata.plan as PlanType;
    const replacesSubscriptionId = stripeSubscription.metadata.replacesSubscriptionId;

    let record = replacesSubscriptionId
        ? await SubscriptionModel.findOne({
            deviceId,
            stripeSubscriptionId: replacesSubscriptionId,
        })
        : null;

    if (!record) {
        record = await SubscriptionModel.findOne({
            "pendingPlanChange.pendingStripeSubscriptionId": stripeSubscription.id,
        });
    }

    if (!record) return false;

    record.plan = newPlan;
    record.stripeSubscriptionId = stripeSubscription.id;
    record.stripePriceId =
        stripeSubscription.items?.data?.[0]?.price?.id || record.stripePriceId;
    record.status = "active";
    record.cancelAtPeriodEnd = false;
    record.currentPeriodEnd = stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000)
        : undefined;
    record.pendingPlanChange = undefined;
    await record.save();
    await setLocationFromSubscription(record, true);
    return true;
};

const applyPlanChangePayment = async (paymentIntent: any) => {
    if (paymentIntent.metadata?.type !== "PLAN_CHANGE") {
        return;
    }

    const deviceId = paymentIntent.metadata.deviceId as string;
    const newPlan = paymentIntent.metadata.newPlan as PlanType;
    const newPriceId = paymentIntent.metadata.newPriceId as string;
    const currentSubscriptionId = paymentIntent.metadata.currentSubscriptionId as string;
    const startsAtUnix = Number(paymentIntent.metadata.startsAt);

    if (!deviceId || !newPlan || !newPriceId || !currentSubscriptionId || !startsAtUnix) {
        console.error("PLAN_CHANGE payment missing metadata");
        return;
    }

    const active = await SubscriptionModel.findOne({
        deviceId,
        stripeSubscriptionId: currentSubscriptionId,
    });

    if (!active) {
        console.error("PLAN_CHANGE subscription not found", deviceId);
        return;
    }

    if (active.pendingPlanChange?.status === "scheduled") {
        return;
    }

    await stripe.subscriptions.update(currentSubscriptionId, {
        cancel_at_period_end: true,
    });

    await stripe.customers.createBalanceTransaction(active.stripeCustomerId, {
        amount: -paymentIntent.amount,
        currency: paymentIntent.currency,
        description: `Prepaid ${newPlan} plan change`,
    });

    const paymentMethodId =
        typeof paymentIntent.payment_method === "string"
            ? paymentIntent.payment_method
            : paymentIntent.payment_method?.id;

    if (paymentMethodId) {
        await stripe.customers.update(active.stripeCustomerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
    }

    const nowUnix = Math.floor(Date.now() / 1000);
    const trialEnd = Math.max(startsAtUnix, nowUnix + 60);

    const newSubscription: any = await stripe.subscriptions.create({
        customer: active.stripeCustomerId,
        items: [{ price: newPriceId }],
        trial_end: trialEnd,
        ...(paymentMethodId ? { default_payment_method: paymentMethodId } : {}),
        metadata: {
            deviceId,
            userId: active.userId || "",
            plan: newPlan,
            type: "PLAN_CHANGE_SCHEDULED",
            replacesSubscriptionId: currentSubscriptionId,
        },
    });

    active.cancelAtPeriodEnd = true;
    active.pendingPlanChange = {
        plan: newPlan,
        stripePriceId: newPriceId,
        paymentIntentId: paymentIntent.id,
        startsAt: new Date(trialEnd * 1000),
        status: "scheduled",
        pendingStripeSubscriptionId: newSubscription.id,
    };
    await active.save();
};

const applyInvoicePaid = async (invoice: any) => {
    const subscriptionId = getSubscriptionIdFromInvoice(invoice);
    if (!subscriptionId) {
        console.error("Invoice paid but no subscription id found");
        return;
    }

    try {
        const stripeSubscription: any = await stripe.subscriptions.retrieve(subscriptionId);
        if (await activateScheduledPlanChange(stripeSubscription)) {
            return;
        }
    } catch (err) {
        console.error("Failed to activate scheduled plan change:", err);
    }

    const periodEnd = getPeriodEndFromInvoice(invoice);
    const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        {
            status: "active",
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
        },
        { new: true }
    );

    await setLocationFromSubscription(updatedSubscription, true);

    await sendStripeDebugEmail({
        stage: "2. Invoice Paid & Account Upgraded (Premium Activated)",
        eventType: "invoice.paid / invoice.payment_succeeded",
        description: "Payment succeeded on Stripe! The subscription status has been set to 'active' in MongoDB, and the user's location has been upgraded: isPremium=true, adEnabled=false.",
        details: {
            invoiceId: invoice.id,
            stripeSubscriptionId: subscriptionId,
            amountPaid: invoice.amount_paid ? `${invoice.amount_paid / 100} ${invoice.currency?.toUpperCase()}` : "0",
            customerEmail: invoice.customer_email || "N/A",
            stripeCustomerId: invoice.customer,
            deviceId: updatedSubscription?.deviceId || "N/A",
            plan: updatedSubscription?.plan || "N/A",
            subscriptionStatus: updatedSubscription?.status || "active",
            isPremium: true,
            adEnabled: false,
            currentPeriodEnd: updatedSubscription?.currentPeriodEnd ? updatedSubscription.currentPeriodEnd.toISOString() : "N/A",
        },
    });
};

const applyInvoicePaymentFailed = async (invoice: any) => {
    const subscriptionId = getSubscriptionIdFromInvoice(invoice);
    if (!subscriptionId) return;

    const updated = await SubscriptionModel.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        { status: "past_due" },
        { new: true }
    );

    await sendStripeDebugEmail({
        stage: "Invoice Payment Failed (Subscription Past Due)",
        eventType: "invoice.payment_failed",
        description: "Payment for invoice failed on Stripe. The subscription status has been marked 'past_due' in MongoDB.",
        details: {
            invoiceId: invoice.id,
            stripeSubscriptionId: subscriptionId,
            amountAttempted: invoice.amount_due ? `${invoice.amount_due / 100} ${invoice.currency?.toUpperCase()}` : "0",
            customerEmail: invoice.customer_email || "N/A",
            deviceId: updated?.deviceId || "N/A",
            attemptCount: invoice.attempt_count,
            nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : "None",
        },
    });
};

const applySubscriptionDeleted = async (stripeSubscription: any) => {
    if (stripeSubscription.metadata?.type === "PLAN_CHANGE_SCHEDULED") {
        return;
    }

    const pendingReplacement = await SubscriptionModel.findOne({
        stripeSubscriptionId: stripeSubscription.id,
        "pendingPlanChange.status": "scheduled",
    });

    if (pendingReplacement?.pendingPlanChange?.pendingStripeSubscriptionId) {
        try {
            const nextSub: any = await stripe.subscriptions.retrieve(
                pendingReplacement.pendingPlanChange.pendingStripeSubscriptionId
            );
            if (nextSub.status === "active" || nextSub.status === "trialing") {
                await activateScheduledPlanChange(nextSub);
                return;
            }
        } catch {
            // Fall through to normal cancel handling.
        }
    }

    const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
        { stripeSubscriptionId: stripeSubscription.id },
        {
            status: "canceled",
            cancelAtPeriodEnd: false,
        },
        { new: true }
    );

    await setLocationFromSubscription(updatedSubscription, false);

    await sendStripeDebugEmail({
        stage: "Subscription Canceled / Ended (Account Downgraded)",
        eventType: "customer.subscription.deleted",
        description: "Subscription has ended or was canceled on Stripe. The subscription status has been marked 'canceled' in MongoDB and the device location was downgraded: isPremium=false, adEnabled=true.",
        details: {
            stripeSubscriptionId: stripeSubscription.id,
            deviceId: updatedSubscription?.deviceId || "N/A",
            status: "canceled",
            isPremium: false,
            adEnabled: true,
        },
    });
};

const applySubscriptionUpdated = async (stripeSubscription: any) => {
    if (stripeSubscription.status === "active") {
        if (await activateScheduledPlanChange(stripeSubscription)) {
            return;
        }
    }

    const status = stripeSubscription.status === "cancelled"
        ? "canceled"
        : stripeSubscription.status;

    const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
        { stripeSubscriptionId: stripeSubscription.id },
        {
            status,
            cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
            ...(stripeSubscription.current_period_end
                ? { currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000) }
                : {}),
        },
        { new: true }
    );

    if (status === "active") {
        await setLocationFromSubscription(updatedSubscription, true);
    } else if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
        await setLocationFromSubscription(updatedSubscription, false);
    }

    await sendStripeDebugEmail({
        stage: `Subscription State Updated: ${status.toUpperCase()}`,
        eventType: "customer.subscription.updated",
        description: `Stripe sent a subscription update event. The subscription is now '${status}'. Device location premium status was synced accordingly.`,
        details: {
            stripeSubscriptionId: stripeSubscription.id,
            status,
            cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
            currentPeriodEnd: stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000).toISOString() : "N/A",
            deviceId: updatedSubscription?.deviceId || "N/A",
            isPremium: status === "active",
        },
    });
};

const applyPaymentIntentSucceeded = async (paymentIntent: any) => {
    await PaymentModel.findOneAndUpdate(
        { paymentIntentId: paymentIntent.id },
        { status: "success" },
        { new: true }
    );

    if (paymentIntent.metadata?.type === "PLAN_CHANGE") {
        await applyPlanChangePayment(paymentIntent);
        return;
    }

    const payment = await PaymentModel.findOne({ paymentIntentId: paymentIntent.id });
    const deviceId =
        payment?.deviceId ||
        paymentIntent.metadata?.deviceId;

    const type =
        payment?.metadata?.type ||
        paymentIntent.metadata?.type;

    if (type === "REMOVE_ADS" && deviceId) {
        await LocationModel.findOneAndUpdate(
            { deviceId },
            { adEnabled: false }
        );
    }

    await sendStripeDebugEmail({
        stage: "Payment Intent Succeeded",
        eventType: "payment_intent.succeeded",
        description: "PaymentIntent succeeded on Stripe. Payment record marked as 'success' in MongoDB.",
        details: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount ? `${paymentIntent.amount / 100} ${paymentIntent.currency?.toUpperCase()}` : "0",
            paymentType: type || "General / Subscription",
            deviceId: deviceId || "N/A",
            customerId: paymentIntent.customer || "N/A",
        },
    });
};

const applyPaymentIntentFailed = async (paymentIntent: any) => {
    await PaymentModel.findOneAndUpdate(
        { paymentIntentId: paymentIntent.id },
        { status: "failed" }
    );

    if (paymentIntent.metadata?.type === "PLAN_CHANGE") {
        await SubscriptionModel.findOneAndUpdate(
            { "pendingPlanChange.paymentIntentId": paymentIntent.id },
            { $unset: { pendingPlanChange: 1 } }
        );
    }

    await sendStripeDebugEmail({
        stage: "Payment Intent Failed",
        eventType: "payment_intent.payment_failed",
        description: "PaymentIntent payment attempt failed or was declined by the bank.",
        details: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount ? `${paymentIntent.amount / 100} ${paymentIntent.currency?.toUpperCase()}` : "0",
            errorMessage: paymentIntent.last_payment_error?.message || "Declined / Failed",
            customerId: paymentIntent.customer || "N/A",
        },
    });
};

export const handleStripeEvent = async (event: { type: string; data: { object: any } }) => {
    switch (event.type) {
        case "invoice.paid":
        case "invoice.payment_succeeded":
            await applyInvoicePaid(event.data.object);
            break;

        case "invoice.payment_failed":
            await applyInvoicePaymentFailed(event.data.object);
            break;

        case "customer.subscription.deleted":
            await applySubscriptionDeleted(event.data.object);
            break;

        case "customer.subscription.updated":
            await applySubscriptionUpdated(event.data.object);
            break;

        case "payment_intent.succeeded":
            await applyPaymentIntentSucceeded(event.data.object);
            break;

        case "payment_intent.payment_failed":
            await applyPaymentIntentFailed(event.data.object);
            break;

        default:
            await sendStripeDebugEmail({
                stage: `Stripe Webhook Event Received: ${event.type}`,
                eventType: event.type,
                description: `Received Stripe webhook event '${event.type}'. No specific state transition action was configured for this event.`,
                details: {
                    eventType: event.type,
                    eventId: (event.data.object as any)?.id || "N/A",
                    objectType: (event.data.object as any)?.object || "N/A",
                },
            });
            break;
    }
};
