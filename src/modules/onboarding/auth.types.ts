import { Document, Types } from "mongoose"


/**
 * Core User Document Interface (Database Model)
 */
export interface UserInterface extends Document {

    _id: Types.ObjectId

    deviceId?: string

    locationId?: Types.ObjectId

    fullname: string

    email: string

    username: string

    password: string

    emailVerified: boolean

    verificationCode?: string

    verificationCodeExpires?: Date

    createdAt: Date

    updatedAt?: Date
}



/**
 * Register Request Payload
 */
export interface RegisterInput {

    fullname: string

    email: string

    username: string

    password: string

    confirmPassword: string
}



/**
 * Login Request Payload
 */
export interface LoginInput {

    login: string   // email or username

    password: string
}



/**
 * Email Verification Payload
 */
export interface VerifyEmailInput {

    email: string

    code: string
}

export interface LocationResponse {
    id: string
    deviceId: string
    lat: number
    lng: number
    postCode: string
    city: string
    address?: string
}




/**
 * Safe User Object Returned to Client
 */
export interface SafeUser {

    id: string

    fullname: string

    email: string

    username: string

    emailVerified: boolean

    location?: LocationResponse
}



/**
 * Login Response
 */
export interface AuthResponse {

    token: string

    user: SafeUser
}



