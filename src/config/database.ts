import mongoose  = require("mongoose");

import { env } from "./env";

export const connectDatabase = async () => {
    try {
        await mongoose.connect(env.mongoUri);

        console.log('Database connected successfully');
        
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
};