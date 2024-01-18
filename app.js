import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
const port = 5000;

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "todobackend",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});


const corsOptions = {
  origin: "http://localhost:3000",
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// 조회
app.get("/:user_code/todos", async (req, res) => {
  const { user_code } = req.params;

  const [rows] = await pool.query(
    `
    SELECT *
    FROM todo
    WHERE user_code = ?
    ORDER BY id ASC
    `,
    [user_code]
  );

  res.json({
    resultCode: "S-1",
    msg: "성공",
    data: rows,
  });
});

// 단건조회
app.get("/:user_code/todos/:no", async (req, res) => {
  const { user_code, no } = req.params;
  const [[todoRow]] = await pool.query(
    `
    SELECT *
    FROM todo
    WHERE user_code =?
    AND no = ?
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
    data: todoRow,
  });
});

// 삭제
app.delete("/:user_code/todos/:id", async (req, res) => {
  const { user_code, id } = req.params;
  const [[todoRow]] = await pool.query(
    `
    SELECT *
    FROM todo
    WHERE user_code =?
    AND id = ?
    `,
    [user_code, id]
  );

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
    WHERE user_code =?
    AND id = ?
    `,
    [user_code, id]
  );

  res.json({
    resultCode: "S-1",
    msg: `${id}번 할일을 삭제하였습니다.`,
  });
});

// 업데이트
app.post("/:user_code/todos", async (req, res) => {
  const { user_code } = req.params;
  const { content, perform_date } = req.body;

  const [[lastTodoRow]] = await pool.query(
    `
    SELECT *
    FROM todo
    WHERE user_code =?
    ORDER BY id DESC
    LIMIT 1
    `,
    [user_code]
  );

  const no = lastTodoRow?.no + 1 || 1;

  const [insertTodoRow] = await pool.query(
    `
    INSERT INTO todo
    SET reg_date = NOW(),
    update_date = NOW(),
    user_code = ?,
    no = ?,
    content = ?,
    perform_date =?
    `,
    [user_code, no, content, perform_date]
  );

  
  if (!content) {
    res.status(400)({
      resultCode: "F-1",
      msg: "내용없음",
    });
    return;
  }
  if (!perform_date) {
    res.status(400)({
      resultCode: "F-1",
      msg: "생성일이 없다.",
    });
    return;
  }

  const [[justCreatedTodoRow]] = await pool.query(
    `
    SELECT *
    FROM todo
    WHERE id = ?
    `,
    [insertTodoRow.insertId]
  );

  res.json({
    resultCode: "S-1",
    msg: `${justCreatedTodoRow.id}번 할일을 생성하였습니다.`,
    data: justCreatedTodoRow,
  });
});

//수정
app.patch("/:user_code/todos/:no", async (req, res) => {
  const { user_code, no } = req.params;
  const { content = todoRow.content, perform_date = todoRow.perform_date } =
    req.body;

  const [[todoRow]] = await pool.query(
    `
    SELECT *
    FROM todo
    WHERE user_code =?
    AND no = ?
    `,
    [user_code, no]
  );

  await pool.query(
    `
    UPDATE todo
    SET update_date = NOW(),
    content = ?,
    perform_date = ?
    WHERE user_code = ?
    AND no = ?
    `,
    [content, perform_date, user_code, no]
  );

  const [[justModifiedTodoRow]] = await pool.query(
    `
    SELECT *
    FROM todo
    WHERE user_code =?
    AND no = ?
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
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
