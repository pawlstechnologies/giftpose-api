
import { CategoryModel, SubCategoryModel, ContentModel } from "./category.model";
import ApiError from "../../utils/ApiError"; // your standard ApiError class

import mongoose from "mongoose";

class CategoryService {
  async createCategory(data: any) {
    const existing = await CategoryModel.findOne({ name: data.name });
    if (existing) throw new ApiError(400, "Category already exists");

    const category = await CategoryModel.create(data);
    // if (data.subcategories?.length) {
    //   const subDocs = data.subcategories.map((name: string) => ({
    //     name,
    //     category: category._id,
    //   }));
    //   await SubCategoryModel.insertMany(subDocs);
    // }

    return category;
  }

  async listCategories(page: number, limit: number, search?: string) {
    const query: any = {};
    if (search) query.name = { $regex: search, $options: "i" };

    const total = await CategoryModel.countDocuments(query);

    const data = await CategoryModel.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  //subcategories
  async createSubCategory(data: any) {
    const existing = await SubCategoryModel.findOne({ name: data.name });
    if (existing) throw new ApiError(400, "Subcategory already exists"); //ensure no duplicate
    const subcategory = await SubCategoryModel.create(data);
    return subcategory;
  }

  async listSubCategories(categoryId: string) {
    return await SubCategoryModel.find({
      categoryId,
      status: { $ne: "Deleted" }
    });
  }
  //content

  async createContent(data: any) {
    const existing = await ContentModel.findOne({ name: data.name });
    if (existing) throw new ApiError(400, "Content already exists"); //ensure no duplicate
    return await ContentModel.create(data);
  }

  async listContents(subcategoryId: string) {
    return await ContentModel.find({
      subcategoryId,
      status: { $ne: "Deleted" }
    });
  }

  ///giant tree
  async listCategoryTree(categoryId: string) {
    const result = await CategoryModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(categoryId),
          status: { $ne: "Deleted" }
        }
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "_id",
          foreignField: "categoryId",
          as: "subcategories"
        }
      },
      { $unwind: { path: "$subcategories", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "contents",
          localField: "subcategories._id",
          foreignField: "subcategoryId",
          as: "subcategories.contents"
        }
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          status: { $first: "$status" },
          subcategories: { $push: "$subcategories" }
        }
      }
    ]);

    return result[0];
  }

  async searchCategories(keywords: string[]) {
    if (!keywords || keywords.length === 0) {
      throw new ApiError(400, "Keywords are required");
    }

    const regexArray = keywords.map(
      (kw) => new RegExp(kw, "i")
    );

    const categories = await CategoryModel.find({
      status: { $ne: "Deleted" },
      $or: [
        { name: { $in: regexArray } },
        { slug: { $in: regexArray } } // remove if you don't use slug
      ]
    })
      .sort({ name: 1 })
      .select("name slug status"); // clean response

    return categories;
  }





  // async updateCategory(id: string, data: any) {
  //   const category = await CategoryModel.findByIdAndUpdate(id, data, { new: true });
  //   if (!category) throw new ApiError(404, "Category not found");
  //   return category;
  // }

  // async updateSubCategory(id: string, data: any) {
  //   const sub = await SubCategoryModel.findByIdAndUpdate(id, data, { new: true });
  //   if (!sub) throw new ApiError(404, "SubCategory not found");
  //   return sub;
  // }

  // async deleteCategory(id: string) {
  //   const category = await CategoryModel.findById(id);
  //   if (!category) throw new ApiError(404, "Category not found");
  //   await SubCategoryModel.deleteMany({ category: id });
  //   await category.deleteOne();
  //   return true;
  // }

  // async deleteSubCategory(id: string) {
  //   const sub = await SubCategoryModel.findById(id);
  //   if (!sub) throw new ApiError(404, "SubCategory not found");
  //   await sub.deleteOne();
  //   return true;
  // }
}

export default new CategoryService();


