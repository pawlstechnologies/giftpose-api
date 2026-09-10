import express from "express";
import cookieParser from 'cookie-parser';
import morgan from "morgan";
import cors from "cors";


import itemRoutes from './modules/items/item.routes';
import locationRoutes from './modules/location/location.routes';
import categoryRoutes from './modules/category/category.routes';
import alertRoutes from './modules/alerts/alerts.routes';
import notificationRoutes from './modules/notification/notification.routes'
import authRoutes from './modules/onboarding/auth.routes';
import paymentRoutes from './modules/payment/payment.routes';
import userRoutes from './modules/user/user.routes';
import adminAuthRoutes from './admin/auth/admin.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes'
import subscriptionWebhook from './modules/subscription/subscription.webhook';
import activityLog from './admin/activityLog/activity.routes';
import { errorHandler } from "./middleware/error.middleware";
import { globalLimiter, helmetMiddleware } from "./middleware/security";


const app = express();

app.use(morgan("dev"));
app.use(cookieParser());
app.use(helmetMiddleware);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Stripe needs the unmodified request body for signature verification.
app.use(
  ["/api/webhook", "/webhook"],
  express.raw({ type: "application/json" }),
  subscriptionWebhook
);

app.use(express.json());
app.use(globalLimiter);

app.get("/api", (_req, res) => {
  res.json({ message: "Welcome to GiftPose API - the best thing after Jollof Rice 🚀" });
});

app.use("/api/location", locationRoutes);
app.use("/api/item", itemRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/subscription", subscriptionRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/user", userRoutes);



////admin routes
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/activity", activityLog);

app.use(errorHandler); //handles error globally

export default app;

