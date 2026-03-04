import { Router } from 'express';
import {
    createCategory,
    listCategories,
    listSubCategories,
    createSubCategory,
    createContent,
    listContents,
    listCategoriesTree
    // updateCategory,
    // updateSubCategory,
    // deleteCategory,
    // deleteSubCategory
} from './category.controller';

const router = Router();


router.post("/", createCategory);
router.get("/", listCategories);
router.post("/subcategories", createSubCategory);
router.get("/subcategories", listSubCategories);

router.post("/contents", createContent);
router.get("/contents", listContents);
router.get("/tree", listCategoriesTree);

// router.put("/:id", updateCategory);
// router.put("/subcategory/:id", updateSubCategory);

// router.delete("/:id", deleteCategory);
// router.delete("/subcategory/:id", deleteSubCategory);

export default router;


