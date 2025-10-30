const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController")

router.post("/refresh-token", authController.refreshToken)
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/check-email", authController.checkEmail);
router.post("/check-uid", authController.checkUid);
router.post("/check-email-login", authController.checkEmailLogin);
router.post("/logout", authController.LogOut);

module.exports = router