const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const healthImportRoute = require('./health.route');
const config = require('../config/config');
const authCombined = require('../middlewares/auth');

const router = express.Router();

const defaultRoutes = [
    {
        path: '/auth',
        route: authRoute,
    },
    {
        path: '/users',
        route: userRoute,
    },
    {
        path: '/apple-health',
        route: healthImportRoute,
    },
];

const devRoutes = [
    // routes available only in development mode
    {
        path: '/docs',
        route: docsRoute,
    },
];

defaultRoutes.forEach((route) => {
    router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
    devRoutes.forEach((route) => {
        router.use(route.path, route.route);
    });
}

router.get('/health', authCombined(), (req, res) => res.send('OK'));

module.exports = router;
