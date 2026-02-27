import { Router } from "express";

import { fetchPostcodeLocation, getDistance } from "./location.controller";

const router = Router();

router.post('/register', fetchPostcodeLocation);
router.post('/distance', getDistance);


export default router;