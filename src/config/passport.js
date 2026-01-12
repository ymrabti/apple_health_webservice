const { Strategy, ExtractJwt } = require("passport-jwt");
const config = require("./config");
const { tokenTypes } = require("./tokens");
const jwt = require("jsonwebtoken");
const { Strategy: CookieStrategy } = require("passport-cookie");
const { usersModel } = require("../models/database");
const logger = require("./logger");

const cookieOptions = {
    cookieName: config.cookie.access_token_name,
    signed: true,
};


const jwtOptions = {
    secretOrKey: config.jwt.secret,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};
const jwtSocketOptions = {
    secretOrKey: config.jwt.secret,
    jwtFromRequest: ExtractJwt.fromUrlQueryParameter("token"),
};
const jwtSocketHeadersOptions = {
    secretOrKey: config.jwt.secret,
    jwtFromRequest: ExtractJwt.fromUrlQueryParameter("token"),
};


const jwtVerify = async (payload, done) => {
    try {
        if (payload.type !== tokenTypes.ACCESS) {
            throw new Error("Invalid token type");
        }
        const user = await usersModel.findByPk(payload.sub, {
            attributes: [
                "id",
                "email",
                "role",
                "userName",
                "firstName",
                "lastName",
            ],
        });
        if (!user) {
            return done(null, false);
        }
        done(null, user.dataValues);
    } catch (error) {
        done(error, false);
    }
};

/**
 * Cookie verify callback - manually decodes JWT from cookie value
 * Unlike passport-jwt, passport-cookie passes raw cookie value
 */
const cookieVerify = async (token, done) => {
    try {
        const payload = jwt.verify(token, config.jwt.secret);
        if (payload.type !== tokenTypes.ACCESS) {
            throw new Error("Invalid token type");
        }
        const user = await usersModel.findByPk(payload.sub, {
            attributes: [
                "id",
                "email",
                "role",
                "userName",
                "firstName",
                "lastName",
            ],
        });
        if (!user) {
            return done(null, false);
        }
        done(null, user.dataValues);
    } catch (error) {
        done(error, false);
    }
};


const jwtStrategy = new Strategy(jwtOptions, jwtVerify);
const cookieStrategy = new CookieStrategy(cookieOptions, cookieVerify);
const jwtSocketStrategy = new Strategy(jwtSocketOptions, jwtVerify);
const jwtSocketHeadersStrategy = new Strategy(
    jwtSocketHeadersOptions,
    jwtVerify
);

module.exports = {
    jwtStrategy,
    cookieStrategy,
    jwtSocketStrategy,
    jwtSocketHeadersStrategy,
};
