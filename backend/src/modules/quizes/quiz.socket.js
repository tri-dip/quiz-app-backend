import * as QuizService from "./quiz.service.js";

const activeQuestions = {}; 

export default function initQuizSocket(io) {
  io.on("connection", (socket) => {
    console.log("⚡ New user connected:", socket.id);

    socket.on("joinQuiz", ({ quizId, userId }) => {
      socket.join(`quiz_${quizId}`);
      io.to(`quiz_${quizId}`).emit("userJoined", { userId });
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
  }

  const leaderboard = await QuizService.getLeaderboard(quizId);
  io.to(`quiz_${quizId}`).emit("quizEnded", leaderboard);
}