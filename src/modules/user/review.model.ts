import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
    targetUserId: mongoose.Types.ObjectId;
    reviewerUserId?: mongoose.Types.ObjectId;
    reviewerName: string;
    reviewerAvatar?: string;
    itemId?: mongoose.Types.ObjectId;
    rating: number;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
    {
        targetUserId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        reviewerUserId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        reviewerName: {
            type: String,
            required: true,
            trim: true,
        },
        reviewerAvatar: {
            type: String,
            default: "",
        },
        itemId: {
            type: Schema.Types.ObjectId,
            ref: "Item",
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { timestamps: true }
);

export const ReviewModel = mongoose.model<IReview>("Review", ReviewSchema);
export default ReviewModel;
