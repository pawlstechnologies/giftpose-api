import { HydratedDocument } from "mongoose";

export type PlanType = "monthly" | "annual";

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "canceled"
  | "past_due"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

export type PendingPlanChangeStatus = "pending_payment" | "scheduled";

export interface PendingPlanChange {
  plan: PlanType;
  stripePriceId: string;
  paymentIntentId: string;
  startsAt: Date;
  status: PendingPlanChangeStatus;
  pendingStripeSubscriptionId?: string;
}

export interface Subscription {
  deviceId: string;
  userId?: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  pendingPlanChange?: PendingPlanChange;
}

export type HydratedSubscription = HydratedDocument<Subscription>;
