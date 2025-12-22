const { Strategy, ExtractJwt } = require("passport-jwt");
const config = require("./config");
const { tokenTypes } = require("./tokens");
const { Strategy: CookieStrategy } = require("passport-cookie");
const { usersModel } = require("../models/database");

const cookieOptions = {
    cookieName: config.cookie.access_token_name,
    secretOrKey: config.jwt.secret,
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
const qrBodyOptions = {
    secretOrKey: config.jwt.secret,
    jwtFromRequest: ExtractJwt.fromBodyField("Qr"),
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
                "fcm",
                "username",
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

const qrVerify = async (payload, done) => {
    try {
        if (payload.type !== tokenTypes.QR) {
            throw new Error("Invalid Qr Code");
        }
        const user = await usersModel.findByPk(payload.sub, {
            attributes: [
                "id",
                "email",
                "role",
                "fcm",
                "username",
                "firstName",
                "lastName",
            ],
        });
        if (!user) {
            return done(null, false, null);
        }
        done(null, user.dataValues, payload.qr_id);
    } catch (error) {
        done(error, false, null);
    }
};

const jwtStrategy = new Strategy(jwtOptions, jwtVerify);
const cookieStrategy = new CookieStrategy(cookieOptions, jwtVerify);
const jwtSocketStrategy = new Strategy(jwtSocketOptions, jwtVerify);
const jwtSocketHeadersStrategy = new Strategy(
    jwtSocketHeadersOptions,
    jwtVerify
);
const qrAuthFromBodyStrategy = new Strategy(qrBodyOptions, qrVerify);

module.exports = {
    jwtStrategy,
    cookieStrategy,
    jwtSocketStrategy,
    jwtSocketHeadersStrategy,
    qrAuthFromBodyStrategy,
};
