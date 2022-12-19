var express = require('express');
var router = express.Router();
const Model = require('../../models');

/**
 * interceptor
 */

const interceptor = (req, res, next) => {
    const token = req.headers.auth_token;
    const lang = req.headers.lang || 'en';
    req.lang = lang;
    return next();

}
function auth(req, res, next) {

    const token = req.headers.auth_token;
    if (token == null || token == 'null') {
        return res.sendStatus(406);
    }
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
            Model.token.update({ expiredAt: expitedAt1 }, { where: { token: token } });
            const user = responce[0];
            if (user) {
                req.user = user;
                return next();
            }
        }

        auth_family(req, res, next);
    }).catch(err => {
        res.status(406).send(err);
    });

}
/*====Controller Listing============*/

var profile = require("../controllers/profile");
var pageData = require("../controllers/pageData");

/*=======Routes============ */
router.get('/clinic-profile/:name', interceptor, profile.clinicProfile);
router.get('/page-data/:name', interceptor, pageData.pageData);
router.post('/page-data/:key', auth, pageData.pageDataSave);
router.get('/validate/:slug', interceptor, profile.verifySlug);
router.post('/static/:type', auth, pageData.saveStaticPage);
router.get('/static/sug', interceptor, pageData.getStaticPage);



module.exports = router;