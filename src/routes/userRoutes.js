const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multerConfig")
const userController = require("../controllers/userController");
const AuthMiddleWare = require("../middlewares/AuthMiddleWare");

router.get("/get-uid", userController.getUID)
router.post("/upload-profileimage", AuthMiddleWare,upload.single("profileImage"), userController.uploadProfile)
router.get("/getusers/:uid", AuthMiddleWare, userController.getUsers)
router.put("/updateprofile", AuthMiddleWare, userController.updateUserProfile)

module.exports = router;