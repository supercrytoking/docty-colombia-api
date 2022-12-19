const Model = require('../models');

var auth_clinic_manager = (req, res, next) => {
    // console.log(req.)
    const token = req.headers.auth_token;
    const lang = req.headers.lang || 'en';
    if (token == null || token == 'null') {
        return res.sendStatus(406)
    }
    req.lang = lang;
    const query = `SELECT user_authenticators.id id, user_authenticators.user_id user_id, user_authenticators.email email, user_authenticators.first_name as first_name FROM tokens
    join user_authenticators on user_authenticators.id = tokens.login_as AND user_authenticators.user_id = tokens.user_id
    WHERE token = '${token}'`//  and expired_at > NOW()`;
    Model.sequelize.query(query).spread((responce, meta) => {
        if (responce && responce.length) {
            const user = responce[0];
            if (user) {
                req.user = user;
                req.user.authenticator_id = user.id;
                req.user.family_id = user.id;

                req.user.id = user.user_id;
                req.user.role = 5;

                // req.user.isSeconday = true;
                return next();
            }
        }
        return res.sendStatus(406)
    }).catch(err => {
        console.log("Cristail error")
        res.status(406).send(err)
    })
}

var auth_family = (req, res, next) => {
    // console.log(req.)
    const token = req.headers.auth_token;
    const lang = req.headers.lang || 'en';
    if (token == null || token == 'null') {
        return res.sendStatus(406)
    }
    req.lang = lang;
    const query = `SELECT user_families.id id, user_families.user_id user_id, user_families.phone phone, user_families.email email, user_families.first_name as first_name FROM tokens
    join user_families on user_families.id = tokens.login_as AND user_families.user_id = tokens.user_id
    WHERE token = '${token}'`//  and expired_at > NOW()`;
    Model.sequelize.query(query).spread((responce, meta) => {
        if (responce && responce.length) {
            const user = responce[0];
            if (user) {
                // console.log(user)
                req.user = user;
                // console.log('middle', user.id, user.user_id)
                req.user.family_id = user.id;
                req.user.id = user.user_id;
                req.user.role = 2;//

                req.user.isSeconday = true;
                return next();
            }
        }
        auth_clinic_manager(req, res, next);
        // return res.sendStatus(406)
    }).catch(err => {
        // console.log(err)
        console.log("Cristail error")
        res.status(406).send(err)
    })
}



module.exports = {
    auth(req, res, next) {
        var token = req.headers.auth_token;

        if (req.body.token) {
            token = req.body.token;
        }

        if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (token == null) {
            res.sendStatus(406);
            return;
        }

        var lang = req.headers.lang || 'en';
        if (req.query && req.query.lang) {
            lang = req.query.lang;
        }
        req.lang = lang;
        const query = `SELECT users.id id, users.phone_number phone_number, users.isd_code isd_code,
        users.email email, users.first_name AS first_name, 
        CONCAT(first_name,' ',last_name) AS fullName, users.picture picture,
        users.company_name company_name, user_roles.role_id AS role, 
        DATEDIFF(CURRENT_DATE(),users.dob) / 365.25 AS age,
        users.gender,
        tokens.is_online AS is_online FROM tokens
        JOIN users ON users.id = tokens.user_id 
        JOIN user_roles ON user_roles.user_id = users.id
        WHERE token = '${token}' AND login_as = '${0}' and expired_at > NOW()`;
        Model.sequelize.query(query).spread((responce, meta) => {
            if (responce && responce.length) {
                let expiredAt = new Date();
                const minuts = expiredAt.getMinutes();
                let expitedAt1 = new Date(expiredAt.setMinutes(minuts + 30));
                Model.token.update({ expiredAt: expitedAt1, is_for_link: false }, { where: { token: token } })
                const user = responce[0];
                if (user) {
                    req.user = user;
                    return next();
                }
            }
            auth_family(req, res, next);
            // return res.sendStatus(406)
        }).catch(err => {
            console.log(err)
            res.status(406).send(err)
        })

    },
    interceptor(req, res, next) {
        const token = req.headers.auth_token;
        const lang = req.headers.lang || 'en';
        req.lang = lang;
        const query = `SELECT users.id id, users.phone_number phone_number, users.email email, users.first_name AS first_name, CONCAT(first_name,' ',last_name) AS fullName, user_roles.role_id AS role FROM tokens
        JOIN users ON users.id = tokens.user_id 
        JOIN user_roles ON user_roles.user_id = users.id
        WHERE token = '${token}'`//  and expired_at > NOW()`;
        Model.sequelize.query(query).spread((responce, meta) => {
            if (responce) {
                const user = responce[0];
                if (user) {
                    req.user = user;
                    return next();
                }
            }
            return next();
        }).catch(err => {
            res.status(406).send(err)
        })

    },
    checkClosedEnv(req, res, next) {
        let data = req.body || {};
        if (!!data.provider_id) {
            let uid = req.user.id;
            let sql = `SELECT a.*,um.json_data FROM customers c
                JOIN associates a ON a.user_id = c.user_id
                JOIN usermeta um ON um.user_id=c.user_id AND "key" = 'networkVisibility'
                WHERE customer = ${uid}`;
            sql = sql.replace(/\"/g, '`')
            Model.sequelize.query(sql).spread((r, m) => {
                if (!!!r || !!!r.length) {
                    return next()
                } else {
                    let resp = r[0];
                    if (!!!resp.json_data || !!!resp.json_data.patientCloseEnvironment) {
                        return next()
                    }
                    resp = r.find(e => e.associate == data.provider_id);
                    if (!!resp) return next()
                    return res.status(401).send({ status: false, error: 'SERVER_MESSAGE.INNETWORKS_ONLY' })
                }
            })
        } else {
            next();
        }
    }
}