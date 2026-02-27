import mongoose, { Schema } from "mongoose";
import { ICategory, ISubCategory } from "./category.types";

// Simple slug generator without external dependency
const generateSlug = (text: string) =>
  text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, unique: true, index: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

CategorySchema.pre("save", async function() {
  if (!this.slug || this.isModified("name")) {
    this.slug = generateSlug(this.name);
  }
});

const SubCategorySchema = new Schema<ISubCategory>(
  {
    name: { type: String, required: true },
    slug: { type: String },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

SubCategorySchema.pre("save", function() {
  if (!this.slug || this.isModified("name")) {
    this.slug = generateSlug(this.name);
  }
});

export const CategoryModel = mongoose.model<ICategory>("Category", CategorySchema);
export const SubCategoryModel = mongoose.model<ISubCategory>("SubCategory", SubCategorySchema);

