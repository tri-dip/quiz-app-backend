import pool from "../../db.js";

export async function setQuizStatus(quizId, status) {
  await pool.query(
    "UPDATE quizzes SET status=$1, start_time=NOW() WHERE id=$2",
    [status, quizId]
  );
}

export async function getQuizStatus(quizId) {
  const res = await pool.query("SELECT status FROM quizzes WHERE id=$1", [quizId]);
  return res.rows[0]?.status;
}


export async function createQuiz(title, questions) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const quizResult = await client.query(
      "INSERT INTO quizzes (title) VALUES ($1) RETURNING *",
      [title]
    );
    const quiz = quizResult.rows[0];

    const questionValues = [];
    const valuePlaceholders = [];

    questions.forEach((q, idx) => {
      const timeLimit = q.time || 15;
      questionValues.push(quiz.id, q.text, JSON.stringify(q.options), q.correct, timeLimit);
      const offset = idx * 5;
      valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
    });

    const insertQuery = `
      INSERT INTO questions (quiz_id, question_text, options, correct_option, time_limit)
      VALUES ${valuePlaceholders.join(", ")}
    `;
    await client.query(insertQuery, questionValues);

    await client.query("COMMIT");
    return quiz;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getQuestions(quizId) {
  const res = await pool.query("SELECT * FROM questions WHERE quiz_id=$1", [quizId]);
  return res.rows.map(q => ({
    ...q,
    options: typeof q.options === "string" ? JSON.parse(q.options) : q.options
  }));
}

export async function getLeaderboard(quizId) {
  const res = await pool.query(
    `SELECT user_id, COUNT(*) as score 
     FROM answers a
     JOIN questions q ON a.question_id = q.id
     WHERE a.quiz_id=$1 AND a.answer=q.correct_option
     GROUP BY user_id
     ORDER BY score DESC`,
    [quizId]
  );
  return res.rows;
}

export async function submitAnswer({ quizId, userId, questionId, answer }) {
  await pool.query(
    "INSERT INTO answers (quiz_id, user_id, question_id, answer) VALUES ($1,$2,$3,$4)",
    [quizId, userId, questionId, answer]
  );
}

export async function createCode(quizId){
  
}
