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