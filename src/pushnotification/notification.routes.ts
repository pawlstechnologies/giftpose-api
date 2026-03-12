import { Router } from "express";
import { getNotifications } from "./notification.controller";

const router = Router();


router.get('/:deviceId', getNotifications);
export default router;

