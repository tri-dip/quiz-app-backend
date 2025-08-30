import express from "express";
import router from "./routes.js";
import cookieParser from "cookie-parser";


const app = express();

app.use(express.json());

app.use("/api",router);

app.use(cookieParser());

app.use((err,req,res,next)=>{
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
});

export default app;