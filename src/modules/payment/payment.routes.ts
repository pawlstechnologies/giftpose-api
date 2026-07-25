import { Router } from "express";

import { createPaymentIntent, listPayments } from "./payment.controller";

const router = Router();

router.post('/create-payment-intent', createPaymentIntent);
router.get('/list', listPayments);

export default router;
