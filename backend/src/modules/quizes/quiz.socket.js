import * as QuizService from "./quiz.service.js";

export default function initQuizSocket(io) {
  io.on("connection", (socket) => {
    console.log("⚡ New user connected:", socket.id);

    socket.on("joinQuiz", ({ quizId, userId }) => {
      socket.join(`quiz_${quizId}`);
      io.to(`quiz_${quizId}`).emit("userJoined", { userId });
    });

    socket.on("submitAnswer", async (data) => {
      try {
        await QuizService.submitAnswer(data);
        io.to(`quiz_${data.quizId}`).emit("answerReceived", { userId: data.userId, questionId: data.questionId });
      } catch (err) {
        console.error(err);
        socket.emit("error", { message: "Failed to submit answer" });
      }
    });
  });
}

export async function startQuiz(io, quizId) {
  const questions = await QuizService.getQuestions(quizId);

  for (let q of questions) {
    io.to(`quiz_${quizId}`).emit("newQuestion", {
      id: q.id,
      text: q.question_text,
      options: q.options,
      time: q.time_limit
    });
    await new Promise(r => setTimeout(r, q.time_limit * 1000));
    io.to(`quiz_${quizId}`).emit("questionEnded", { questionId: q.id, correct: q.correct_option });
  }

  const leaderboard = await QuizService.getLeaderboard(quizId);
  io.to(`quiz_${quizId}`).emit("quizEnded", leaderboard);
}