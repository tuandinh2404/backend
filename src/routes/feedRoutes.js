const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer()
const feedController = require("../controllers/feedController")
const AuthMiddleWare = require("../middlewares/AuthMiddleWare");
const multer = require("multer");

router.post("/posts", AuthMiddleWare, upload.array("media"), feedController.Posts)
router.get("/posts/:postId", AuthMiddleWare, feedController.getPosts)
module.exports = router;