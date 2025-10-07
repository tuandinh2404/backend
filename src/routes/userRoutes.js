const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multerConfig")
const userController = require("../controllers/userController");
const AuthMiddleWare = require("../middlewares/AuthMiddleWare");

router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/check-email", userController.checkEmail);
router.post("/check-uid", userController.checkUid);
router.post("/check-email-login", userController.checkEmailLogin);
router.post("/logout", userController.LogOut);
router.get("/get-uid", userController.getUID)
router.post("/upload-profile", upload.single("profileImage"), userController.uploadProfile)
router.get("/getusers/:uid", AuthMiddleWare, userController.getUsers)

module.exports = router;