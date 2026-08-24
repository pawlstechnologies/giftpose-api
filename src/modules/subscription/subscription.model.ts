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
      required: true,
      index: true,
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
        "incomplete_expired",
        "unpaid",
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

    pendingPlanChange: {
      plan: {
        type: String,
        enum: ["monthly", "annual"],
      },
      stripePriceId: String,
      paymentIntentId: String,
      startsAt: Date,
      status: {
        type: String,
        enum: ["pending_payment", "scheduled"],
      },
      pendingStripeSubscriptionId: String,
    },
  },
  { timestamps: true }
);

export const SubscriptionModel = model<Subscription>(
  "Subscription",
  subscriptionSchema
);