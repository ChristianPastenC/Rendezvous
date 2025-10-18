// routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware } = require('../middleware/authMiddleware');

router.put("/profile", authMiddleware, userController.updateUserProfile);
router.delete("/me", authMiddleware, userController.deleteAccount);
router.get("/search", authMiddleware, userController.searchUsers);
router.get("/:uid/key", authMiddleware, userController.getUserPublicKey);
router.get("/dms/:conversationId/messages", authMiddleware, userController.getDmMessages);

module.exports = router;