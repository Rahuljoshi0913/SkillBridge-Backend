const pool = require("../config/db");

// Create a project
async function createProject(req, res) {
  try {
    const { title, description, required_skills } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Project title is required"
      });
    }

    if (title.trim().length > 200) {
      return res.status(400).json({
        message: "Title must be 200 characters or less"
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        message: "Description must be text"
      });
    }

    if (
      required_skills !== undefined &&
      required_skills !== null &&
      typeof required_skills !== "string"
    ) {
      return res.status(400).json({
        message: "Required skills must be text"
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO projects
       (user_id, title, description, required_skills)
       VALUES (?, ?, ?, ?)`,
      [
        req.user.id,
        title.trim(),
        description?.trim() || null,
        required_skills?.trim() || null
      ]
    );

    return res.status(201).json({
      message: "Project created successfully",
      project: {
        id: result.insertId,
        user_id: req.user.id,
        title: title.trim(),
        description: description?.trim() || null,
        required_skills: required_skills?.trim() || null,
        status: "open"
      }
    });
  } catch (error) {
    console.error("Create project error:", error.message);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

// Get all projects
async function getProjects(req, res) {
  try {
    const [projects] = await pool.execute(
      `SELECT p.id, p.title, p.description, p.required_skills,
              p.status, p.created_at, p.user_id, u.name AS owner_name
       FROM projects p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC`
    );

    return res.status(200).json({
      message: "Projects fetched successfully",
      projects
    });
  } catch (error) {
    console.error("Get projects error:", error.message);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}
async function getProjectById(req, res) {
  try {
    const projectId = Number(req.params.id);

    if (!Number.isSafeInteger(projectId) || projectId < 1) {
      return res.status(400).json({
        message: "Invalid project ID"
      });
    }

    const [projects] = await pool.execute(
      `SELECT p.id, p.title, p.description, p.required_skills,
              p.status, p.created_at, p.user_id, u.name AS owner_name
       FROM projects p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [projectId]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    return res.status(200).json({
      message: "Project fetched successfully",
      project: projects[0]
    });
  } catch (error) {
    console.error("Get project error:", error.message);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

async function updateProject(req, res) {
  try {
    const projectId = Number(req.params.id);
    const { title, description, required_skills, status } = req.body;

    if (!Number.isSafeInteger(projectId) || projectId < 1) {
      return res.status(400).json({
        message: "Invalid project ID"
      });
    }

    if (
      (title !== undefined &&
        (typeof title !== "string" ||
          !title.trim() ||
          title.trim().length > 200)) ||
      (description !== undefined &&
        description !== null &&
        typeof description !== "string") ||
      (required_skills !== undefined &&
        required_skills !== null &&
        typeof required_skills !== "string") ||
      (status !== undefined &&
        !["open", "in_progress", "completed"].includes(status))
    ) {
      return res.status(400).json({
        message: "Invalid project fields"
      });
    }

    if (
      title === undefined &&
      description === undefined &&
      required_skills === undefined &&
      status === undefined
    ) {
      return res.status(400).json({
        message: "Provide at least one field to update"
      });
    }

    const [projects] = await pool.execute(
      "SELECT id, user_id FROM projects WHERE id = ?",
      [projectId]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    if (projects[0].user_id !== req.user.id) {
      return res.status(403).json({
        message: "You can update only your own projects"
      });
    }

    const fields = [];
    const values = [];

    if (title !== undefined) {
      fields.push("title = ?");
      values.push(title.trim());
    }

    if (description !== undefined) {
      fields.push("description = ?");
      values.push(description === null ? null : description.trim());
    }

    if (required_skills !== undefined) {
      fields.push("required_skills = ?");
      values.push(
        required_skills === null ? null : required_skills.trim()
      );
    }

    if (status !== undefined) {
      fields.push("status = ?");
      values.push(status);
    }

    values.push(projectId);

    await pool.execute(
      `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    const [updatedProjects] = await pool.execute(
      `SELECT id, title, description, required_skills,
              status, created_at, user_id
       FROM projects WHERE id = ?`,
      [projectId]
    );

    return res.status(200).json({
      message: "Project updated successfully",
      project: updatedProjects[0]
    });
  } catch (error) {
    console.error("Update project error:", error.message);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

async function deleteProject(req, res) {
  try {
    const projectId = Number(req.params.id);

    if (!Number.isSafeInteger(projectId) || projectId < 1) {
      return res.status(400).json({
        message: "Invalid project ID"
      });
    }

    const [projects] = await pool.execute(
      "SELECT id, user_id FROM projects WHERE id = ?",
      [projectId]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    if (projects[0].user_id !== req.user.id) {
      return res.status(403).json({
        message: "You can delete only your own projects"
      });
    }

    await pool.execute(
      "DELETE FROM projects WHERE id = ?",
      [projectId]
    );

    return res.status(200).json({
      message: "Project deleted successfully"
    });
  } catch (error) {
    console.error("Delete project error:", error.message);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
};
