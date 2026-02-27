import Joi from "joi";

export const createAlertSchema = Joi.object({
  deviceId: Joi.string().required(),
  categories: Joi.array().items(Joi.string()).required(),
  keywords: Joi.array().items(Joi.string()).required(),
  status: Joi.string().valid("Active", "Inactive"),
});

export const updateAlertSchema = Joi.object({
  categories: Joi.array().items(Joi.string()),
  keywords: Joi.array().items(Joi.string()),
  status: Joi.string().valid("Active", "Inactive"),
});

export const paginationSchema = Joi.object({
  deviceId: Joi.string().required(), // add this line
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
});

export const notificationKeywordSchema = Joi.object({
  keywords: Joi.array().items(Joi.string().required()).min(1).required()
});

