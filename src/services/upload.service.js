const { existsSync, mkdirSync } = require('fs');
const { extname, resolve, dirname } = require('path');

const uuidv4 = require('uuid').v4;
const multer = require('multer');
const config = require('../config/config');

/**
 * 
 * @param {string} destination destination path
 */
function makeIfNorExists(destination) {
    console.log(dirname(destination));
    if (!existsSync(dirname(destination))) {
        mkdirSync(dirname(destination), { recursive: true });
        console.log('Folder created successfully!');
    }
}

const pathUploads = resolve(config.DEPLOY_ENV == 'Docker' ? '/usr/src/health' : 'static');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const destination = resolve(pathUploads, req.params.username)
        makeIfNorExists(resolve(destination, file.originalname));
        cb(null, destination);

    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = { upload, pathUploads, makeIfNorExists }