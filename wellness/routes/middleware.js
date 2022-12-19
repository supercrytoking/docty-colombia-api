const Model = require('../../models');
var atob = require('atob');


function adminCheck(token) {
    const query = `SELECT admins.id id, admins.phone_number phone_number, admins.email email, admins.first_name AS first_name,admins.isSuper, admins.role FROM admin_tokens
    JOIN admins ON admins.id = admin_tokens.user_id
    LEFT JOIN (
    SELECT role_id FROM role_permissions rp, permissions p WHERE rp.permission_id = p.id AND p.url = "/wellness-module"
    ) AS rl ON rl.role_id = admins.role
    WHERE token = "${token}"
    AND (admins.isSuper OR rl.role_id)`
    return Model.sequelize.query(query).spread((responce, meta) => responce[0]).catch(e => null)
}

async function clientCheck(token) {
    const query = `SELECT users.id id, users.phone_number phone_number, users.email email, users.first_name AS first_name, 
    CONCAT(first_name,' ',last_name) AS fullname, user_roles.role_id AS role FROM tokens
        JOIN users ON users.id = tokens.user_id 
        JOIN user_roles ON user_roles.user_id = users.id
        WHERE token = '${token}' AND login_as = '${0}' and expired_at > NOW()`;
    return Model.sequelize.query(query).spread((responce, meta) => responce[0]).catch(e => null)
}

module.exports = {
    async auth(req, res, next) {
        try {
            const token = req.headers.auth_token;
            if (token == null || token == 'null') {
                return res.sendStatus(406);
            }
            const lang = req.headers.lang || 'en';
            req.lang = lang;
            let data = JSON.parse(atob(token))
            let user = null;
            if (data && data.group == 'admin') {
                user = await adminCheck(token)
            }
            if (data && data.group == 'client') {
                user = await clientCheck(token);
            }
            if (!!!user) {
                return res.sendStatus(406);
            }
            let expiredAt = new Date();
            const minuts = expiredAt.getMinutes();
            let expitedAt1 = new Date(expiredAt.setMinutes(minuts + 30));
            Model.token.update({ expiredAt: expitedAt1 }, { where: { token: token } });
            req.user = { ...user, group: data.group }
            return next();
        } catch (error) {
            return res.sendStatus(406);
        }
    },
};