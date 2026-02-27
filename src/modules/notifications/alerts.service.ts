import { DeviceAlertModel } from "./alerts.model";
import ApiError from "../../utils/ApiError";
// import categoryModel  //= require("modules/category/category.model");
import {SubCategoryModel, CategoryModel} from "../category/category.model" //= require("modules/category/category.model");
// import { ItemModel } from "../item/item.model";

class AlertService {
  async createAlert(deviceId: string, data: any) {
    const alert = await DeviceAlertModel.create({ deviceId, ...data });
    return alert;
  }

  async listAlerts(deviceId: string, page: number, limit: number) {
    const total = await DeviceAlertModel.countDocuments({ deviceId });
    const data = await DeviceAlertModel.find({ deviceId })
      .populate("categories", "name slug")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 });

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateAlert(id: string, deviceId: string, data: any) {
    const alert = await DeviceAlertModel.findOneAndUpdate({ _id: id, deviceId }, data, { new: true });
    if (!alert) throw new ApiError(404, "Alert not found");
    return alert;
  }

  async deleteAlert(id: string, deviceId: string) {
    const alert = await DeviceAlertModel.findOneAndDelete({ _id: id, deviceId });
    if (!alert) throw new ApiError(404, "Alert not found");
    return true;
  }

  async getCategoriesByKeywords(keywords: string[]) {
    if (!keywords || keywords.length === 0) {
      throw new ApiError(400, "Keywords are required");
    }

    const regexArray = keywords.map(kw => new RegExp(kw, "i"));

    const categories = await CategoryModel.find({
      $or: [
        { name: { $in: regexArray } },
        { slug: { $in: regexArray } }
      ]
    }).sort({ name: 1 });

    // Match SubCategories
    const subcategories = await SubCategoryModel.find({
      $or: [
        { name: { $in: regexArray } },
        { slug: { $in: regexArray } }
      ]
    })
      .populate("category", "name slug") // include parent category
      .sort({ name: 1 });

    return {
      categories,
      subcategories
    };
  }
  


  async checkItemForAlerts(item: any) {
    const itemKeywords = [
      ...(item.name?.toLowerCase().split(/\s+/) || []),
      ...(item.description?.toLowerCase().split(/\s+/) || []),
      ...(item.tags || []),
    ];

    const alerts = await DeviceAlertModel.find({
      status: "active",
      $or: [
        { categories: item.category },
        { keywords: { $in: itemKeywords } },
      ],
    }).populate("deviceId"); // optional: populate Location info

    for (const alert of alerts) {
      console.log(`Notify device ${alert.deviceId}: New item "${item.name}" matches your alert`);
      // TODO: integrate email / push / in-app notification
    }
  }
}

export default new AlertService();