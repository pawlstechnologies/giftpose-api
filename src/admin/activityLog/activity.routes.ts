import express, { Router } from "express";

import { activityList, globalActivityList } from "./activity.controller";
import  { ipWhitelistMiddleware,
    adminAuthMiddleware } from "../auth/admin.middleware"

// const router = express.Router();

// router.use(ipWhitelistMiddleware);
// router.use(adminAuthMiddleware);

const router = Router();
router.use(ipWhitelistMiddleware);

router.get("/global", adminAuthMiddleware(), globalActivityList);
router.get("/", adminAuthMiddleware(), activityList);

export default router;


