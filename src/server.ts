import dotenv from "dotenv";
dotenv.config();
import mongoose  from "mongoose";
import app from "./app";
import { connectDatabase } from "./config/database";

const PORT = process.env.PORT || 4000;


const startServer = async () => {
    try {

        await connectDatabase();

        // TrashNothingSyncService.start();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer(); 



