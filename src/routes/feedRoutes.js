const express = require("express");
const router = express.Router();
const feedController = require("../controllers/feedController")
const AuthMiddleWare = require("../middlewares/AuthMiddleWare");

router.post("/posts", AuthMiddleWare, feedController.Posts)
router.get("/posts/:postId", AuthMiddleWare, feedController.getPosts)
module.exports = router;