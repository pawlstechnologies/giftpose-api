import { Router } from "express";

import { fetchPostcodeLocation, getDistance, listAllLocation } from "./location.controller";

const router = Router();

router.post('/register', fetchPostcodeLocation);
router.post('/distance', getDistance);
router.get("/all", listAllLocation);


export default router;