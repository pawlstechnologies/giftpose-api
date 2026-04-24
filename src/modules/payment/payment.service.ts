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

        // ✅ Prevent duplicate active payment
        const existing = await PaymentModel.findOne({
            deviceId,
            status: "pending",
        });
        
        if (existing) {
            return {
                clientSecret: existing.clientSecret,
            };
        }

        // ✅ Create PaymentIntent in Stripe
        const paymentIntent = await stripe.paymentIntents.create(
            {
                amount: 500, // £5.00
                currency: "gbp",

                metadata: {
                    deviceId,
                    type: "REMOVE_ADS",
                },

                automatic_payment_methods: {
                    enabled: true,
                },
            },
            {
                idempotencyKey: `payment-${deviceId}`,
            }
        );

        // ✅ Save in DB
        await PaymentModel.create({
            deviceId,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            clientSecret: paymentIntent.client_secret ?? undefined,
            status: "pending",
            payment_method_types: ["card"],
            metadata: paymentIntent.metadata,
        });

        paymentIntent.metadata = { deviceId };

        return {
            clientSecret: paymentIntent.client_secret,
            // paymentIntentId: paymentIntent.id
        };
    }
}
