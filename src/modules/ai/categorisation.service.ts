import { CategoryModel } from "../category/category.model";
import { SubCategoryModel } from "../category/category.model";
import { ContentModel } from "../category/category.model";
import ItemModel from "../items/item.model";
import DeepSeekClient from "../../utils/deepseek.client";
import { Types } from "mongoose";

class AICategorisationService {


    async getTaxonomy() {

        // const categories = await CategoryModel.find().lean();
        // const subcategories = await SubCategoryModel.find().lean();
        // const contents = await ContentModel.find().lean();

        const categories = await CategoryModel.find({}, { name: 1 }).lean();
        const subcategories = await SubCategoryModel.find({}, { name: 1, categoryId: 1 }).lean();
        const contents = await ContentModel.find({}, { name: 1, subcategoryId: 1 }).lean();

        return {
            categories,
            subcategories,
            contents
        };
    }


    async categoriseItems(items: any[]) {

        const taxonomy = await this.getTaxonomy();

        for (const item of items) {

            try {


                const imageUrl =
                    item.thumbnail ||
                    (item.imageUrls?.length ? item.imageUrls[0] : undefined);


                const ai = await DeepSeekClient.categoriseItem(
                    {
                        title: item.name,
                        description: item.description,
                        // imageUrl
                    },
                    taxonomy
                );

                const category = await this.resolveCategory(ai);
                const subcategory = await this.resolveSubCategory(ai, category._id);
                const content = await this.resolveContent(ai, subcategory._id);

                await ItemModel.updateOne(
                    { _id: item._id },
                    {
                        $set: {
                            categoryId: category._id,
                            subCategoryId: subcategory._id,
                            contentId: content._id,
                            isCategorised: true
                        }
                    }
                );

            } catch (err) {
                console.error("AI categorisation failed:", err);
            }
        }
    }

    async resolveCategory(ai: any) {

        let category = await CategoryModel.findOne({
            name: ai.category
        });

        if (!category && ai.suggestedCategory) {

            category = await CategoryModel.create({
                name: ai.suggestedCategory,
                status: "Inactive"
            });
        }

        // fallback safety
        if (!category) {

            category = await CategoryModel.create({
                name: "Uncategorised",
                status: "Inactive"
            });
        }

        return category;
    }

    async resolveSubCategory(ai: any, categoryId: Types.ObjectId) {

        let subcategory = await SubCategoryModel.findOne({
            name: ai.subcategory,
            categoryId
        });

        if (!subcategory && ai.suggestedSubcategory) {

            subcategory = await SubCategoryModel.create({
                name: ai.suggestedSubcategory,
                categoryId,
                status: "Inactive"
            });
        }

        if (!subcategory) {

            subcategory = await SubCategoryModel.create({
                name: "General",
                categoryId,
                status: "Inactive"
            });
        }

        return subcategory;
    }


    async resolveContent(ai: any, subcategoryId: Types.ObjectId) {

        let content = await ContentModel.findOne({
            name: ai.content,
            subcategoryId
        });

        if (!content && ai.suggestedContent) {

            content = await ContentModel.create({
                name: ai.suggestedContent,
                subcategoryId,
                status: "Inactive"
            });
        }

        if (!content) {

            content = await ContentModel.create({
                name: "General Item",
                subcategoryId,
                status: "Inactive"
            });
        }

        return content;
    }


}

export default new AICategorisationService();


