const Model = require('../../models');

module.exports = {
    auth(req, res, next) {

        var token = req.headers.auth_token;
        if(req.query && req.query.token) {
            token = req.query.token;
        }
        const query = `SELECT admins.id id, admins.phone_number phone_number, admins.email email, admins.first_name as first_name FROM admin_tokens
        join admins on admins.id = admin_tokens.user_id
        WHERE token = '${token}'`//  and expired_at > NOW()`;
        // res.send(token)
        Model.sequelize.query(query).spread((responce, meta) => {
            try {
                if (responce && responce.length) {
                    const user = responce[0];
                    if (user) {
                        req.user = user;
                        return next();
                    }
                }else{
                    return res.sendStatus(406);
                }
            } catch (error) {
                return res.sendStatus(406).send(error);
            }

        }).catch(err => {
            res.status(406).send(err)
        })
    },
    interceptor(req, res, next) {
        const token = req.headers.auth_token;
        const query = `SELECT users.id id, users.phone_number phone_number, users.email email, users.first_name as first_name FROM tokens
        join users on users.id = tokens.user_id
        WHERE token = '${token}'`//  and expired_at > NOW()`;
        Model.sequelize.query(query).spread((responce, meta) => {
            if (responce) {
                const user = responce[0];
                if (user) {
                    req.user = user;
                    return next();
                }
            }
            return next()
        }).catch(err => {
            res.status(406).send(err)
        })

    }
}