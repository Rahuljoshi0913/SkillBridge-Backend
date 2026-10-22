
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.id) {
      return res.status(401).json({
        message: "Invalid token"
      });
    }

    const [users] = await pool.execute(
      "SELECT id, role FROM users WHERE id = ?",
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "User account not found"
      });
    }

    if (users[0].role !== "admin") {
      return res.status(403).json({
        message: "Admin access only"
      });
    }

    req.user = {
      id: users[0].id,
      role: users[0].role
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    console.error(
      "Admin authorization error:",
      error.message
    );

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

module.exports = requireAdmin;
