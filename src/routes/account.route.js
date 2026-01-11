const express = require("express");
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const accValidation = require("../validations/account.validation");
const accController = require("../controllers/account.controller");
const { uploadService } = require("../services");

const router = express.Router();

router.use(auth());

router
    .route("/")
    .get(accController.getAccount)
    .patch(validate(accValidation.updateAccount), accController.updateAccount);

router
    .route("/photo")
    .post(
        uploadService.upload.single("photo"),
        accController.updateProfilePicture
    )
    .get(validate(accValidation.getUserPhoto), accController.getUserPhoto);

module.exports = router;
