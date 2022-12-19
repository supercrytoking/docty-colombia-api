const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    // check user 's contract end date, and update `isSigned` Column in `users` table
    check: async () => {
        var now = new Date();
        var userList = await db.user.findAll({
            where: {
                isSigned: true
            },
            include: [
                {
                    model: db.signedContract,
                    as: 'contract',
                    required: true,
                    attributes: [],
                    where: {
                        status: 1,
                        end: { [Op.lt]: now }
                    }
                },
            ],
            attributes: ['id']
        });
        
        await db.signedContract.update({ status: 0 }, { where: { status: 1, end: { [Op.lt]: now } } });

        var userIdList = userList.map(u => u.id);
        return db.user.update({ isSigned: false }, {
            where: { id: { [Op.in]: userIdList } }
        }).then((res) => console.log(res));
    }
};