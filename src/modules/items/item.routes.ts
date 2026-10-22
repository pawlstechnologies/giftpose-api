import { Router } from 'express';

import { 
    createItem, 
    getItemsNearMe, 
    listTrashNotingItems, 
    getItemById, 
    listAllItems, 
    searchItemsNearMe, 
    postItem, 
    analyseImage, 
    markItemAsTaken, 
    hideItem, 
    getReportOptions, 
    reportItem, 
    pickupOptions, 
    postItemRequest, 
    updateItem, 
    markItemAsInterested,
    getMyDonations,
    deleteItem
} from './item.controller';

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

///authenticated & item creation routes
router.post('/analyse-image', upload.any(), analyseImage); // global route for image analysis
router.post('/post', protect, upload.any(), postItem);
router.post('/post-request', protect, upload.any(), postItemRequest);
router.get('/pickup-options', pickupOptions);
router.patch('/update/:itemId', protect, updateItem);
router.delete('/:itemId', protect, deleteItem);


//request a gift
router.post('/request-gift/:itemId', protect, markItemAsInterested);

//user GiftPose items
router.get('/donations', protect, getMyDonations); //get items posted by the authenticated user


export default router;

