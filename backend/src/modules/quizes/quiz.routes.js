import express from "express";
import * as quizController from "./quiz.controller.js";

const router = express.Router();

router.post("/create", quizController.createQuiz);
router.post("/start/:quizId", (req, res) => {
  const io = req.app.get("io");
  quizController.startQuizController(req, res, io);
});

export default router;