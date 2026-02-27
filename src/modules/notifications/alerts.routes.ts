import { Router } from "express";
import { createAlert, listAlerts, updateAlert, deleteAlert, getCategoriesByKeywords } from "./alerts.controller";


const router = Router();

router.post("/", createAlert);
router.get("/", listAlerts);
router.put("/:id", updateAlert);
router.delete("/:id", deleteAlert);
router.post("/search-keywords", getCategoriesByKeywords);

export default router;

