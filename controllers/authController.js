
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const transporter = require("../config/email");

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    if (typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string") {
      return res.status(400).json({
        message: "All fields must be text"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email"
      });
    }

    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Email is already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password)
       VALUES (?, ?, ?)`,
      [name.trim(), normalizedEmail, hashedPassword]
    );

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: result.insertId,
        name: name.trim(),
        email: normalizedEmail
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Email is already registered"
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await pool.execute(
      `SELECT id, name, email, password, role
       FROM users WHERE email = ?`,
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const user = users[0];

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = require("jsonwebtoken").sign(
      {
        id: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Please enter your email"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await pool.execute(
      "SELECT id, email FROM users WHERE email = ?",
      [normalizedEmail]
    );

    // Same response whether the email exists or not.
    const message =
      "If an account exists with this email, a reset link will be sent.";

    if (users.length === 0) {
      return res.status(200).json({ message });
    }

    const user = users[0];

    // Generate a random token; store only its SHA-256 hash.
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    await pool.execute(
      "DELETE FROM password_resets WHERE user_id = ?",
      [user.id]
    );

    await pool.execute(
      `INSERT INTO password_resets
       (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [user.id, tokenHash]
    );

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl || !process.env.EMAIL_USER ||
        !process.env.EMAIL_APP_PASSWORD) {
      throw new Error("Email configuration is missing");
    }

    const resetLink =
      `${frontendUrl}/reset-password?token=${resetToken}`;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "SkillBridge Password Reset",
      text:
        `You requested a password reset for SkillBridge.\n\n` +
        `Open this link within 15 minutes:\n${resetLink}\n\n` +
        `If you did not request this, ignore this email.`
    });
    console.log("Email accepted:", info.accepted);
    console.log("Email rejected:", info.rejected);
    console.log("Message ID:", info.messageId);
    

    return res.status(200).json({ message });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    return res.status(500).json({
      message: "Unable to process the request right now"
    });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "A valid token and password of at least 8 characters are required"
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const [resets] = await pool.execute(
      `SELECT id, user_id FROM password_resets
       WHERE token_hash = ? AND expires_at > NOW()`,
      [tokenHash]
    );

    if (resets.length === 0) {
      return res.status(400).json({
        message: "Reset link is invalid, expired, or already used"
      });
    }

    const reset = resets[0];
    const hashedPassword = await bcrypt.hash(password, 12);

    // Recheck validity while updating to prevent reusing an expired token.
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [validTokens] = await connection.execute(
        `SELECT id FROM password_resets
         WHERE id = ? AND token_hash = ? AND expires_at > NOW()
         FOR UPDATE`,
        [reset.id, tokenHash]
      );

      if (validTokens.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          message: "Reset link is invalid, expired, or already used"
        });
      }

      await connection.execute(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, reset.user_id]
      );

      await connection.execute(
        "DELETE FROM password_resets WHERE user_id = ?",
        [reset.user_id]
      );

      await connection.commit();

      return res.status(200).json({
        message: "Password reset successful. Please log in with your new password."
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Reset password error:", error.message);
    return res.status(500).json({
      message: "Unable to reset password right now"
    });
  }
}


module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword
};

