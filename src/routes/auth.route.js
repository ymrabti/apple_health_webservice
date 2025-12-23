const express = require("express");
const validate = require("../middlewares/validate");
const authValidation = require("../validations/auth.validation");
const authController = require("../controllers/auth.controller");
const auth = require("../middlewares/auth");
const createMiddleware = require("../middlewares/register.middleware");

const router = express.Router();

router.post(
    "/signup",
    createMiddleware(authValidation.register),
    authController.register
);
router.post("/signin", validate(authValidation.login), authController.login);
router.post("/logout", validate(authValidation.logout), authController.logout);
router.post(
    "/refresh-tokens",
    validate(authValidation.refreshTokens),
    authController.refreshTokens
);
router.post(
    "/change-password",
    validate(authValidation.changePassword),
    auth(),
    authController.changePassword
);
//
router.post(
    "/send-reset-password-otp",
    validate(authValidation.forgotPassword),
    authController.sendOTP
);
//
router.post(
    "/reset-password",
    validate(authValidation.resetPassword),
    authController.resetPassword
);
//
router.post(
    "/send-verification-email",
    auth(),
    authController.sendVerificationEmail
);
router.post(
    "/verify-email",
    validate(authValidation.verifyEmail),
    authController.verifyEmail
);

// OAuth callback to authenticate Python client and return a JWT via redirect
// Example: GET /api/Auth/OAuth/callback/authenticate?redirect=http://127.0.0.1:8765/callback
router.get(
    "/OAuth/callback/authenticate",
    auth(),
    authController.oauthCallbackAuthenticate
);

module.exports = router;
