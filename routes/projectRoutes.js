const express = require("express");

const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
} = require("../controllers/projectController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// View all projects
router.get("/", getProjects);

// Create project (login required)
router.post("/", authMiddleware, createProject);

// View one project
router.get("/:id", getProjectById);

// Update project (owner only)
router.patch("/:id", authMiddleware, updateProject);

// Delete project (owner only)
router.delete("/:id", authMiddleware, deleteProject);

module.exports = router;