import { Request, Response } from "express";
import categoryService from "./category.service";
import { createCategoryValidator, createSubCategoryValidator, updateCategoryValidator, createContentValidator, paginationValidator } from "./category.validation";

export const createCategory = async (req: Request, res: Response) => {
  const { error } = createCategoryValidator.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const data = await categoryService.createCategory(req.body);
  res.status(201).json({ success: true, data });
};

export const listCategories = async (req: Request, res: Response) => {
  const { value } = paginationValidator.validate(req.query);
  const result = await categoryService.listCategories(value.page, value.limit, value.search);
  return res.json({
    success: true,
    message: "Categories retrieved successfully",
    data: result
  });
  // res.json({ success: true, ...result });
};

export const createSubCategory = async (req: Request, res: Response) => {
  const { error } = createSubCategoryValidator.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const data = await categoryService.createSubCategory(req.body);
  res.status(201).json({ success: true, data });
};

export const listSubCategories = async (req: Request, res: Response) => {

  const { categoryId } = req.query as { categoryId: string }; //query parameter
  const result = await categoryService.listSubCategories(categoryId)
  return res.json({
    success: true,
    message: "Subcategories retrieved successfully",
    data: result
  });

};


export const createContent = async (req: Request, res: Response) => {

  const { error } = createContentValidator.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const data = await categoryService.createContent(req.body);
  res.status(201).json({ success: true, data });

};

export const listContents = async (req: Request, res: Response) => {

  const { subcategoryId } = req.query as { subcategoryId: string }; //query parameter
  const result = await categoryService.listContents(subcategoryId)
  return res.json({
    success: true,
    message: "Content retrieved successfully",
    data: result
  });

};

export const listCategoriesTree = async (req: Request, res: Response) => {

  const { categoryId } = req.query as { categoryId: string }; //query parameter
  const result = await categoryService.listCategoryTree(categoryId);
  if (!result) {
    return res.status(404).json({ message: "Category not found" });
  }

  return res.json({
    success: true,
    message: "Content retrieved successfully",
    data: result
  });

};

export const searchCategories = async (req: Request, res: Response) =>{
  try {
    const { keywords } = req.body;

    const result = await categoryService.searchCategories(keywords);

    return res.json({
      success: true,
      total: result.length,
      data: result
    });

  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};




// interface CategoryParams {
//   id: string;
// }

// export const updateCategory = async (req: Request<CategoryParams>, res: Response) => {
//   const { error } = updateCategoryValidator.validate(req.body);
//   if (error) return res.status(400).json({ message: error.message });

//   const data = await categoryService.updateCategory(req.params.id, req.body);
//   res.json({ success: true, data });
// };

// export const updateSubCategory = async (req: Request<CategoryParams>, res: Response) => {
//   const data = await categoryService.updateSubCategory(req.params.id, req.body);
//   res.json({ success: true, data });
// };

// export const deleteCategory = async (req: Request<CategoryParams>, res: Response) => {
//   await categoryService.deleteCategory(req.params.id);
//   res.json({ success: true, message: "Category deleted" });
// };

// export const deleteSubCategory = async (req: Request<CategoryParams>, res: Response) => {
//   await categoryService.deleteSubCategory(req.params.id);
//   res.json({ success: true, message: "SubCategory deleted" });
// };



