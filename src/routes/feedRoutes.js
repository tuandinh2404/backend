const express = require("express");
const router = express.Router();
const multer = require("multer");


const upload = multer();
const feedController = require("../controllers/feedController")
const AuthMiddleWare = require("../middlewares/AuthMiddleWare");

router.post("/posts", AuthMiddleWare, upload.array("media"), feedController.Posts)
router.get("/posts", AuthMiddleWare, feedController.getAllPosts)
router.get("/posts/:postId", AuthMiddleWare, feedController.getPosts)
// router.delete("/posts/:postId", AuthMiddleWare, feedController.DeletePost)
router.post("/posts/:postId/like", AuthMiddleWare, feedController.toggleLike)
module.exports = router;