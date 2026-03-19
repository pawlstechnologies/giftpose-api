// import bcrypt from "bcrypt";
// import crypto from "crypto";
// import jwt from "jsonwebtoken";
// import { Types } from "mongoose";


// import { UserModel } from "./auth.model";
// import LocationModel from "../location/location.mdel";

// import { RegisterInput, LoginInput, LocationResponse, SafeUser, AuthResponse, VerifyEmailInput } from "./auth.types";


// export default class AuthService {

//     private static generateToken(userId: Types.ObjectId): string {
//         return jwt.sign(
//             { id: userId.toString() },
//             process.env.JWT_SECRET!,
//             { expiresIn: "7d" }
//         )
//     }

//     /**
//      * Build safe user with optional location
//      */
//     private static buildSafeUser(user: any, location: any): SafeUser {
//         return {
//             id: user._id.toString(),
//             fullname: user.fullname,
//             email: user.email,
//             username: user.username,
//             emailVerified: user.emailVerified,
//             location: location
//                 ? {
//                       id: location._id.toString(),
//                       lat: location.lat,
//                       lng: location.lng,
//                       address: location.address
//                   }
//                 : undefined
//         }
//     }


//     static async register(data: RegisterInput, deviceId?: string): Promise<SafeUser> {
//         const { fullname, email, username, password, confirmPassword } = data

//         if (password !== confirmPassword) {
//             throw new Error("Passwords do not match")
//         }

//         const existing = await UserModel.findOne({
//             $or: [{ email }, { username }]
//         })

//         if (existing) {
//             throw new Error("Email or username already exists")
//         }

//         const hashedPassword = await bcrypt.hash(password, 12)

//         const verificationCode = crypto.randomInt(100000, 999999).toString()

//         /**
//          * Find location linked to device
//          */
//         let locationId: Types.ObjectId | undefined

//         if (deviceId) {

//             const location = await LocationModel.findOne({ deviceId })

//             if (location) {
//                 locationId = location._id
//             }
//         }

//         const user = await UserModel.create({
//             fullname,
//             email,
//             username,
//             password: hashedPassword,
//             deviceId,
//             locationId,
//             verificationCode,
//             verificationCodeExpires: Date.now() + 10 * 60 * 1000
//         })

//         const location = locationId
//             ? await LocationModel.findById(locationId)
//             : null

//         return this.buildSafeUser(user, location)


//     }



//     // private static buildSafeUser(user: any, location: any): SafeUser {

//     //     return {

//     //         id: user._id.toString(),

//     //         fullname: user.fullname,

//     //         email: user.email,

//     //         username: user.username,

//     //         emailVerified: user.emailVerified,

//     //         // location: location
//     //         //     ? {
//     //         //           id: location._id.toString(),
//     //         //           lat: location.lat,
//     //         //           lng: location.lng,
//     //         //           address: location.address
//     //         //       }
//     //         //     : undefined
//     //     }
//     // }

//     static async verifyEmail(data: VerifyEmailInput): Promise<boolean> {

//         const { email, code } = data

//         const user = await UserModel.findOne({ email })

//         if (!user) throw new Error("User not found")

//         if (user.verificationCode !== code) {
//             throw new Error("Invalid verification code")
//         }

//         if (user.verificationCodeExpires! < new Date()) {
//             throw new Error("Verification code expired")
//         }

//         user.emailVerified = true
//         user.verificationCode = undefined
//         user.verificationCodeExpires = undefined

//         await user.save()

//         return true
//     }


//     static async login(data: LoginInput): Promise<AuthResponse> {

//         const { login, password } = data

//         const user = await UserModel.findOne({
//             $or: [
//                 { email: login },
//                 { username: login }
//             ]
//         })

//         if (!user) {
//             throw new Error("Invalid credentials")
//         }

//         const validPassword = await bcrypt.compare(password, user.password)

//         if (!validPassword) {
//             throw new Error("Invalid credentials")
//         }

//         if (!user.emailVerified) {
//             throw new Error("Please verify your email")
//         }

//         const token = jwt.sign(
//             { id: user._id },
//             process.env.JWT_SECRET!,
//             { expiresIn: "7d" }
//         )

//         const location = user.locationId
//             ? await LocationModel.findById(user.locationId)
//             : null

//         const safeUser = this.buildSafeUser(user, location)

//         return {
//             token,
//             user: safeUser
//         }




//     }
// }


import { UserModel } from "./auth.model";
import { RegisterDTO, LoginDTO, VerifyEmailDTO } from "./auth.types";
import { hashPassword, comparePassword } from "../../utils/hash";
import { generateToken, generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { generateVerificationCode } from "../../utils/code";
import { sendVerificationEmail } from "../../utils/email";
import ApiError from '../../utils/ApiError';
import LocationModel from "../location/location.mdel";
import * as crypto from 'crypto';

export class AuthService {

    async register(data: RegisterDTO) {
        const { fullname, email, username, password, confirmPassword, deviceId } = data;

        //getch devie location
        const location = await LocationModel.findOne({ deviceId });

        if (!location) {
            throw new ApiError(404, 'Device not found');
        }


        if (password !== confirmPassword) {
            throw new ApiError(433, 'Passwords do not match');
        }

        const existingUser = await UserModel.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            throw new ApiError(433, 'Email or username already exists');
        }

        const hashedPassword = await hashPassword(password);

        const code = generateVerificationCode();

        const user = await UserModel.create({
            deviceId,
            fullname,
            email,
            username,
            password: hashedPassword,
            verificationCode: code,
            verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 mins
        });

        await sendVerificationEmail(email, code);

        return {
            message: 'User created. Verify email.',
            userId: user._id,
            fullname: user.fullname,
            email: user.email,
            username: user.username
        };

    }

    async login(data: LoginDTO) {
        const { identifier, password } = data;

        const user = await UserModel.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        });

        if (!user) throw new ApiError(433, 'Invalid credentials');
        const isMatch = await comparePassword(password, user.password);

        if (!isMatch) throw new ApiError(433, 'Invalid credentials');

        if (!user.isVerified) {
            throw new ApiError(433, 'Please verify your email first');
        }

        // const token = generateToken({
        //     id: user._id,
        //     email: user.email
        // });

        const accessToken = generateAccessToken({ id: user._id, email: user.email });
        const refreshToken = generateRefreshToken({ id: user._id });

        user.refreshToken = refreshToken;
        await user.save();

        return {
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                fullname: user.fullname,
                email: user.email,
                username: user.username
            }
        };


    }

    async refresh(userId: string, token: string) {
        const user = await UserModel.findById(userId);

        if (!user || user.refreshToken !== token) {
            throw new Error('Invalid refresh token');
        }

        const accessToken = generateAccessToken({ id: user._id });

        return { accessToken };

    }


    async resendVerification(email: string) {
        const user = await UserModel.findOne({ email });

        if (!user) throw new Error('User not found');
        if (user.isVerified) throw new Error('Already verified');

        const code = generateVerificationCode();

        user.verificationCode = code;
        user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

        await user.save();

        await sendVerificationEmail(email, code);

        return { message: 'Verification code resent' };
    }



    async verifyEmail(data: VerifyEmailDTO) {
        const { email, code } = data;

        const user = await UserModel.findOne({ email });

        if (!user) throw new ApiError(404, 'User not found');

        if (user.verificationCode !== code) {
            throw new ApiError(404, 'Invalid code');
        }

        if (user.verificationCodeExpires! < new Date()) {
            throw new ApiError(433, 'Code expired');
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;

        await user.save();

        return { message: 'Email verified successfully' };
    }

    // import crypto from 'crypto';

    async forgotPassword(email: string) {
        const user = await UserModel.findOne({ email });

        if (!user) throw new Error('User not found');

        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(rawToken)
            .digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

        await user.save();

        await sendVerificationEmail(email, hashedToken);

        return { message: 'Reset token sent' };
    }

    async resetPassword(token: string, newPassword: string) {
        const user = await UserModel.findOne({
            resetPasswordToken: token
        });

        if (!user) throw new Error('Invalid token');

        if (user.resetPasswordExpires! < new Date()) {
            throw new Error('Token expired');
        }

        user.password = await hashPassword(newPassword);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        return { message: 'Password reset successful' };
    }



    async logout(userId: string) {
        const user = await UserModel.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        // Invalidate refresh token
        user.refreshToken = undefined;
        await user.save();

        return { message: 'Logged out successfully' };
    }

}


