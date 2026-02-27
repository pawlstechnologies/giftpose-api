import { Schema, model, HydratedDocument } from 'mongoose';
import { ItemInterface } from './item.types';

export type ItemModel = HydratedDocument<ItemInterface>;

const itemSchema = new Schema<ItemModel>(
  {
   
    name: { type: String, required: true },
    description: { type: String },
    imageUrls: { type: [String], default: [] },
    category: { type: String, required: true },
    subCategory: { type: String },
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
    
    url: { type: String },
  
    type: { type: String },
    pickup: {type: Boolean, default: false},
    country: {type: String, required: true},
    postId: { type: Number, required: true, unique:true },
    expiration: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['Live', 'Processing', 'Pending'], 
      default: 'Processing' 
    },
    thumbnail: { type: String },
    
    visitCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// 🔥 GEO INDEX
itemSchema.index({ location: '2dsphere' });
// itemSchema.index({ postId: 1 });

export default model<ItemModel>('Item', itemSchema);
