import { Router } from "express";

import { deleteLocationByDeviceId, fetchPostcodeLocation, getDistance, listAllLocation, getLocationByDeviceId, updateFcmToken } from "./location.controller";

const router = Router();

router.post('/register', fetchPostcodeLocation);
router.put('/fcm-token', updateFcmToken);
router.post('/distance', getDistance);
router.get('/device/:deviceId', getLocationByDeviceId);
router.get("/all", listAllLocation);
router.delete("/delete", deleteLocationByDeviceId);


export default router;