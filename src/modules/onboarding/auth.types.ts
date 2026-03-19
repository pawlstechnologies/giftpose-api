
export interface RegisterDTO {
    deviceId: string;
    fullname: string;
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
}

export interface LoginDTO {
    identifier: string; // email OR username
    password: string;
}

export interface VerifyEmailDTO {
    email: string;
    code: string;
}


