
import mongoose, { Schema } from 'mongoose';

const NotificationSchema = new Schema({
    deviceId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    title: String,
    message: String,
    type: { type: String, enum: ['Item_Posted', 'New_Item_Alert'], default: 'New_Item_Alert' },
    read: { type: Boolean, default: false },
    img: { type: String, required: true },
    data: Object
}, { timestamps: true });

export default mongoose.model('Notification', NotificationSchema);