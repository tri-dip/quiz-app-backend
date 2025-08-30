import { Router } from "express";

import authRoutes from "./modules/auth/auth.routes.js";
import quizRoutes from "./modules/quizes/quiz.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/quiz",quizRoutes);

export default router;
