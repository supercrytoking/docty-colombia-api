const Model = require('../../models');

module.exports = {
    auth(req, res, next) {

        const token = req.headers.auth_token;
        const lang = req.headers.lang || 'en';
        req.lang = lang;
        const query = `SELECT users.id id, users.phone_number phone_number, users.email email, users.first_name AS first_name, CONCAT(first_name,' ',last_name) AS fullname, user_roles.role_id AS role FROM tokens
        JOIN users ON users.id = tokens.user_id 
        JOIN user_roles ON user_roles.user_id = users.id
        WHERE token = '${token}' AND login_as = '${0}' and expired_at > NOW()`;
        Model.sequelize.query(query).spread((responce, meta) => {
            if (responce) {
                let expiredAt = new Date();
                const minuts = expiredAt.getMinutes();
                let expitedAt1 = new Date(expiredAt.setMinutes(minuts + 30));
                Model.token.update({ expiredAt: expitedAt1 }, { where: { token: token } })
                const user = responce[0];
                if (user) {
                    req.user = user;
                    return next();
                }
            }
            res.sendStatus(406);
            // auth_family(req, res, next);
        }).catch(err => {
            res.status(406).send(err)
        })

    },
    interceptor(req, res, next) {
        // const token = req.headers.auth_token;
        const lang = req.headers.lang || 'en';
        req.lang = lang;
        // const query = `SELECT users.id id, users.phone_number phone_number, users.email email, users.first_name AS first_name, CONCAT(first_name,' ',last_name) AS fullname, user_roles.role_id AS role FROM tokens
        // JOIN users ON users.id = tokens.user_id 
        // JOIN user_roles ON user_roles.user_id = users.id
        // WHERE token = '${token}'`//  and expired_at > NOW()`;
        return next();

        // Model.sequelize.query(query).spread((responce, meta) => {
        // if (responce) {
        //     const user = responce[0];
        //     if (user) {
        //         req.user = user;
        //         return next();
        //     }
        // }
        //     return next();
        // }).catch(err => {
        //     res.status(406).send(err)
        // })

    }
}