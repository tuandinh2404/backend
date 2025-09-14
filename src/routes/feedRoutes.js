const express = require("express");
const router = express.Router();
const feedController = require("../controllers/feedController")

router.post("/posts", feedController.Posts)
router.get("/posts/:postId", feedController.getPosts)
module.exports = router