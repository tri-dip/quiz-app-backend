import * as QuizService from "./quiz.service.js";
import { startQuiz } from "./quiz.socket.js";


export async function startQuizController(req, res, io) {
  const { quizCode } = req.params;
  try {
    const result = await QuizService.getQuizByCode(quizCode);

    if (!result) {
      return res.status(400).json({ error: "Quiz does not exist" });
    }

    if (result.status !== "pending") {
      return res.status(400).json({ error: "Quiz has already started or ended" });
    }

    const quizId = result.id;

    await QuizService.setQuizStatus(quizId, "live");
    res.json({ message: "Quiz started!", quizId, quizCode });

    io.to(`quiz_${quizId}`).emit("quizStarted", { quizId });
    startQuiz(io, quizId);

  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to start quiz" });
    }
  }
}

export async function createQuiz(req, res) {
  const { title, questions } = req.body;
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Invalid quiz data" });
  }
  try {
    const quiz = await QuizService.createQuiz(title, questions);
    res.status(201).json({ id: quiz.id, code: quiz.code, message: "Quiz created!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Quiz creation failed" });
  }
}
