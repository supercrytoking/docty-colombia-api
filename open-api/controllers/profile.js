const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");


module.exports = {
    clinicProfile: async (req, res) => {
        let title = 'title';
        let details = 'details';
        if (req.lang == 'es') {
            title = "title_es"
            details = "details_es"
        };
        let query = req.query || {};
        let qp = query.include || "";
        let name = req.params.name;
        let tk = name.split('-');
        let id = tk.pop();
        let staff, locations, specialities, reviews;
        try {
            let profile = await db.user.findOne({
                where: { id: id },
                attributes: [
                    "slug", 'thumbnail', "company_name", "picture", "id", "email", "overview", 'phone_number'
                ]
            });
            let supportCenter = await db.org_contacts.findOne({ where: { user_id: id, type: 'supportCenter' }, attributes: ['phone', 'email', 'full_name'] });
            if (!!qp.includes('staff')) {
                staff = await profile.getStaff({
                    scope: '', include: [{
                        model: db.user.scope('publicInfo'),
                        where: { status: 1 },
                        include: [{
                            model: db.speciality,
                            as: 'specialities',
                            attributes: [[title, 'title']]
                        }],
                        as: 'staff'
                    }]
                }).then(e => e.map(r => {
                    let st = r.staff || { specialities: [] };
                    st = JSON.parse(JSON.stringify(st));
                    st['specialities'] = st.specialities.map(w => w.title)
                    console.log(JSON.parse(JSON.stringify(st.specialities)));
                    return st;

                })).catch(r => {
                    console.log(r)
                    return []
                });
            }
            if (!!qp.includes('locations'))
                locations = await profile.getUser_location();
            if (!!qp.includes('specialities'))
                specialities = await profile.getUser_speciality({
                    scope: "", include: [{
                        model: db.speciality,
                        attributes: [[title, 'title'], 'symbol', 'id', 'colorCode', [details, 'details']],
                        as: 'speciality'
                    }]
                }).then(e => e.map(r => r.speciality));
            if (!!qp.includes('reviews'))
                reviews = await db.review.findAll({
                    where: { doctor_id: id },
                    attributes: ['ratings', 'review', 'patient_id'],
                    include: [{
                        model: db.user.scope('minimalInfo'),
                        as: 'reviewer'
                    }]
                });
            return res.send({ profile, staff, locations, specialities, reviews, supportCenter });
        } catch (error) {
            res.status(400).send({ success: false, error: `${error}` })
        }
    },
    verifySlug: async (req, res) => {
        let slug = req.params.slug;
        let tk = slug.split("-");
        let id = tk.pop();
        db.user.scope('publicCompanyInfo').findByPk(id).then(r => res.send(r)).catch(e => res.status(400).send({ error: e, message: "inalid" }))
    }
}