import * as QuizService from "./quiz.service.js";

const activeQuestions = {};

export default function initQuizSocket(io) {
  io.on("connection", (socket) => {
    console.log("⚡ New user connected:", socket.id);

    socket.on("joinQuiz", async ({ quizCode, userId }) => {
      try {
        const quiz = await QuizService.getQuizByCode(quizCode);

        if (!quiz) {
          return socket.emit("error", { message: "Invalid quiz code" });
        }
        const quizId = quiz.id;
        socket.join(`quiz_${quizId}`);
        io.to(`quiz_${quizId}`).emit("userJoined", { userId, quizId });
      } catch (err) {
        console.error(err);
        socket.emit("error", { message: "Failed to join quiz" });
      }
    });
    socket.on("submitAnswer", async (data) => {
      const active = activeQuestions[data.quizId];
      if (
        !active ||
        active.questionId !== data.questionId ||
        Date.now() > active.endTime
      ) {
        return socket.emit("error", { message: "Answer window closed" });
      }

      try {
        const { isCorrect, points } = await QuizService.submitAnswer({
          ...data,
          endTime: active.endTime,
          totalTime: active.totalTime
        });

        io.to(`quiz_${data.quizId}`).emit("answerReceived", {
          userId: data.userId,
          questionId: data.questionId,
          isCorrect,
          points
        });
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
    const endTime = Date.now() + q.time_limit * 1000;
    activeQuestions[quizId] = { questionId: q.id, endTime };

    io.to(`quiz_${quizId}`).emit("newQuestion", {
      id: q.id,
      text: q.question_text,
      options: q.options,
      time: q.time_limit
    });

    await new Promise(r => setTimeout(r, q.time_limit * 1000));
    io.to(`quiz_${quizId}`).emit("questionEnded", { questionId: q.id, correct: q.correct_option });

    delete activeQuestions[quizId];
    await new Promise(r => setTimeout(r, 3000));
  }
  await QuizService.setQuizStatus(quizId, "ended");
  const leaderboard = await QuizService.getLeaderboard(quizId);
  io.to(`quiz_${quizId}`).emit("quizEnded", leaderboard);

}