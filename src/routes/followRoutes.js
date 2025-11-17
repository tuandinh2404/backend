const express = require("express");
const router = express.Router();
const followController = require('../controllers/followController');
const AuthMiddleWare = require("../middlewares/AuthMiddleWare");

router.post('/follow/:userId', AuthMiddleWare, followController.followUser);
router.get('/relationship-status/:userId', AuthMiddleWare, followController.getRelationshipStatus);
router.delete('/unfollow/:userId', AuthMiddleWare, followController.unfollowUser);

module.exports = router;