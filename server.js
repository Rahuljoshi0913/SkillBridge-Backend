const express = require("express");
require("dotenv").config();
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const skillRoutes = require("./routes/skillRoutes");
const projectRoutes = require("./routes/projectRoutes");
const collaborationRoutes = require("./routes/collaborationRoutes");
const adminRoutes = require("./routes/adminRoutes");



const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors({
  origin: process.env.FRONTEND_URL
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/projects",projectRoutes)
app.use("/api/collaboration", collaborationRoutes);
app.use("/api/admin", adminRoutes);


app.get("/", (req, res) => {
  res.json({
    message: "Welcome to SkillBridge API!",
    status: "Server is running"
  });
});

app.listen(PORT, () => {
  console.log(`SkillBridge server running at http://localhost:${PORT}`);
});
