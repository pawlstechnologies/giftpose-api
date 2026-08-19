import { SubscriptionModel } from "./subscription.model";
import { PaymentModel } from "../payment/payment.model";
import LocationModel from "../location/location.model";

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

const applyInvoicePaid = async (invoice: any) => {
    const subscriptionId = getSubscriptionIdFromInvoice(invoice);
    if (!subscriptionId) {
        console.error("Invoice paid but no subscription id found");
        return;
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
};

const applyInvoicePaymentFailed = async (invoice: any) => {
    const subscriptionId = getSubscriptionIdFromInvoice(invoice);
    if (!subscriptionId) return;

    await SubscriptionModel.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        { status: "past_due" },
        { new: true }
    );
};

const applySubscriptionDeleted = async (stripeSubscription: any) => {
    const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
        { stripeSubscriptionId: stripeSubscription.id },
        {
            status: "canceled",
            cancelAtPeriodEnd: false,
        },
        { new: true }
    );

    await setLocationFromSubscription(updatedSubscription, false);
};

const applySubscriptionUpdated = async (stripeSubscription: any) => {
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
        return;
    }

    if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
        await setLocationFromSubscription(updatedSubscription, false);
    }
};

const applyPaymentIntentSucceeded = async (paymentIntent: any) => {
    const payment = await PaymentModel.findOneAndUpdate(
        { paymentIntentId: paymentIntent.id },
        { status: "success" },
        { new: true }
    );

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
};

const applyPaymentIntentFailed = async (paymentIntent: any) => {
    await PaymentModel.findOneAndUpdate(
        { paymentIntentId: paymentIntent.id },
        { status: "failed" }
    );
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
            break;
    }
};
