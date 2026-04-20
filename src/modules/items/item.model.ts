import { Schema, model, HydratedDocument, Types } from 'mongoose';
import { ItemInterface } from './item.types';

export type ItemModel = HydratedDocument<ItemInterface>;

const itemSchema = new Schema<ItemModel>(
  {
    userId: {
      type: Schema.Types.ObjectId, ref: "User", required: false
    },
    name: { type: String, required: true },
    description: { type: String },
    imageUrls: { type: [String], default: [] },
    categoryId: {
      type: Schema.Types.ObjectId, ref: "Category", required: true
    },
    subCategoryId: {
      type: Schema.Types.ObjectId, ref: "Subcategory", required: true
      // type: String 
    },
    contentId: {
      type: Schema.Types.ObjectId, ref: "Content", required: true
      // type: String 
    },
    isCategorised: {
      type: Boolean,
      default: false
    },
    city: { type: String },

    postCode: { type: String, required: true, uppercase: true },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true
      }
    },

    partner: { type: String },
    isTaken: { type: Boolean, default: false },
    takenByDevices: {
      type: [String],
      default: []
    },
    hiddenByDevices: {
      type: [String],
      default: []
    },
    reports: [
  {
    deviceId: {
      type: String,
      required: true
    },

    reason: {
      type: String,
      required: true,
      enum: [
        "NOT_AVAILABLE",
        "WRONG_LOCATION",
        "MISLEADING",
        "PROHIBITED",
        "NOT_FREE",
        "SCAM",
        "INAPPROPRIATE",
        "SPAM",
        "SAFETY",
        "OTHER"
      ]
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
],

    url: { type: String },

    type: { type: String },
    pickup: { type: Boolean, default: false },
    country: { type: String, required: true },
    postId: { type: Number, required: true, unique: true },
    expiration: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Live', 'Processing', 'Pending'],
      default: 'Processing'
    },
    thumbnail: { type: String },

    visitCount: { type: Number, default: 0 }
  },
  

  { timestamps: true },

);


// 🔥 GEO INDEX
itemSchema.index({ location: '2dsphere' });
// itemSchema.index({ postId: 1 });

export default model<ItemModel>('Item', itemSchema);
