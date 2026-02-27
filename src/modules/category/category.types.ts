import { Document, Types } from "mongoose";

export type StatusType = "Active" | "Inactive";

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
    category: Types.ObjectId;
    status: StatusType;
    created_at: Date;
    updated_at: Date;
}