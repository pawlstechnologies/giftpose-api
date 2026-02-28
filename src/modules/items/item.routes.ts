import { Router } from 'express';

import { createItem, getItemsNearMe, listTrashNotingItems, getItemById, listAllItems } from './item.controller';

const router = Router();

router.post('/', createItem);
router.get('/nearby/:deviceId', getItemsNearMe);
router.get('/trash', listTrashNotingItems);
router.get("/:deviceId/:itemId", getItemById);
router.get("/list", listAllItems); //mirror the items table

export default router;
