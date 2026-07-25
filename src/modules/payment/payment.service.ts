
import crypto from "crypto";
import axios from "axios";
import LocationModel from '../location/location.model';
import ApiError from '../../utils/ApiError';
import { PaymentModel } from "./payment.model";
import { stripe } from '../../config/stripe';


export class PaymentService {
    async createPaymentIntent(deviceId: string) {
        if (!deviceId?.trim()) {
            throw new ApiError(400, 'Device ID is required');
        }

        const location = await LocationModel.findOne({ deviceId });

        if (!location) {
            throw new ApiError(404, "Location not found for the provided device ID");
        }

        // ✅ Unique idempotency key → always new PaymentIntent
        const idempotencyKey = `payment-${deviceId}-${crypto.randomUUID()}`;

        const paymentIntent = await stripe.paymentIntents.create(
            {
                amount: 500,
                currency: "gbp",

                metadata: {
                    deviceId,
                    type: "REMOVE_ADS",
                },

                automatic_payment_methods: {
                    enabled: true,
                },
            },
            { idempotencyKey }
        );

        // ✅ Save every attempt
        await PaymentModel.create({
            deviceId,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret ?? undefined,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: "pending",
            payment_method_types: ["card"],
            metadata: paymentIntent.metadata,
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
            throw new ApiError(
                400,
                "deviceId or userId is required"
            );
        }

        const query =
            conditions.length > 1
                ? { $or: conditions }
                : conditions[0];

        const payments =
            await PaymentModel.find(query).sort({
                createdAt: -1,
            });

        return payments;
    }

}
