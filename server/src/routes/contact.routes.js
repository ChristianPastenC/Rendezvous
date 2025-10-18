// routes/contact.routes.js
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get("/", authMiddleware, contactController.getContacts);

module.exports = router;