const express = require("express");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const skillRoutes = require("./routes/skillRoutes");
const projectRoutes = require("./routes/projectRoutes");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/projects",projectRoutes)

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to SkillBridge API!",
    status: "Server is running"
  });
});

app.listen(PORT, () => {
  console.log(`SkillBridge server running at http://localhost:${PORT}`);
});
