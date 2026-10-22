const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const requireAdmin = require("../middleware/requireAdmin");

router.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT COUNT(*) AS total FROM users"
    );

    const [skills] = await pool.query(
      "SELECT COUNT(*) AS total FROM skills"
    );

    const [projects] = await pool.query(
      "SELECT COUNT(*) AS total FROM projects"
    );

    res.json({
      message: "Welcome to SkillBridge Admin Dashboard",
      adminId: req.user.id,
      stats: {
        totalUsers: users[0].total,
        totalSkills: skills[0].total,
        totalProjects: projects[0].total,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error.message);
    res.status(500).json({
      message: "Unable to load admin dashboard statistics",
    });
  }
});

// Get all users (Admin only)
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, email, role
       FROM users
       ORDER BY id DESC`
    );

    res.json({
      message: "Users fetched successfully",
      totalUsers: users.length,
      users,
    });
  } catch (error) {
    console.error("Fetch users error:", error.message);

    res.status(500).json({
      message: "Unable to fetch users",
    });
  }
});
// Get all skills (Admin only)
router.get("/skills", requireAdmin, async (req, res) => {
  try {
    const [skills] = await pool.query(
      "SELECT * FROM skills ORDER BY id DESC"
    );

    res.json({
      message: "Skills fetched successfully",
      totalSkills: skills.length,
      skills,
    });
  } catch (error) {
    console.error("Fetch skills error:", error.message);

    res.status(500).json({
      message: "Unable to fetch skills",
    });
  }
});


/* Add skill (Admin only) */
router.post("/skills", requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Skill name is required",
      });
    }

    const skillName = name.trim();

    const [result] = await pool.query(
      "INSERT INTO skills (name) VALUES (?)",
      [skillName]
    );

    res.status(201).json({
      message: "Skill added successfully",
      skill: {
        id: result.insertId,
        name: skillName,
      },
    });
  } catch (error) {
    console.error("Add skill error:", error.message);

    res.status(500).json({
      message: "Unable to add skill",
    });
  }
});


/* Delete skill (Admin only) */
router.delete("/skills/:id", requireAdmin, async (req, res) => {
  try {
    const skillId = Number(req.params.id);

    if (!Number.isInteger(skillId) || skillId <= 0) {
      return res.status(400).json({
        message: "Invalid skill ID",
      });
    }

    const [result] = await pool.query(
      "DELETE FROM skills WHERE id = ?",
      [skillId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Skill not found",
      });
    }

    res.json({
      message: "Skill deleted successfully",
      deletedSkillId: skillId,
    });
  } catch (error) {
    console.error("Delete skill error:", error.message);

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message: "This skill is linked to other records and cannot be deleted.",
      });
    }

    res.status(500).json({
      message: "Unable to delete skill",
    });
  }
});


/* Edit skill (Admin only) */
router.put("/skills/:id", requireAdmin, async (req, res) => {
  try {
    const skillId = Number(req.params.id);
    const { name } = req.body;

    if (!Number.isInteger(skillId) || skillId <= 0) {
      return res.status(400).json({
        message: "Invalid skill ID",
      });
    }

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Skill name is required",
      });
    }

    const skillName = name.trim();

    const [result] = await pool.query(
      "UPDATE skills SET name = ? WHERE id = ?",
      [skillName, skillId]
    );

    if (result.affectedRows === 0) {
      const [rows] = await pool.query(
        "SELECT id FROM skills WHERE id = ?",
        [skillId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message: "Skill not found",
        });
      }
    }

    return res.status(200).json({
      message: "Skill updated successfully",
      skill: {
        id: skillId,
        name: skillName,
      },
    });
  } catch (error) {
    console.error("Update skill error:", error.message);

    return res.status(500).json({
      message: "Unable to update skill",
    });
  }
});




router.get("/projects", requireAdmin, async (req, res) => {
  try {
    const [projects] = await pool.query(
      "SELECT * FROM projects ORDER BY id DESC"
    );

    res.json({
      message: "Projects fetched successfully",
      totalProjects: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Fetch projects error:", error.message);

    res.status(500).json({
      message: "Unable to fetch projects",
    });
  }
});

/* Add project (Admin only) */
router.post("/projects", requireAdmin, async (req, res) => {
  try {
    const {
      user_id,
      title,
      description,
      required_skills,
      status,
    } = req.body;

    if (!user_id || !Number.isInteger(Number(user_id))) {
      return res.status(400).json({
        message: "Valid user ID is required",
      });
    }

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Project title is required",
      });
    }

    const allowedStatuses = [
      "open",
      "in_progress",
      "completed",
    ];

    const projectStatus = status || "open";

    if (!allowedStatuses.includes(projectStatus)) {
      return res.status(400).json({
        message: "Invalid project status",
      });
    }

    const [users] = await pool.query(
      "SELECT id FROM users WHERE id = ?",
      [Number(user_id)]
    );

    if (users.length === 0) {
      return res.status(400).json({
        message: "Selected user does not exist",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO projects
        (user_id, title, description, required_skills, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        Number(user_id),
        title.trim(),
        description?.trim() || null,
        required_skills?.trim() || null,
        projectStatus,
      ]
    );

    res.status(201).json({
      message: "Project added successfully",
      project: {
        id: result.insertId,
        user_id: Number(user_id),
        title: title.trim(),
        description: description?.trim() || null,
        required_skills: required_skills?.trim() || null,
        status: projectStatus,
      },
    });
  } catch (error) {
    console.error("Add project error:", error.message);

    res.status(500).json({
      message: "Unable to add project",
    });
  }
});


router.delete("/projects/:id", requireAdmin, async (req, res) => {
  try {
    const projectId = Number(req.params.id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const [result] = await pool.query(
      "DELETE FROM projects WHERE id = ?",
      [projectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    return res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);

    return res.status(500).json({
      message: "Unable to delete project",
    });
  }
});


router.put("/projects/:id", requireAdmin, async (req, res) => {
  try {
    const projectId = Number(req.params.id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const {
      title,
      description,
      required_skills,
      status,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Project title is required",
      });
    }

    if (title.trim().length > 200) {
      return res.status(400).json({
        message: "Project title cannot exceed 200 characters",
      });
    }

    if (
      status &&
      !["open", "in_progress", "completed"].includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid project status",
      });
    }

    if (
      required_skills &&
      required_skills.length > 500
    ) {
      return res.status(400).json({
        message: "Required skills cannot exceed 500 characters",
      });
    }

    const [result] = await pool.query(
      `UPDATE projects
       SET title = ?,
           description = ?,
           required_skills = ?,
           status = ?
       WHERE id = ?`,
      [
        title.trim(),
        description || null,
        required_skills || null,
        status || "open",
        projectId,
      ]
    );

    if (result.affectedRows === 0) {
      const [rows] = await pool.query(
        "SELECT id FROM projects WHERE id = ?",
        [projectId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message: "Project not found",
        });
      }
    }

    const [projects] = await pool.query(
      "SELECT * FROM projects WHERE id = ?",
      [projectId]
    );

    return res.status(200).json({
      message: "Project updated successfully",
      project: projects[0],
    });
  } catch (error) {
    console.error("Update project error:", error);

    return res.status(500).json({
      message: "Unable to update project",
    });
  }
});



/* Delete user (Admin only) */
router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    // Validate user ID
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    // Prevent admin from deleting their own account
    if (userId === Number(req.user.id)) {
      return res.status(400).json({
        message: "You cannot delete your own admin account",
      });
    }

    // Check whether the user exists
    const [users] = await pool.query(
      "SELECT id FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Delete the user
    const [result] = await pool.query(
      "DELETE FROM users WHERE id = ?",
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "User deleted successfully",
      deletedUserId: userId,
    });
  } catch (error) {
    console.error("Delete user error:", error.message);

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        message:
          "This user is linked to other records and cannot be deleted yet.",
      });
    }

    res.status(500).json({
      message: "Unable to delete user",
    });
  }
});


/* Get all collaboration requests (Admin only) */
router.get("/collaboration-requests", requireAdmin, async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT
         cr.id,
         cr.project_id,
         cr.requester_id,
         cr.message,
         cr.status,
         cr.created_at,
         u.name AS requester_name,
         u.email AS requester_email,
         p.title AS project_title
       FROM collaboration_requests cr
       LEFT JOIN users u ON cr.requester_id = u.id
       LEFT JOIN projects p ON cr.project_id = p.id
       ORDER BY cr.created_at DESC`
    );

    return res.status(200).json({
      message: "Collaboration requests fetched successfully",
      totalRequests: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Fetch collaboration requests error:", error.message);
    return res.status(500).json({
      message: "Unable to fetch collaboration requests",
    });
  }
});

/* Update collaboration request status (Admin only) */
router.put("/collaboration-requests/:id", requireAdmin, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        message: "Invalid collaboration request ID",
      });
    }

    if (!["pending", "accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be pending, accepted, or rejected",
      });
    }

    const [result] = await pool.query(
      "UPDATE collaboration_requests SET status = ? WHERE id = ?",
      [status, requestId]
    );

    if (result.affectedRows === 0) {
      const [rows] = await pool.query(
        "SELECT id FROM collaboration_requests WHERE id = ?",
        [requestId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          message: "Collaboration request not found",
        });
      }
    }

    return res.status(200).json({
      message: "Collaboration request status updated successfully",
      request: {
        id: requestId,
        status,
      },
    });
  } catch (error) {
    console.error("Update collaboration request error:", error.message);
    return res.status(500).json({
      message: "Unable to update collaboration request",
    });
  }
});

/* Delete collaboration request (Admin only) */
router.delete("/collaboration-requests/:id", requireAdmin, async (req, res) => {
  try {
    const requestId = Number(req.params.id);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        message: "Invalid collaboration request ID",
      });
    }

    const [result] = await pool.query(
      "DELETE FROM collaboration_requests WHERE id = ?",
      [requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Collaboration request not found",
      });
    }

    return res.status(200).json({
      message: "Collaboration request deleted successfully",
      deletedRequestId: requestId,
    });
  } catch (error) {
    console.error("Delete collaboration request error:", error.message);
    return res.status(500).json({
      message: "Unable to delete collaboration request",
    });
  }
});


module.exports = router;