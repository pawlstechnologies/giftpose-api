import { Router } from 'express';

import { createItem, getItemsNearMe, listTrashNotingItems, getItemById } from './item.controller';

const router = Router();

router.post('/', createItem);
router.get('/nearby/:deviceId', getItemsNearMe);
router.get('/trash', listTrashNotingItems);
router.get("/:deviceId/:itemId", getItemById);

export default router;
