import * as QuizService from "./quiz.service.js";
import { startQuiz } from "./quiz.socket.js";

export async function startQuizController(req, res, io) {
  const { quizId } = req.params;

  try {
    const status = await QuizService.getQuizStatus(quizId);
    if (status !== "pending") {
      return res.status(400).json({ error: "Quiz has already started or ended" });
    }

    await QuizService.setQuizStatus(quizId, "live");

    io.to(`quiz_${quizId}`).emit("quizStarted", { quizId });
    await startQuiz(io, quizId);
    res.json({ message: "Quiz started!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start quiz" });
  }
}



export async function createQuiz(req, res) {
  const { title, questions } = req.body;
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Invalid quiz data" });
  }
  try {
    const quiz = await QuizService.createQuiz(title, questions);
    res.status(201).json({ quizId: quiz.id, message: "Quiz created!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Quiz creation failed" });
  }
}
