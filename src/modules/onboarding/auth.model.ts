// import { Schema, model, Types } from "mongoose"
// import { UserInterface } from "./auth.types"

// const UserSchema = new Schema<UserInterface>(
//     {
//         deviceId: { type: String },

//         locationId: { type: Types.ObjectId, ref: "Location" },

//         fullname: { type: String, required: true },

//         email: { type: String, required: true, unique: true, lowercase: true },

//         username: { type: String, required: true, unique: true },

//         password: { type: String, required: true },

//         emailVerified: { type: Boolean, default: false },

//         verificationCode: { type: String },

//         verificationCodeExpires: { type: Date }
//     },
//     {
//         timestamps: true // creates createdAt and updatedAt
//     }
// )

// export const UserModel = model<UserInterface>("User", UserSchema)



import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    deviceId: string;
    fullname: string;
    email: string;
    username: string;
    password: string;
    isVerified: boolean;
    refreshToken?: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    verificationCode?: string;
    verificationCodeExpires?: Date;
    resetPasswordCode?: string;

    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        deviceId: { type: String, required: true, unique: true },
        fullname: { type: String, required: true, trim: true },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            index: true
        },

        username: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        password: { type: String, required: true },

        isVerified: { type: Boolean, default: false },

        refreshToken: String,

        resetPasswordToken: String,
        resetPasswordExpires: Date,

        verificationCode: String,

        resetPasswordCode: String,
        verificationCodeExpires: Date
    },
    { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);


