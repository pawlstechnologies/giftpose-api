import { Router } from "express";

import { deleteLocationByDeviceId, fetchPostcodeLocation, getDistance, listAllLocation, getLocationByDeviceId } from "./location.controller";

const router = Router();

router.post('/register', fetchPostcodeLocation);
router.post('/distance', getDistance);
router.get('/device/:deviceId', getLocationByDeviceId);
router.get("/all", listAllLocation);
router.delete("/delete", deleteLocationByDeviceId);


export default router;