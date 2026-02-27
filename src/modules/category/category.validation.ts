import Joi from "joi";

export const createCategorySchema = Joi.object({
  name: Joi.string().required(),
  status: Joi.string().valid("Active", "Inactive"),
  subcategories: Joi.array().items(Joi.string()),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string(),
  status: Joi.string().valid("Active", "Inactive"),
});

export const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(500).default(100),
  search: Joi.string().optional(),
});