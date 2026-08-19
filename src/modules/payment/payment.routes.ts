import { Router } from "express";
import { createPaymentIntent, listPayments } from "./payment.controller";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

router.post("/create-payment-intent", createPaymentIntent);
router.get("/list", protect, listPayments);

export default router;
