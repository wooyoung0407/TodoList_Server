import express from "express";
import pkg from 'pg';
import cors from "cors";

const { Pool } = pkg;
const app = express();
const port = 3000;
const pool = new Pool({
  user: "postgres",
  host: "robe-todolist-db.internal",
  database: "postgres",
  password: "Mvxtn5yBL07OIhu",
  port: 5432,
});

pool.connect((err) => {
  if (err) {
    console.error("connection error", err.stack);
  } else {
    console.log("connected to postgres");
  }
});

const corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));
app.use(express.json());

// 조회
app.get("/:user_code/todos", async (req, res) => {
  const { user_code } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM todo
      WHERE user_code = $1
      ORDER BY id ASC
      `,
      [user_code]
    );

    res.json({
      resultCode: "S-1",
      msg: "성공",
      data: rows,
    });
  } catch (error) {
    console.error("Error during todo retrieval:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류",
    });
  }
});

// 단건조회
app.get("/:user_code/todos/:no", async (req, res) => {
  const { user_code, no } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM todo
      WHERE user_code =$1
      AND no = $2
      `,
      [user_code, no]
    );

    const todoRow = rows[0];

    if (todoRow === undefined) {
      res.status(404).json({
        resultCode: "F-1",
        msg: "실패",
      });
      return;
    }

    res.json({
      resultCode: "S-1",
      msg: "성공",
      data: todoRow,
    });
  } catch (error) {
    console.error("Error during todo retrieval:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류",
    });
  }
});

// 삭제
app.delete("/:user_code/todos/:id", async (req, res) => {
  const { user_code, id } = req.params;

  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM todo
      WHERE user_code = $1
      AND id = $2
      `,
      [user_code, id]
    );

    const todoRow = rows[0];

    if (todoRow === undefined) {
      res.status(404).json({
        resultCode: "F-1",
        msg: "실패",
      });
      return;
    }

    await pool.query(
      `
      DELETE FROM todo
      WHERE user_code = $1
      AND id = $2
      `,
      [user_code, id]
    );

    res.json({
      resultCode: "S-1",
      msg: `${id}번 할일을 삭제하였습니다.`,
    });
  } catch (error) {
    console.error("Error during todo deletion:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류",
    });
  }
});

// 업데이트
app.post("/:user_code/todos", async (req, res) => {
  const { user_code } = req.params;
  const { content, perform_date } = req.body;

  try {
    const { rows: [lastTodoRow] } = await pool.query(
      `
      SELECT *
      FROM todo
      WHERE user_code = $1
      ORDER BY id DESC
      LIMIT 1
      `,
      [user_code]
    );

    const no = lastTodoRow?.no + 1 || 1;

    const { rows: [insertTodoRow] } = await pool.query(
      `
      INSERT INTO todo (reg_date, update_date, user_code, no, content, perform_date)
      VALUES (NOW(), NOW(), $1, $2, $3, $4)
      RETURNING *
      `,
      [user_code, no, content, perform_date]
    );

    if (!content) {
      res.status(400).json({
        resultCode: "F-1",
        msg: "내용없음",
      });
      return;
    }
    if (!perform_date) {
      res.status(400).json({
        resultCode: "F-1",
        msg: "생성일이 없다.",
      });
      return;
    }

    const { rows: [justCreatedTodoRow] } = await pool.query(
      `
      SELECT *
      FROM todo
      WHERE id = $1
      `,
      [insertTodoRow.id]
    );

    res.json({
      resultCode: "S-1",
      msg: `${justCreatedTodoRow.id}번 할일을 생성하였습니다.`,
      data: justCreatedTodoRow,
    });
    
  } catch (error) {
    console.error("Error during todo creation:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류",
    });
  }
});

// 수정
app.patch("/:user_code/todos/:no", async (req, res) => {
  const { user_code, no } = req.params;
  const { content = todoRow.content, perform_date = todoRow.perform_date } =
    req.body;

  try {
    const { rows: [todoRow] } = await pool.query(
      `
      SELECT *
      FROM todo
      WHERE user_code = $1
      AND no = $2
      `,
      [user_code, no]
    );

    await pool.query(
      `
      UPDATE todo
      SET update_date = NOW(),
      content = $1,
      perform_date = $2
      WHERE user_code = $3
      AND no = $4
      `,
      [content, perform_date, user_code, no]
    );

    const { rows: [justModifiedTodoRow] } = await pool.query(
      `
      SELECT *
      FROM todo
      WHERE user_code = $1
      AND no = $2
      `,
      [user_code, no]
    );

    if (todoRow === undefined) {
      res.status(404).json({
        resultCode: "F-1",
        msg: "실패",
      });
      return;
    }

    res.json({
      resultCode: "S-1",
      msg: "성공",
      data: justModifiedTodoRow,
    });
  } catch (error) {
    console.error("Error during todo modification:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "서버 오류",
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});