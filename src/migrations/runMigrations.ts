import mongoose from 'mongoose';
import { createSuperAdmin } from './createSuperAdmin';
import { env } from '../config/env';

const runMigrations = async () => {
    try {
         if (!env.mongoUri) {
            throw new Error('❌ MONGO_URI is not defined in .env');
        }

         await mongoose.connect(env.mongoUri);
        // await mongoose.connect(process.env.MONGO_URI!);

        console.log('✅ DB Connected');

        await createSuperAdmin();

        console.log('🚀 Migrations completed');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

runMigrations();


