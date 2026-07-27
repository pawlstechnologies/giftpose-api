// routes/subscription.routes.ts

import express from "express";

// import {
//   subscriptionController,
// } from "../subscription/subscription.controller";

import { create, cancel, list, getCurrent } from './subscription.controller';

const router = express.Router();

router.post("/create", create);
router.post("/cancel", cancel);
router.get("/list", list);
router.get("/current", getCurrent);

export default router;