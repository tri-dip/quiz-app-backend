import * as QuizService from "./quiz.service.js";

const activeQuestions = {};

export default function initQuizSocket(io) {
  io.on("connection", (socket) => {
    console.log(`⚡ New user connected: ${socket.id}`);

    socket.on("joinQuiz", async ({ quizCode, userId }) => {
      try {
        const quiz = await QuizService.getQuizByCode(quizCode);
        if (!quiz) {
          return socket.emit("error", { message: "Invalid quiz code" });
        }
        const quizId = quiz.id;
        const room = `quiz_${quizId}`;
        socket.join(room);
        io.to(room).emit("userJoined", { userId, quizId });
      } catch (err) {
        console.error("Error in joinQuiz:", err);
        socket.emit("error", { message: "Failed to join the quiz." });
      }
    });

    socket.on("submitAnswer", async (data) => {
      const { quizId, questionId, userId } = data;
      const active = activeQuestions[quizId];

      // --- FIX: Use loose equality (==) to handle string vs number types ---
      if (!active || active.questionId != questionId) {
        console.warn(`[${userId}] submitted for inactive/wrong question. Expected: ${active?.questionId}, Got: ${questionId}`);
        return socket.emit("error", { message: "Answer window closed" });
      }
      // --- END FIX ---

      if (Date.now() > active.endTime) {
        console.warn(`[${userId}] submitted answer too late. Deadline passed.`);
        return socket.emit("error", { message: "Answer window closed" });
      }

      try {
        const { isCorrect, points } = await QuizService.submitAnswer({
          ...data,
          endTime: active.endTime,
          totalTime: active.totalTime,
        });
        io.to(`quiz_${quizId}`).emit("answerReceived", {
          userId,
          questionId,
          isCorrect,
          points,
        });
      } catch (err) {
        console.error("Error in submitAnswer:", err);
        socket.emit("error", { message: "Failed to submit answer." });
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔥 User disconnected: ${socket.id}`);
    });
  });
}

export async function startQuiz(io, quizId) {
  console.log(`🚀 Starting quiz [${quizId}]...`);
  const room = `quiz_${quizId}`;
  const questions = await QuizService.getQuestions(quizId);

  for (const question of questions) {
    const questionDuration = question.time_limit * 1000;
    const answerGracePeriod = 2000;
    const answerDisplayDuration = 3000;

    activeQuestions[quizId] = {
      questionId: question.id,
      endTime: Date.now() + questionDuration + answerGracePeriod,
      totalTime: questionDuration,
    };

    io.to(room).emit("newQuestion", {
      id: question.id,
      text: question.question_text,
      options: question.options,
      time: question.time_limit,
    });

    await new Promise(resolve => setTimeout(resolve, questionDuration));

    io.to(room).emit("questionEnded", {
      questionId: question.id,
      correct: question.correct_option,
    });

    await new Promise(resolve => setTimeout(resolve, answerGracePeriod + answerDisplayDuration));
  }

  delete activeQuestions[quizId];
  console.log(`🏁 Quiz [${quizId}] has ended.`);
  await QuizService.setQuizStatus(quizId, "ended");
  const leaderboard = await QuizService.getLeaderboard(quizId);
  io.to(room).emit("quizEnded", leaderboard);
}