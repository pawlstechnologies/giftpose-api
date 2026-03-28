import { Router } from "express";
import { createAlert, listAlerts, updateAlert, deleteAlert, getCategoriesByKeywords, listAllAlert } from "./alerts.controller";


const router = Router();

router.post("/", createAlert);
router.get("/", listAlerts);
router.put("/:id", updateAlert);
router.delete("/:id", deleteAlert);
router.post("/search-keywords", getCategoriesByKeywords);
router.get("/all", listAllAlert);

export default router;

