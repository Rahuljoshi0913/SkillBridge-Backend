
const pool = require("../config/db");

// Send collaboration request
async function sendRequest(req, res) {
  try {
    const { project_id, message } = req.body;
    const requester_id = req.user.id;

    if (!project_id || !Number.isInteger(Number(project_id))) {
      return res.status(400).json({
        message: "Valid project ID is required"
      });
    }

    const [projects] = await pool.execute(
      "SELECT id, user_id FROM projects WHERE id = ?",
      [Number(project_id)]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        message: "Project not found"
      });
    }

    if (Number(projects[0].user_id) === Number(requester_id)) {
      return res.status(400).json({
        message: "You cannot request to join your own project"
      });
    }

    const [existing] = await pool.execute(
      `SELECT id FROM collaboration_requests
       WHERE project_id = ? AND requester_id = ?`,
      [Number(project_id), requester_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        message: "You have already requested this project"
      });
    }

    const requestMessage =
      typeof message === "string" ? message.trim() : "";

    const [result] = await pool.execute(
      `INSERT INTO collaboration_requests
       (project_id, requester_id, message, status)
       VALUES (?, ?, ?, 'pending')`,
      [Number(project_id), requester_id, requestMessage]
    );

    return res.status(201).json({
      message: "Collaboration request sent successfully",
      request: {
        id: result.insertId,
        project_id: Number(project_id),
        requester_id,
        message: requestMessage,
        status: "pending"
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "You have already requested this project"
      });
    }

    console.error("Send request error:", error.message);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

// View requests received for projects owned by the logged-in user
async function getReceivedRequests(req, res) {
  try {
    const [requests] = await pool.execute(
      `SELECT cr.id, cr.project_id, cr.requester_id,
              cr.message, cr.status, cr.created_at,
              p.title AS project_title,
              u.name AS requester_name
       FROM collaboration_requests cr
       JOIN projects p ON p.id = cr.project_id
       JOIN users u ON u.id = cr.requester_id
       WHERE p.user_id = ?
       ORDER BY cr.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({ requests });
  } catch (error) {
    console.error("Get requests error:", error.message);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

// Accept or reject a collaboration request
async function updateRequestStatus(req, res) {
  try {
    const requestId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({
        message: "Invalid request ID"
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be accepted or rejected"
      });
    }

    const [requests] = await pool.execute(
      `SELECT cr.id, cr.status, p.user_id
       FROM collaboration_requests cr
       JOIN projects p ON p.id = cr.project_id
       WHERE cr.id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        message: "Collaboration request not found"
      });
    }

    if (Number(requests[0].user_id) !== Number(req.user.id)) {
      return res.status(403).json({
        message: "You can only manage requests for your own projects"
      });
    }

    if (requests[0].status !== "pending") {
      return res.status(400).json({
        message: "This request has already been reviewed"
      });
    }

    await pool.execute(
      "UPDATE collaboration_requests SET status = ? WHERE id = ?",
      [status, requestId]
    );

    return res.status(200).json({
      message: `Request ${status} successfully`,
      request: { id: requestId, status }
    });
  } catch (error) {
    console.error("Update request error:", error.message);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

module.exports = {
  sendRequest,
  getReceivedRequests,
  updateRequestStatus
};
