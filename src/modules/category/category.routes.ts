import { Router } from 'express';
import {
    createCategory,
    listCategories,
    listSubCategories,
    createSubCategory,
    createContent,
    listContents,
    listCategoriesTree,
    searchCategories
    // updateCategory,
    // updateSubCategory,
    // deleteCategory,
    // deleteSubCategory
} from './category.controller';

import { upload } from '../../middleware/upload.middleware';
import { bulkUploadCSVController } from './bulkUpload.controller';

const router = Router();


router.post("/", createCategory);
router.get("/", listCategories);
router.post("/subcategories", createSubCategory);
router.get("/subcategories", listSubCategories);

router.post("/contents", createContent);
router.get("/contents", listContents);
router.get("/tree", listCategoriesTree);
router.post("/search", searchCategories);

router.post(
  "/bulk-upload",
  upload.single("file"),
  bulkUploadCSVController
);


// router.put("/:id", updateCategory);
// router.put("/subcategory/:id", updateSubCategory);

// router.delete("/:id", deleteCategory);
// router.delete("/subcategory/:id", deleteSubCategory);

export default router;


