
import { CategoryModel, SubCategoryModel } from "./category.model";
import ApiError from "../../utils/ApiError"; // your standard ApiError class

class CategoryService {
  async createCategory(data: any) {
    const existing = await CategoryModel.findOne({ name: data.name });
    if (existing) throw new ApiError(400, "Category already exists");

    const category = await CategoryModel.create(data);

    if (data.subcategories?.length) {
      const subDocs = data.subcategories.map((name: string) => ({
        name,
        category: category._id,
      }));
      await SubCategoryModel.insertMany(subDocs);
    }

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

  async listSubCategories(page: number, limit: number) {
    const total = await SubCategoryModel.countDocuments();

    const data = await SubCategoryModel.find()
      .populate("category", "name slug")
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateCategory(id: string, data: any) {
    const category = await CategoryModel.findByIdAndUpdate(id, data, { new: true });
    if (!category) throw new ApiError(404, "Category not found");
    return category;
  }

  async updateSubCategory(id: string, data: any) {
    const sub = await SubCategoryModel.findByIdAndUpdate(id, data, { new: true });
    if (!sub) throw new ApiError(404, "SubCategory not found");
    return sub;
  }

  async deleteCategory(id: string) {
    const category = await CategoryModel.findById(id);
    if (!category) throw new ApiError(404, "Category not found");
    await SubCategoryModel.deleteMany({ category: id });
    await category.deleteOne();
    return true;
  }

  async deleteSubCategory(id: string) {
    const sub = await SubCategoryModel.findById(id);
    if (!sub) throw new ApiError(404, "SubCategory not found");
    await sub.deleteOne();
    return true;
  }
}

export default new CategoryService();


