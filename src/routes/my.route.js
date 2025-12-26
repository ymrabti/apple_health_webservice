const express = require("express");
const auth = require("../middlewares/auth");
const myController = require("../controllers/my.controller");

const router = express.Router();

router
    .route("/")
    .get(auth(), myController.myTodayChecks);


module.exports = router;
