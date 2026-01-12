const passport = require("passport");
const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const { roleRights } = require("../config/roles");
const logger = require("../config/logger");

const verifyCallback =
    (req, resolve, reject, requiredRights) => async (err, user, info) => {
        if (err || info || !user) {
            return reject(
                new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate")
            );
        }
        req.user = user;

        if (requiredRights.length) {
            const userRights = roleRights.get(user.role);
            const hasRequiredRights = requiredRights.every((requiredRight) =>
                userRights.includes(requiredRight)
            );
            if (!hasRequiredRights && req.params.userId !== user.id) {
                return reject(new ApiError(httpStatus.FORBIDDEN, "Forbidden"));
            }
        }

        resolve();
    };

const auth =
    (...requiredRights) =>
    async (req, res, next) => {
        return new Promise((resolve, reject) => {
            passport.authenticate(
                "jwt",
                { session: false },
                verifyCallback(req, resolve, reject, requiredRights)
            )(req, res, next);
        })
            .then(() => next())
            .catch((err) => next(err));
    };

const authCombined =
    (...requiredRights) =>
    async (req, res, next) => {
        const tryAuth = (strategy) =>
            new Promise((resolve, reject) => {
                passport.authenticate(
                    strategy,
                    { session: false },
                    verifyCallback(req, resolve, reject, requiredRights)
                )(req, res, next);
            });

        try {
            await tryAuth("jwt");
            return next(); // JWT succeeded
        } catch (errJwt) {
            try {
                await tryAuth("cookie");
                return next();
            } catch (errCookie) {
                return next(errCookie || errJwt);
            }
        }
    };

module.exports = authCombined;
