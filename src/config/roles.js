const allCapabilities = {
    showQr: "showQr",
    resetTimer: "resetTimer",
    listtUsers: "getUsers",
    manageUsers: "manageUsers",
};

const allRoles = {
    user: [],
    gate: [allCapabilities.showQr],
    manager: [allCapabilities.listtUsers, allCapabilities.resetTimer],
    admin: [
        allCapabilities.manageUsers,
        allCapabilities.listtUsers,
        allCapabilities.resetTimer,
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
