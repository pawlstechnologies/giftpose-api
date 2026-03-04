import Joi from "joi";

export const createCategoryValidator = Joi.object({
  name: Joi.string().required(),
  status: Joi.string().valid("Active", "Inactive"),
  // subcategories: Joi.array().items(Joi.string()),
});

export const createSubCategoryValidator = Joi.object({
  name: Joi.string().required(),
  categoryId: Joi.string().required(),
  status: Joi.string().valid("Active", "Inactive").optional()
});

export const createContentValidator = Joi.object({
  name: Joi.string().required(),
  subcategoryId: Joi.string().required(),
  status: Joi.string().valid("Active", "Inactive").optional()
});


export const updateCategoryValidator = Joi.object({
  name: Joi.string(),
  status: Joi.string().valid("Active", "Inactive"),
});

export const paginationValidator = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(500).default(100),
  search: Joi.string().optional(),
});