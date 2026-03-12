import { Schema, model, Types } from "mongoose"
import { UserInterface } from "./auth.types"

const UserSchema = new Schema<UserInterface>(
    {
        deviceId: { type: String },

        locationId: { type: Types.ObjectId, ref: "Location" },

        fullname: { type: String, required: true },

        email: { type: String, required: true, unique: true, lowercase: true },

        username: { type: String, required: true, unique: true },

        password: { type: String, required: true },

        emailVerified: { type: Boolean, default: false },

        verificationCode: { type: String },

        verificationCodeExpires: { type: Date }
    },
    {
        timestamps: true // creates createdAt and updatedAt
    }
)

export const UserModel = model<UserInterface>("User", UserSchema)