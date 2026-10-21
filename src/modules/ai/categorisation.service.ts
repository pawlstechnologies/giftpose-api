import { CategoryModel } from "../category/category.model";
import { SubCategoryModel } from "../category/category.model";
import { ContentModel } from "../category/category.model";
import ItemModel from "../items/item.model";
import OpenAIClient from "../../utils/openai.client";
import { Types } from "mongoose";

type TaxonomyNode = {
    _id: Types.ObjectId;
    name: string;
};

class AICategorisationService {

    async getTaxonomy() {
        const [categories, subcategories] = await Promise.all([
            CategoryModel.find({ status: { $ne: "Deleted" } }, { name: 1 }).lean(),
            SubCategoryModel.find({ status: { $ne: "Deleted" } }, { name: 1, categoryId: 1 }).lean(),
        ]);

        return categories.map((category) => ({
            name: category.name,
            subcategories: subcategories
                .filter((sub) => String(sub.categoryId) === String(category._id))
                .map((sub) => sub.name),
        }));
    }

    async getFallbackTaxonomy() {
        const category = await this.findOrCreateCategory("Uncategorised", "Inactive");
        const subcategory = await this.findOrCreateSubCategory("General", category._id, "Inactive");
        const content = await this.findOrCreateContent("General Item", subcategory._id, "Inactive");

        return { category, subcategory, content };
    }

    async categoriseItems(items: any[]) {
        const taxonomy = await this.getTaxonomy();
        const fallback = await this.getFallbackTaxonomy();
        const categorised: any[] = [];
        const delayMs = Number(process.env.AI_CATEGORISE_DELAY_MS || 1500);

        for (let index = 0; index < items.length; index++) {
            const item = items[index];

            try {
                const ai = await OpenAIClient.categoriseItem(
                    {
                        title: item.name,
                        description: item.description,
                    },
                    taxonomy
                );

                const category = await this.resolveCategory(ai, fallback.category);
                const subcategory = await this.resolveSubCategory(ai, category.doc._id, fallback);
                const content = await this.resolveContent(ai, subcategory.doc._id, fallback);

                const matched = category.matched;

                const updates: Record<string, unknown> = {
                    categoryId: category.doc._id,
                    subCategoryId: subcategory.doc._id,
                    contentId: content.doc._id,
                    isCategorised: matched,
                };

                if (matched) {
                    updates.status = "Live";
                }

                await ItemModel.updateOne({ _id: item._id }, { $set: updates });

                if (matched) {
                    categorised.push({
                        ...item,
                        categoryId: category.doc._id,
                        subCategoryId: subcategory.doc._id,
                        contentId: content.doc._id,
                        isCategorised: true,
                        status: "Live",
                    });
                }
            } catch (err: any) {
                console.error("AI categorisation failed, using local fallback:", err?.message || err);
                const text = `${item.name || ""} ${item.description || ""}`.toLowerCase();
                let matchedCat = fallback.category;
                let matchedSub = fallback.subcategory;

                for (const catNode of taxonomy) {
                    const catWords = catNode.name.toLowerCase().split(/\W+/).filter((w: string) => w.length >= 3);
                    const subMatch = (catNode.subcategories || []).find((subName: string) =>
                        subName
                            .toLowerCase()
                            .split(/\W+/)
                            .filter((w: string) => w.length >= 3)
                            .some((w: string) => text.includes(w))
                    );
                    if (subMatch || catWords.some((w: string) => text.includes(w))) {
                        const foundCat = await this.findByName<TaxonomyNode>(CategoryModel, catNode.name);
                        if (foundCat) {
                            matchedCat = foundCat;
                            if (subMatch) {
                                const foundSub = await this.findByName<TaxonomyNode>(
                                    SubCategoryModel,
                                    subMatch,
                                    { categoryId: foundCat._id }
                                );
                                if (foundSub) matchedSub = foundSub;
                            }
                            break;
                        }
                    }
                }

                const updates: Record<string, unknown> = {
                    categoryId: matchedCat._id,
                    subCategoryId: matchedSub._id,
                    contentId: fallback.content._id,
                    isCategorised: true,
                    status: "Live",
                };

                await ItemModel.updateOne({ _id: item._id }, { $set: updates });

                categorised.push({
                    ...item,
                    ...updates,
                });
            }

            if (index < items.length - 1 && delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        return categorised;
    }

    private escapeRegex(text: string) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    private async findByName<T>(
        model: { findOne: Function },
        name?: string,
        extra: Record<string, unknown> = {}
    ): Promise<T | null> {
        if (!name?.trim()) return null;

        return model.findOne({
            ...extra,
            name: { $regex: new RegExp(`^${this.escapeRegex(name.trim())}$`, "i") },
        });
    }

    private async findOrCreateCategory(name: string, status: "Active" | "Inactive") {
        const existing = await this.findByName<TaxonomyNode>(CategoryModel, name);
        if (existing) return existing;

        return CategoryModel.create({ name: name.trim(), status });
    }

    private async findOrCreateSubCategory(
        name: string,
        categoryId: Types.ObjectId,
        status: "Active" | "Inactive"
    ) {
        const existing = await this.findByName<TaxonomyNode>(SubCategoryModel, name, { categoryId });
        if (existing) return existing;

        return SubCategoryModel.create({
            name: name.trim(),
            categoryId,
            status,
        });
    }

    private async findOrCreateContent(
        name: string,
        subcategoryId: Types.ObjectId,
        status: "Active" | "Inactive"
    ) {
        const existing = await this.findByName<TaxonomyNode>(ContentModel, name, { subcategoryId });
        if (existing) return existing;

        return ContentModel.create({
            name: name.trim(),
            subcategoryId,
            status,
        });
    }

    private async resolveCategory(ai: any, fallback: TaxonomyNode) {
        const existing = await this.findByName<TaxonomyNode>(CategoryModel, ai.category);
        if (existing) return { doc: existing, matched: true };

        if (ai.suggestedCategory?.trim()) {
            const suggested = await this.findOrCreateCategory(ai.suggestedCategory, "Inactive");
            return { doc: suggested, matched: true };
        }

        return { doc: fallback, matched: false };
    }

    private async resolveSubCategory(
        ai: any,
        categoryId: Types.ObjectId,
        fallback: { category: TaxonomyNode; subcategory: TaxonomyNode }
    ) {
        const existing = await this.findByName<TaxonomyNode>(SubCategoryModel, ai.subcategory, { categoryId });
        if (existing) return { doc: existing, matched: true };

        if (ai.suggestedSubcategory?.trim()) {
            const suggested = await this.findOrCreateSubCategory(
                ai.suggestedSubcategory,
                categoryId,
                "Inactive"
            );
            return { doc: suggested, matched: true };
        }

        if (String(categoryId) === String(fallback.category._id)) {
            return { doc: fallback.subcategory, matched: false };
        }

        const general = await this.findOrCreateSubCategory("General", categoryId, "Inactive");
        return { doc: general, matched: false };
    }

    private async resolveContent(
        ai: any,
        subcategoryId: Types.ObjectId,
        fallback: { subcategory: TaxonomyNode; content: TaxonomyNode }
    ) {
        const existing = await this.findByName<TaxonomyNode>(ContentModel, ai.content, { subcategoryId });
        if (existing) return { doc: existing, matched: true };

        if (ai.suggestedContent?.trim()) {
            const suggested = await this.findOrCreateContent(
                ai.suggestedContent,
                subcategoryId,
                "Inactive"
            );
            return { doc: suggested, matched: true };
        }

        if (String(subcategoryId) === String(fallback.subcategory._id)) {
            return { doc: fallback.content, matched: false };
        }

        const general = await this.findOrCreateContent("General Item", subcategoryId, "Inactive");
        return { doc: general, matched: false };
    }
}

export default new AICategorisationService();
