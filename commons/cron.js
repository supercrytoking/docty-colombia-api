const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

module.exports = {
    calculateAvarageRating: async () => {
        db.sequelize.query(`SELECT AVG(ratings) as rating, COUNT(review) as reviews, doctor_id as user_id 
            FROM reviews WHERE patient_id != doctor_id GROUP BY doctor_id`).spread(res => {
            res.forEach(element => {
                if (element.user_id) {
                    if (element.ratings && element.ratings < 2.6) {
                        try {
                            db.signedContract.update({ status: 0 }, { where: { user_id: element.user_id } });
                            db.user.update({ isSigned: false }, { where: { id: element.user_id } });
                        } catch (e) { console.log(e); }
                    }

                    db.rating_summary.findOrCreate({ where: { user_id: element.user_id } }).then(resp => {
                        resp[0].update(element);
                    });
                }
            });
        });
    }
};