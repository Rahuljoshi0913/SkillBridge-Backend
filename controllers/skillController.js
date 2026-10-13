const pool = require("../config/db");

// Get all skills
async function getSkills(req, res) {
  try {
    const [skills] = await pool.execute(
      "SELECT id, name FROM skills ORDER BY name ASC"
    );

    return res.status(200).json({
      message: "Skills fetched successfully",
      skills
    });
  } catch (error) {
    console.error("Get skills error:", error.message);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

// Add a new skill
async function addSkill(req, res) {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Skill name is required"
      });
    }

    const skillName = name.trim();

    if (skillName.length > 100) {
      return res.status(400).json({
        message: "Skill name must be under 100 characters"
      });
    }

    const [result] = await pool.execute(
      "INSERT INTO skills (name) VALUES (?)",
      [skillName]
    );

    return res.status(201).json({
      message: "Skill added successfully",
      skill: {
        id: result.insertId,
        name: skillName
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This skill already exists"
      });
    }

    console.error("Add skill error:", error.message);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

module.exports = { getSkills, addSkill };