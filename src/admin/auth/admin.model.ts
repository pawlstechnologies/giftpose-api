import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
    fullname: string;
    email: string;
    password: string;

    role: 'super_admin' | 'moderator' | 'support';

    isActive: boolean;
    isVerified: boolean;

    // mfaEnabled: boolean;
    // mfaSecret?: string;

    otpCode?: string;
    otpExpires?: Date;
    otpAttempts?: number;

    refreshToken?: string;



    loginAttempts: number;
    lockUntil?: Date;

    lastLogin?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
    {
        fullname: { type: String, required: true },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            index: true
        },

        password: { type: String, required: true },

        role: {
            type: String,
            enum: ['super_admin', 'moderator', 'support'],
            default: 'super_admin'
        },

        isActive: { type: Boolean, default: true },
        isVerified: { type: Boolean, default: true },

        // mfaEnabled: { type: Boolean, default: true },
        // mfaSecret: String,

        otpCode: String,
        otpExpires: Date,
        otpAttempts: { type: Number, default: 0 },

        refreshToken: String,

        loginAttempts: { type: Number, default: 0 },
        lockUntil: Date,

        lastLogin: Date
    },
    { timestamps: true }
);

export const AdminModel = mongoose.model<IAdmin>('Admin', AdminSchema);

