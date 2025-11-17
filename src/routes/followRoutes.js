const express = require("express");
const router = express.Router();
const followController = require('../controllers/followController');
const AuthMiddleWare = require("../middlewares/AuthMiddleWare");

router.post('/follow/:userId', AuthMiddleWare, followController.followUser);

module.exports = router;