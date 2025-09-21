const express = require("express");
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { acctValidation } = require("../validations");
const myController = require("../controllers/my.controller");

const router = express.Router();

router
    .route("/")
    .get(auth(), myController.myTodayChecks)
    .put(
        auth(),
        validate(acctValidation.updateFCM_Token),
        myController.updateUserFCM
    );

module.exports = router;
