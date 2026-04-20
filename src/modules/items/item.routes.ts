import { Router } from 'express';

import { createItem, getItemsNearMe, listTrashNotingItems, getItemById, listAllItems, searchItemsNearMe, postItem, analyseImage, markItemAsTaken, hideItem, getReportOptions, reportItem } from './item.controller';

import { protect } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload';

const router = Router();

router.post('/', createItem);
router.get('/nearby/:deviceId', getItemsNearMe);
router.get('/trash', listTrashNotingItems);
router.get("/:deviceId/:itemId", getItemById);
router.get("/list", listAllItems); //mirror the items table
router.post("/:deviceId/search", searchItemsNearMe);
router.patch('/mark-taken/:itemId', markItemAsTaken);
router.patch('/hide/:itemId', hideItem);
router.get('/report-options', getReportOptions);
router.post('/report/:itemId', reportItem);

///authentication routes
router.post('/analyse-image', protect, upload.array('images', 5), analyseImage);
router.post('/post', protect, postItem);


export default router;

