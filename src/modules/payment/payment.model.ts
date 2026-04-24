import { Schema, model, HydratedDocument } from "mongoose";
import { PaymentIntent } from "./payment.types";

const paymentSchema = new Schema<PaymentIntent>({
    deviceId: { type: String, required: true },
    userId: { type: String, required: false },
    paymentIntentId: { type: String, required: false },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    clientSecret: { type: String },
    status: {
        type: String,
        enum: ["pending", "success", "failed"],
        default: "pending",
    },
    payment_method_types: { type: [String], default: ["card"] },
    description: { type: String, required: false },
    metadata: { type: Object, required: false }
}, { timestamps: true });

export const PaymentModel = model<PaymentIntent>("Payment", paymentSchema);
