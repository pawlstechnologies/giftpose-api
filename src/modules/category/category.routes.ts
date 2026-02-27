import { Router } from 'express';
import {
    createCategory,
    listCategories,
    listSubCategories,
    // updateCategory,
    // updateSubCategory,
    // deleteCategory,
    // deleteSubCategory
} from './category.controller';

const router = Router();


router.post("/", createCategory);
router.get("/", listCategories);
router.get("/subcategories", listSubCategories);

// router.put("/:id", updateCategory);
// router.put("/subcategory/:id", updateSubCategory);

// router.delete("/:id", deleteCategory);
// router.delete("/subcategory/:id", deleteSubCategory);

export default router;


