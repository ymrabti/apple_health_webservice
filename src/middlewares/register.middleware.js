const Joi = require("joi");
const httpStatus = require("http-status");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const uuidv4 = require("uuid").v4;
const { copyFile, unlink } = require("fs/promises");
const { IncomingForm } = require("formidable");
const { Request, Response, NextFunction } = require("express");
const { resolve, join, parse } = require("path");
const { uploadService } = require("../services");
const { makeIfNorExists } = require("../services/upload.service");
const logger = require("../config/logger");
const sharp = require("sharp");

/**
 * Convert an image to WebP format with white background for transparency
 * @param {string} inputPath - Path to the input image
 * @param {string} outputPath - Path for the WebP output
 * @param {Object} options - Sharp options for WebP conversion
 * @returns {Promise<string>} - The output filename
 */
async function convertToWebP(inputPath, outputPath, options = { quality: 80 }) {
    await sharp(inputPath)
        .flatten({ background: { r: 255, g: 255, b: 255 } }) // Replace transparency with white
        .webp(options)
        .toFile(outputPath);
    return outputPath;
}

/**
 *
 * @param {Request} req request
 * @param {Response} res response
 * @param {NextFunction} next next
 * @returns
 */
async function registerMiddleware(req, res, next, validator) {
    const uploadDirectory = resolve(uploadService.pathUploads, "_temp_");
    makeIfNorExists(uploadDirectory);

    let fileName;
    const form = new IncomingForm({
        uploadDir: uploadDirectory,
        keepExtensions: true,
        multiples: true,
        filename: (_name, extension) => {
            const fn = `${uuidv4()}${extension}`;
            fileName = fn;
            return fn;
        },
        createDirsFromUploads: true,
    });

    const validSchema = pick(validator, ["params", "query", "body", "files"]);

    try {
        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve([fields, files]);
            });
        });

        // Merge parsed fields with req.body
        const ffields = {};
        for (const key in fields) {
            if (Object.prototype.hasOwnProperty.call(fields, key)) {
                ffields[key] = Array.isArray(fields[key])
                    ? fields[key][0]
                    : fields[key];
            }
        }

        req.body = { ...req.body, ...ffields, photo: fileName };

        const object = {
            ...pick(req, Object.keys(validSchema)),
        };

        const { value, error } = Joi.compile(validSchema)
            .prefs({ errors: { label: "key" }, abortEarly: false })
            .validate(object);

        if (error) {
            logger.error(error);
            const errorMessage = error.details
                .map((details) => details.message)
                .join(", ");
            return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
        }

        const tmpPath = join(uploadDirectory, fileName);

        // Convert image to WebP format
        const parsedName = parse(fileName);
        const webpFileName = `${parsedName.name}.webp`;
        const webpTmpPath = join(uploadDirectory, webpFileName);

        try {
            await convertToWebP(tmpPath, webpTmpPath, {
                quality: 80,
            });
            // Remove original temp file after conversion
            await unlink(tmpPath).catch((err) =>
                logger.error("Error removing temp file:", err)
            );
        } catch (conversionError) {
            logger.error("Error converting to WebP:", conversionError);
            // Fall back to original file if conversion fails
        }

        const finalFileName = webpFileName;
        req.body.photo = finalFileName;
        value.body.photo = finalFileName;
        logger.info(`Final profile picture filename: ${finalFileName}`);
        logger.info(
            `Storing profile picture for user: ${JSON.stringify(req.body)}`
        );

        const newPath = resolve(
            uploadService.pathUploads,
            req.body.userName,
            finalFileName
        );
        const webpSourcePath = join(uploadDirectory, finalFileName);

        makeIfNorExists(newPath);

        // Copy the file to destination (more reliable than fs.rename across drives)
        await copyFile(webpSourcePath, newPath);
        // Remove temp file after copy
        await unlink(webpSourcePath).catch((err) =>
            logger.error("Error removing temp webp file:", err)
        );
        Object.assign(req, value);
        req.file = files;
        next();
    } catch (err) {
        logger.error(err);
        next(
            new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                "Error processing form data"
            )
        );
    }
}

const createMiddleware = (validator) => (req, res, next) => {
    return registerMiddleware(req, res, next, validator);
};

module.exports = createMiddleware;
