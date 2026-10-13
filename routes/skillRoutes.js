const express = require("express");

const {
  getSkills,
  addSkill
} = require("../controllers/skillController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get all skills
router.get("/", getSkills);

// Add a skill (login required)
router.post("/", authMiddleware, addSkill);

module.exports = router;