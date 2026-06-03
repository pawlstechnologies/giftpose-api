// models/subscription.model.ts

import { Schema, model } from "mongoose";
import { Subscription } from "./subscription.types";

const subscriptionSchema = new Schema<Subscription>(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },

    userId: {
      type: String,
    },

    stripeCustomerId: {
      type: String,
      required: true,
      index: true,
    },

    stripeSubscriptionId: {
      type: String,
      required: true,
      index: true,
    },

    stripePriceId: {
      type: String,
      required: true,
    },

    plan: {
      type: String,
      enum: ["monthly", "annual"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "canceled",
        "past_due",
        "incomplete",
        "incomplete_expired"
      ],
      default: "inactive",
    },

    currentPeriodEnd: {
      type: Date,
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const SubscriptionModel = model<Subscription>(
  "Subscription",
  subscriptionSchema
);