import { Document, Types } from "mongoose";

export type StatusType = "Active" | "Inactive" | "Deleted";

export interface ICategory extends Document {
    name: string;
    slug: string;
    status: StatusType;
    created_at: Date;
    updated_at: Date;
}

export interface ISubCategory extends Document {
    name: string;
    slug: string;
    categoryId: Types.ObjectId;
    status: StatusType;
    created_at: Date;
    updated_at: Date;
}

export interface IContent extends Document {
  name: string;
  slug: string;
  status: StatusType;
  subcategoryId: Types.ObjectId;
  created_at: Date;
    updated_at: Date;
}