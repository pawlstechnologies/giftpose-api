import express from "express";
import morgan from "morgan";
import cors from "cors";


const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());



app.get("/api", (_req, res) => {
  res.json({ message: "Welcome to GiftPose API - the best thing 🚀" });
});

export default app;