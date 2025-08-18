const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imageController")

router.get("/images", imageController.Images)
router.get("/get-images/:uid", imageController.ImagesUid)
module.exports = router