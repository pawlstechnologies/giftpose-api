import { DeviceAlertModel } from "./alerts.model";
import ApiError from "../../utils/ApiError";
// import categoryModel  //= require("modules/category/category.model");
import { SubCategoryModel, CategoryModel, ContentModel } from "../category/category.model" //= require("modules/category/category.model");
// import { ItemModel } from "../item/item.model";

class AlertService {
  async createAlert(deviceId: string, data: any) {
    // const alert = await DeviceAlertModel.create({ deviceId, ...data });
    const alert = await DeviceAlertModel.findOneAndUpdate(
      { deviceId },
      { $set: data },
      {
        upsert: true,
        returnDocument: 'after',
        runValidators: true
      }
    );
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

  async searchByKeywords(keywords: string[]) {
    if (!keywords || keywords.length === 0) {
      throw new ApiError(400, "Keywords are required");
    }

    const regexArray = keywords.map(kw => new RegExp(kw, "i"));

    // $in accepts an array of regexes — matches if ANY regex hits
    const keywordMatch = {
      $or: [
        { name: { $in: regexArray } },
        { slug: { $in: regexArray } },
      ],
    };
    const notDeleted = { status: { $ne: "Deleted" } };

    const [categories, subcategories, contents] = await Promise.all([
      // ---- Categories ----
      CategoryModel.aggregate([
        { $match: { $and: [notDeleted, keywordMatch] } },
        { $sort: { name: 1 } },
      ]),

      // ---- Subcategories (with parent category name) ----
      SubCategoryModel.aggregate([
        { $match: { $and: [notDeleted, keywordMatch] } },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: 1, slug: 1, status: 1, categoryId: 1,
            created_at: 1, updated_at: 1,
            categoryName: "$category.name",
          },
        },
        { $sort: { name: 1 } },
      ]),

      // ---- Contents (with parent subcategory + grandparent category) ----
      ContentModel.aggregate([
        { $match: { $and: [notDeleted, keywordMatch] } },
        {
          $lookup: {
            from: "subcategories",
            localField: "subcategoryId",
            foreignField: "_id",
            as: "subcategory",
          },
        },
        { $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "categories",
            localField: "subcategory.categoryId",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: 1, slug: 1, status: 1, subcategoryId: 1,
            createdAt: 1, updatedAt: 1,
            subcategoryName: "$subcategory.name",
            categoryName: "$category.name",
          },
        },
        { $sort: { name: 1 } },
      ]),
    ]);

    return {
      totalCount: subcategories.length + contents.length, // +  categories.length ,
      // categories: { 
      //   count: categories.length, 
      //   items: categories 
      // },
      subcategories: subcategories,  
      // { 
      //   // count: subcategories.length, 
      //   items: 
      // },
      contents: contents,
      //  { 
      //   // count: contents.length, 
      //   items: contents 
      // },
      
    };
  }

  async getCategoriesByKeywords(keywords: string[]) {
    if (!keywords || keywords.length === 0) {
      throw new ApiError(400, "Keywords are required");
    }

    const regexArray = keywords.map(kw => new RegExp(kw, "i"));

    const result = await CategoryModel.aggregate([
      /* Join Subcategories */
      {
        $lookup: {
          from: "subcategories",
          localField: "_id",
          foreignField: "categoryId",
          as: "subcategories"
        }
      },

      { $unwind: { path: "$subcategories", preserveNullAndEmptyArrays: true } },

      /* Join Contents */
      {
        $lookup: {
          from: "contents",
          localField: "subcategories._id",
          foreignField: "subcategoryId",
          as: "subcategories.contents"
        }
      },

      /* Filter deleted */
      {
        $match: {
          status: { $ne: "Deleted" }
        }
      },

      /* Match keywords at ANY level */
      {
        $match: {
          $or: [
            { name: { $in: regexArray } }, // category
            { slug: { $in: regexArray } },

            { "subcategories.name": { $in: regexArray } },
            { "subcategories.slug": { $in: regexArray } },

            { "subcategories.contents.name": { $in: regexArray } }
          ]
        }
      },

      /* Group back per category */
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          slug: { $first: "$slug" },
          status: { $first: "$status" },
          subcategories: { $push: "$subcategories" }
        }
      },

      { $sort: { name: 1 } }
    ]);

    return result;

    // const categories = await CategoryModel.find({
    //   $or: [
    //     { name: { $in: regexArray } },
    //     { slug: { $in: regexArray } }
    //   ]
    // }).sort({ name: 1 });

    // // Match SubCategories
    // const subcategories = await SubCategoryModel.find({
    //   $or: [
    //     { name: { $in: regexArray } },
    //     { slug: { $in: regexArray } }
    //   ]
    // })
    //   .populate("category", "name slug") // include parent category
    //   .sort({ name: 1 });

    // return {
    //   categories,
    //   subcategories
    // };
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

  async fetchAllAlert() {

    const items = await DeviceAlertModel
      .find()
      .sort({ createdAt: -1 }) // optional sorting
      .lean();

    return items;
  }


}

export default new AlertService();