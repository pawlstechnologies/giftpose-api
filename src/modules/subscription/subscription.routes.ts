import express from "express";
import { create, cancel, list, getCurrent, updateStatus, changePlan } from "./subscription.controller";
import { protect } from "../../middleware/auth.middleware";

const router = express.Router();

router.post("/create", protect, create);
router.post("/change-plan", protect, changePlan);
router.post("/cancel", protect, cancel);
router.get("/list", protect, list);
router.get("/current", protect, getCurrent);
router.patch("/status", protect, updateStatus);

export default router;
