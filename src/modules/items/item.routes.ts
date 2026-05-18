import { Router } from 'express';

import { createItem, getItemsNearMe, listTrashNotingItems, getItemById, listAllItems, searchItemsNearMe, postItem, analyseImage, markItemAsTaken, hideItem, getReportOptions, reportItem, pickupOptions, postItemRequest, updateItem } from './item.controller';

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

///authenticated routes
router.post('/analyse-image', protect, upload.array('images', 5), analyseImage); //global route for image analysis, can be used in item creation or editing, or even as a standalone feature for users to analyze images before posting.
router.post('/post', protect, postItem);
router.post('/post-request', protect, postItemRequest);
router.get('/pickup-options', protect, pickupOptions);
router.patch('/update/:itemId', protect, updateItem);


export default router;

