import pool from "../../db.js";
import { v4 as uuidv4 } from 'uuid';

export async function setQuizStatus(quizId, status) {
  await pool.query(
    "UPDATE quizzes SET status=$1, start_time=NOW() WHERE id=$2",
    [status, quizId]
  );
}
export async function getQuizByCode(quizCode) {
  try {
    const res = await pool.query(
      "SELECT * FROM quizzes WHERE code = $1",
      [quizCode]
    );

    if (res.rows.length === 0) {
      return null; 
    }
    return res.rows[0];
  } catch (err) {
    console.error("Error fetching quiz by code:", err);
    throw err; 
  }
}

export async function getQuizStatus(quizId) {
  const res = await pool.query("SELECT status FROM quizzes WHERE id=$1", [quizId]);
  return res.rows[0]?.status;
}
export async function createCode(){
  return uuidv4().split("-")[0];
}

export async function createQuiz(title, questions) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const code = await createCode();
    const quizResult = await client.query(
      "INSERT INTO quizzes (title,code) VALUES ($1,$2) RETURNING *",
      [title,code]
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


/**
 * Calculates the final leaderboard for a quiz.
 * @param {string | number} quizId The ID of the quiz.
 * @returns {Promise<Array<{rank: number, userId: any, username: string, score: number}>>} A promise that resolves to the sorted leaderboard array.
 */
export async function getLeaderboard(quizId) {
  
  const query = `
    SELECT
      a.user_id,
      u.username,
      SUM(a.points) AS score
    FROM
      answers AS a
    JOIN
      users AS u ON a.user_id = u.id
    WHERE
      a.quiz_id = $1
    GROUP BY
      a.user_id, u.username
    ORDER BY
      score DESC, a.user_id ASC;
  `;

  const res = await pool.query(query, [quizId]);
  const leaderboard = res.rows.map((user, index) => ({
    rank: index + 1, 
    userId: user.user_id,
    username: user.username,
    score: parseInt(user.score, 10) || 0,
  }));

  return leaderboard;
}


export async function submitAnswer({ quizId, userId, questionId, answer, endTime, totalTime }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const qRes = await client.query(
      "SELECT correct_option FROM questions WHERE id=$1",
      [questionId]
    );
    if (qRes.rows.length === 0) throw new Error("Question not found");

    const correctOption = qRes.rows[0].correct_option;
    const isCorrect = answer === correctOption;

    let points = 0;
    if (isCorrect) {
      points = 10;
      const timeLeft = Math.max(0, endTime - Date.now());
      const bonus = Math.round((timeLeft / totalTime) * 10);
      points += bonus;
    }

    await client.query(
      `INSERT INTO answers (quiz_id, user_id, question_id, answer, is_correct, points)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (quiz_id, user_id, question_id)
       DO UPDATE SET answer=$4, is_correct=$5, points=$6`,
      [quizId, userId, questionId, answer, isCorrect, points]
    );

    await client.query("COMMIT");
    return { isCorrect, points };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Counts the total number of questions for a given quiz.
 * @param {string | number} quizId The ID of the quiz.
 * @returns {Promise<number>} A promise that resolves to the total question count.
 */
export async function getQuestionCount(quizId) {
  const res = await pool.query(
    'SELECT COUNT(*) FROM questions WHERE quiz_id = $1',
    [quizId]
  ); 
  return parseInt(res.rows[0].count, 10);
}