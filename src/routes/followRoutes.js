const followController = require('../controllers/followController');
const express = require('express');
const router = express.Router();
const authController = require("../controllers/authController")

router.post('/follow/:userId', authController, followController.followUser);

module.exports = router;