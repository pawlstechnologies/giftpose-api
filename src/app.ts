import express from "express";
import morgan from "morgan";
import cors from "cors";

import itemRoutes from './modules/items/item.routes';
import locationRoutes from './modules/location/location.routes';
import { errorHandler } from "./middleware/error.middleware";


const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());



app.get("/api", (_req, res) => {
  res.json({ message: "Welcome to GiftPose API - the best thing 🚀" });
});

///list of routes
app.use("/api/location", locationRoutes);
app.use("/api/item", itemRoutes);


app.use(errorHandler); //handles error globally

export default app;