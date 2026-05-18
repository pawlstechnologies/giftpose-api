// routes/subscription.routes.ts

import express from "express";

// import {
//   subscriptionController,
// } from "../subscription/subscription.controller";

import { create, cancel } from './subscription.controller';

const router = express.Router();

router.post("/create", create);
router.post("/cancel", cancel);

export default router;