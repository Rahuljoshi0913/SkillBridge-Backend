
const express = require("express");
const {
  sendRequest,
  getReceivedRequests,
  updateRequestStatus
} = require("../controllers/collaborationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, sendRequest);
router.get("/received", authMiddleware, getReceivedRequests);
router.patch("/:id/status", authMiddleware, updateRequestStatus);

module.exports = router;
