import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// import speakeasy from 'speakeasy';

import crypto from 'crypto'

import { AdminModel } from './admin.model';
// import { token } from 'morgan';
import { sendVerificationEmail } from '../../utils/email';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
const OTP_EXPIRE_MINUTES = 5; // OTP expires in 5 mins

export class AdminAuthService {
    static async login(email: string, password: string) {
        const admin = await AdminModel.findOne({ email });

        if (!admin) throw new Error('Email or Password incorrect');

        if (admin.lockUntil && admin.lockUntil > new Date()) {
            throw new Error('Account locked');
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            await this.handleFailedLogin(admin);
            throw new Error('Email or Password incorrect');
        }

        // ✅ Reset attempts
        admin.loginAttempts = 0;
        admin.lockUntil = undefined;

        const otp = crypto.randomInt(100000, 999999).toString();
        admin.otpCode = otp;
        admin.otpExpires = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
        admin.otpAttempts = 0;

        sendVerificationEmail(admin.email, otp);


        await admin.save();

        return {
            message: 'OTP sent to email',
            adminId: admin._id
        };

    }

    static async verifyOTP(adminId: string, otp: string) {
        const admin = await AdminModel.findById(adminId);
        if (!admin) throw new Error('Admin not found');

        // Check OTP expiry
        if (!admin.otpCode || !admin.otpExpires || new Date() > admin.otpExpires) {
            throw new Error('OTP expired. Please login again.');
        }

        // Check OTP match
        if (admin.otpCode !== otp) {
            admin.otpAttempts = (admin.otpAttempts || 0) + 1;
            await admin.save();
            throw new Error('Invalid OTP');
        }

        // ✅ Clear OTP fields
        admin.otpCode = undefined;
        admin.otpExpires = undefined;
        admin.otpAttempts = 0;
        admin.lastLogin = new Date();
        await admin.save();

        // ✅ Issue tokens after successful OTP
        return this.generateTokens(admin);
    }



    static generateTokens(admin: any) {
        const accessToken = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.ADMIN_JWT_SECRET!,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { id: admin._id },
            process.env.ADMIN_REFRESH_SECRET!,
            { expiresIn: '7d' }
        );

        admin.refreshToken = refreshToken;
        admin.lastLogin = new Date();
        admin.save();

        return {
            accessToken,
            refreshToken,
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role
            }
        };

        // return {
        //     accessToken,
        //     refreshToken
        // };
    }

    static async handleFailedLogin(admin: any) {
        admin.loginAttempts += 1;

        if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            admin.lockUntil = new Date(Date.now() + LOCK_TIME);
        }

        await admin.save();
    }

    static async getMe(adminId: string) {
        const admin = await AdminModel.findById(adminId).select('-password -refreshToken -otpCode -otpExpires');
        if (!admin) throw new Error('Admin not found');

        return {
            id: admin._id,
            name: admin.fullname,
            email: admin.email,
            role: admin.role,
            lastLogin: admin.lastLogin
        };
    }

    static async getDashboardData(adminId: string) {
        // Placeholder for actual dashboard data fetching logic
        return {
            message: 'Dashboard data for admin ' + adminId
        };
    }       

    static async logout(adminId: string, refreshToken: string) {
        const admin = await AdminModel.findById(adminId);

        if (!admin) {
            throw new Error('Admin not found');
        }

        // Ensure token matches
        if (admin.refreshToken !== refreshToken) {
            throw new Error('Invalid session');
        }

        admin.refreshToken = undefined;
        await admin.save();

        return {
            message: 'Logged out successfully'
        };
    }







}
