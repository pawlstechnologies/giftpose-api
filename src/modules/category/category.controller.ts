import { Request, Response } from "express";
import categoryService from "./category.service";
import { createCategorySchema, updateCategorySchema, paginationSchema } from "./category.validation";

export const createCategory = async (req: Request, res: Response) => {
  const { error } = createCategorySchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const data = await categoryService.createCategory(req.body);
  res.status(201).json({ success: true, data });
};

export const listCategories = async (req: Request, res: Response) => {
  const { value } = paginationSchema.validate(req.query);
  const result = await categoryService.listCategories(value.page, value.limit, value.search);
  res.json({ success: true, ...result });
};

export const listSubCategories = async (req: Request, res: Response) => {
  const { value } = paginationSchema.validate(req.query);
  const result = await categoryService.listSubCategories(value.page, value.limit);
  res.json({ success: true, ...result });
};

export const updateCategory = async (req: Request, res: Response) => {
  const { error } = updateCategorySchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  const data = await categoryService.updateCategory(req.params.id, req.body);
  res.json({ success: true, data });
};

export const updateSubCategory = async (req: Request, res: Response) => {
  const data = await categoryService.updateSubCategory(req.params.id, req.body);
  res.json({ success: true, data });
};

export const deleteCategory = async (req: Request, res: Response) => {
  await categoryService.deleteCategory(req.params.id);
  res.json({ success: true, message: "Category deleted" });
};

export const deleteSubCategory = async (req: Request, res: Response) => {
  await categoryService.deleteSubCategory(req.params.id);
  res.json({ success: true, message: "SubCategory deleted" });
};



