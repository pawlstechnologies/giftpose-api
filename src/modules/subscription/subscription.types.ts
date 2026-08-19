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
}

export type HydratedSubscription = HydratedDocument<Subscription>;
