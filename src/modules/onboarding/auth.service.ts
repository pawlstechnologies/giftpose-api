
import { UserModel } from "./auth.model";
import { RegisterDTO, LoginDTO, VerifyEmailDTO } from "./auth.types";
import { hashPassword, comparePassword } from "../../utils/hash";
import { generateToken, generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { generateVerificationCode } from "../../utils/code";
import { sendVerificationEmail, sendResetPasswordCodeEmail } from "../../utils/email";
import ApiError from '../../utils/ApiError';
import LocationModel from "../location/location.mdel";
import * as crypto from 'crypto';

export class AuthService {

    async register(data: RegisterDTO) {
        const { fullname, email, username, password, confirmPassword, deviceId } = data;

        //get device location
        const location = await LocationModel.findOne({ deviceId });

        if (!location) {
            return {
                status: false,
                statusCode: 404,
                message: 'Device not found. Please register your location first.',
            };
            //throw new ApiError(404, 'Device not found');
        }


        if (password !== confirmPassword) {
            return {
                status: false,
                statusCode: 401,
                message: 'Passwords do not match',
            };
            // throw new ApiError(433, 'Passwords do not match');
        }

        const existingUser = await UserModel.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return {
                status: false,
                statusCode: 401,
                message: 'Email or username already exists',
            };
            //throw new ApiError(433, 'Email or username already exists');
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
            status: true,
            statusCode: 201,
            message: 'User created. Verify email.',
            userId: user._id,
            fullname: user.fullname,
            email: user.email,
            username: user.username
        };

    }

    async login(data: LoginDTO) {
        try {
            const { identifier, password } = data;

            const user = await UserModel.findOne({
                $or: [{ email: identifier }, { username: identifier }]
            });

            // if (!user) throw new ApiError(401,  'Invalid username or password____', );
            if (!user) {
                return {
                    status: false,
                    statusCode: 401,
                    message: 'Invalid username or password',
                };
            }

            const isMatch = await comparePassword(password, user.password);
            if (!isMatch) {
                return {
                    status: false,
                    statusCode: 401,
                    message: 'Invalid username or password',
                };
            }

            if (!user.isVerified) {
                return {
                    status: false,
                    statusCode: 403,
                    message: 'Please verify your email first',
                };
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
                status: true,
                statusCode: 200,
                message: 'Login successful',
                data: {
                    accessToken,
                    refreshToken,
                    user: {
                        id: user._id,
                        // deviceId: user.deviceId,
                        fullname: user.fullname,
                        email: user.email,
                        username: user.username
                    }
                }
            };


            // return {
            //     accessToken,
            //     refreshToken,
            //     user: {
            //         id: user._id,
            //         fullname: user.fullname,
            //         email: user.email,
            //         username: user.username
            //     }
            // };
        } catch (error) {
            console.error(error);

            return {
                status: false,
                statusCode: 500,
                message: 'Something went wrong',
            };
        }


    }

    async refresh(userId: string, token: string) {
        const user = await UserModel.findById(userId);

        if (!user || user.refreshToken !== token) {
            return {
                status: false,
                statusCode: 401,
                message: 'Invalid refresh token',
            };
            // throw new Error('Invalid refresh token');
        }

        const accessToken = generateAccessToken({ id: user._id });

        return { accessToken };

    }


    async resendVerification(email: string) {
        const user = await UserModel.findOne({ email });

        if (!user) {
            return {
                status: false,
                statusCode: 404,
                message: 'User not found',
            };
        }
        if (user.isVerified) {
            return {
                status: false,
                statusCode: 433,
                message: 'Already verified',
            };
        }

        const code = generateVerificationCode();

        user.resetPasswordCode = code;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

        // user.verificationCode = code;
        // user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

        await user.save();

        await sendVerificationEmail(email, code);

        return {
            status: true,
            statusCode: 200,
            message: 'Verification code resent',
        };

        // return { message: 'Verification code resent' };
    }



    async verifyEmail(data: VerifyEmailDTO) {
        const { email, code } = data;

        const user = await UserModel.findOne({ email });

        if (!user) {
            return {
                status: false,
                statusCode: 404,
                message: 'User not found',
            };
        }
            
            //throw new ApiError(404, 'User not found');

        if (user.verificationCode !== code) {
            return {
                status: false,
                statusCode: 404,
                message: 'Invalid code',
            };
        }

        if (user.verificationCodeExpires! < new Date()) {
            return {
                status: false,
                statusCode: 433,
                message: 'Code expired',
            };
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;

        await user.save();
        return {
            status: true,
            statusCode: 200,
            message: 'Email verified successfully',
        };

        // return { message: 'Email verified successfully' };
    }

    async forgotPassword(email: string) {
        const user = await UserModel.findOne({ email });

        if (!user) {
            return {
                status: false,
                statusCode: 404,
                message: 'User not found',
            };
        }

        // const rawToken = crypto.randomBytes(32).toString('hex');
        // const hashedToken = crypto
        //     .createHash('sha256')
        //     .update(rawToken)
        //     .digest('hex');

        const code = generateVerificationCode();
        user.resetPasswordCode = code;
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

        // user.resetPasswordToken = hashedToken;
        // user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

        await user.save();

        await sendResetPasswordCodeEmail(email, code);

        return {
            status: true,
            statusCode: 200,
            message: 'Password Reset code sent',
        };
    }

    async resetPassword(email: string,
        code: string,
        newPassword: string) {

        const user = await UserModel.findOne({ email });

        if (!user) {    
            return {
                status: false,
                statusCode: 404,
                message: 'User not found',
            };
        }

        if (user.resetPasswordExpires! < new Date()) {
            return {
                status: false,
                statusCode: 433,
                message: 'Token expired',
            };
        }

        if (user.resetPasswordCode !== code) {
            return {
                status: false,
                statusCode: 433,
                message: 'Invalid code',
            };
        }

        if (user.resetPasswordExpires! < new Date()) {
            return {
                status: false,
                statusCode: 433,
                message: 'Code expired',
            };
        }



        user.password = await hashPassword(newPassword);

        // user.resetPasswordToken = undefined;
        // user.resetPasswordExpires = undefined;

        user.resetPasswordCode = undefined;
        user.resetPasswordExpires = undefined;

        user.refreshToken = undefined;

        await user.save();

        return {
            status: true,
            statusCode: 200,
            message: 'Password reset successful',
        };
    }


    async deleteUser(email: string) {
        const user = await UserModel.findOneAndDelete({ email });
        if (!user) {
            return {
                status: false,
                statusCode: 404,
                message: 'User not found',
            };
        }
        return {
            status: true,
            statusCode: 200,
            message: 'User deleted successfully',
        };
    }

    async logout(userId: string) {
        const user = await UserModel.findById(userId);

        if (!user) {
            return {
                status: false,
                statusCode: 404,
                message: 'User not found',
            };
        }

        // Invalidate refresh token
        user.refreshToken = undefined;
        await user.save();

        return {
            status: true,
            statusCode: 200,
            message: 'Logged out successfully',
        };
    }

}


