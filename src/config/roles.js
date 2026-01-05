const allCapabilities = {
    showQr: "showQr",
    listtUsers: "getUsers",
    manageUsers: "manageUsers",
};

const allRoles = {
    user: [],
    gate: [allCapabilities.showQr],
    manager: [allCapabilities.listtUsers],
    admin: [
        allCapabilities.manageUsers,
        allCapabilities.listtUsers,
    ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
    roles,
    roleRights,
    allRoles,
    allCapabilities,
};
