// routes/group.routes.js
const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get("/", authMiddleware, groupController.getUserGroups);
router.post("/", authMiddleware, groupController.createGroup);
router.get("/:groupId/channels", authMiddleware, groupController.getGroupChannels);
router.get("/:groupId/channels/:channelId/messages", authMiddleware, groupController.getChannelMessages);
router.get("/:groupId/members", authMiddleware, groupController.getGroupMembers);
router.post("/:groupId/members", authMiddleware, groupController.addMemberToGroup);

module.exports = router;