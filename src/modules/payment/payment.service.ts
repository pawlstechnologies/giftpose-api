import LocationModel from "../location/location.model";
import ApiError from "../../utils/ApiError";
import { PaymentModel } from "./payment.model";
import { stripe } from "../../config/stripe";

const REUSABLE_STATUSES = [
    "requires_payment_method",
    "requires_confirmation",
    "requires_action",
];

export class PaymentService {
    async createPaymentIntent(deviceId: string, userId?: string) {
        if (!deviceId?.trim()) {
            throw new ApiError(400, "Device ID is required");
        }

        const location = await LocationModel.findOne({ deviceId });

        if (!location) {
            throw new ApiError(404, "Location not found for the provided device ID");
        }

        if (location.adEnabled === false) {
            throw new ApiError(400, "Ads are already removed for this device");
        }

        const existing = await PaymentModel.findOne({
            deviceId,
            "metadata.type": "REMOVE_ADS",
        }).sort({ createdAt: -1 });

        if (existing?.paymentIntentId) {
            try {
                const existingIntent = await stripe.paymentIntents.retrieve(
                    existing.paymentIntentId
                );

                if (existingIntent.status === "succeeded") {
                    existing.status = "success";
                    await existing.save();
                    await LocationModel.findOneAndUpdate(
                        { deviceId },
                        { adEnabled: false }
                    );
                    throw new ApiError(400, "Ads are already removed for this device");
                }

                if (REUSABLE_STATUSES.includes(existingIntent.status)) {
                    return {
                        clientSecret: existingIntent.client_secret,
                    };
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    throw error;
                }
            }
        }

        const paymentIntent = await stripe.paymentIntents.create(
            {
                amount: 500,
                currency: "gbp",
                metadata: {
                    deviceId,
                    ...(userId ? { userId } : {}),
                    type: "REMOVE_ADS",
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            },
            {
                idempotencyKey: existing?.paymentIntentId
                    ? `remove-ads-${deviceId}-${existing.paymentIntentId}`
                    : `remove-ads-${deviceId}`,
            }
        );

        await PaymentModel.create({
            deviceId,
            userId,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret ?? undefined,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: "pending",
            payment_method_types: ["card"],
            metadata: {
                deviceId,
                ...(userId ? { userId } : {}),
                type: "REMOVE_ADS",
            },
        });

        return {
            clientSecret: paymentIntent.client_secret,
        };
    }

    async getPayments(deviceId?: string, userId?: string) {
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

        return PaymentModel.find(query).sort({
            createdAt: -1,
        });
    }
}
