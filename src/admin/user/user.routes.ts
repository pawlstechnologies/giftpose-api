import { Router } from "express";
import { AdminUserController } from "./user.controller";
import {
  adminAuthMiddleware,
  ipWhitelistMiddleware,
} from "../auth/admin.middleware";

const router = Router();

router.use(ipWhitelistMiddleware);
router.use(adminAuthMiddleware());

router.get("/", AdminUserController.listUsers);
router.get("/:userId", AdminUserController.getUserDetail);

export default router;
