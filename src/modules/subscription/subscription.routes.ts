import express from "express";
import { create, cancel, list, getCurrent, updateStatus } from "./subscription.controller";
import { protect } from "../../middleware/auth.middleware";

const router = express.Router();

router.post("/create", protect, create);
router.post("/cancel", protect, cancel);
router.get("/list", protect, list);
router.get("/current", protect, getCurrent);
router.patch("/status", protect, updateStatus);

export default router;
