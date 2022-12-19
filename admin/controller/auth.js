const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const bcrypt = require('bcryptjs');
const { generateToken } = require('../../commons/helper');




async function login(req, res, next) {
    try {
        const login_id = req.body.login_id;
        const password = req.body.password;
        let attributes = ['id', 'first_name', 'last_name', 'email', 'password', 'dob', 'isSuper', 'picture', 'phone_number', 'country_id', 'role', 'need_password_reset'];
        var user = await db.admin.findOne({
            attributes: attributes,
            where: {
                status: true,
                [Op.or]:
                    [{ email: { [Op.eq]: login_id } },
                    { phone_number: { [Op.eq]: login_id } }]
            },
            include: [
                {
                    model: db.role,
                    as: 'admin_role',
                    include: [
                        {
                            model: db.role_permission,
                            as: 'role_permissions',
                            include: 'permission'
                        }
                    ]
                }
            ]
        });
        if (!user) {
            return res.status(406).json({
                error_code: 106,
                status: false,
                errors: "User id is not correct"
            });
        }
        let isMatch = await bcrypt.compare(password, user.password);
        console.log('isMatch', isMatch)
        // return res.send(isMatch)

        if (isMatch) {
            delete user.dataValues.password;
            const hash = await generateToken({ name: user.first_name, group: 'admin', role: 7 });
            const token = await db.admin_token.create({ userId: user.id, token: hash, expired_at: null });
            return res.set('auth-token', hash).status(200).json({
                error: false,
                status: "Success",
                user: user
            })
        } else {
            return res.status(400).json({
                error_code: 107,
                status: false,
                errors: "Password is not correct"
            });
        }

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error_code: 105,
            status: false,
            error: `${error}`
        })
    }
}



module.exports = { login }
