export interface AdminLoginDTO {
    email: string;
    password: string;
}

export interface VerifyMFADTO {
    adminId: string;
    code: string;
}

export interface AdminTokenPayload {
    id: string;
    role: string;
}