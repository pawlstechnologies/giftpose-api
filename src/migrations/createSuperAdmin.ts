import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';


import { AdminModel } from '../admin/auth/admin.model';


export const createSuperAdmin = async () => {
    try {
        const email = process.env.SUPER_ADMIN_EMAIL || 'admin@giftpose.com';
        const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';

        // Check if already exists
        const existingAdmin = await AdminModel.findOne({ email });

        if (existingAdmin) {
            console.log('✅ Super admin already exists');
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create admin
        const admin = await AdminModel.create({
            fullname: 'Super Admin',
            email,
            password: hashedPassword,
            role: 'super_admin',

            isActive: true,
            isVerified: true,

            // mfaEnabled: true, // Enable later after first login

            loginAttempts: 0
        });

        console.log('🔥 Super Admin Created Successfully');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        console.log('⚠️ CHANGE PASSWORD AFTER FIRST LOGIN');

    } catch (error) {
        console.error('❌ Error creating super admin:', error);
    }
};

