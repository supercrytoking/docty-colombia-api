var fs = require('fs');

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../models");

var async = require('async');
var mian = async () => {
    //speciality
    let title_kay = "title";
    let detail_kay = "details";
    var date = new Date();
    date.setDate(date.getDate());

    var date_to = new Date();
    date_to.setDate(date_to.getDate() + 1);
    var req = {
        lang: 'en', body:
        {
            dated: date,
            date_to: date_to
        }
    }
    if (req.lang == 'es') {
        title_kay = "title_es";
        detail_kay = "details_es";
    }
    try {
        var data = req.body;

        var dated = null;
        let endDate = null;
        if (data.dated) {
            dated = new Date(data.dated);

            if (data.date_to) {
                endDate = new Date(data.date_to)
            } else {
                endDate = new Date(data.dated);
                endDate.setHours(0);
                endDate.setMinutes(0);
                endDate.setSeconds(0);
                endDate.setDate(endDate.getDate() + 1)
            }

        }

        // var r = await db.speciality.findAll({
        //     where: { status: true },
        //     include: [{
        //         model: db.booking,
        //         as: 'bookings',
        //         required: true,
        //         include: [
        //             {
        //                 model: db.schedule,
        //                 as: 'schedule',
        //                 attributes: ['start', 'end', 'id'],
        //                 where: {
        //                     start: { [Op.gte]: dated },
        //                     end: { [Op.lte]: endDate },
        //                 },
        //                 required: true
        //             },
        //         ]
        //     }]
        // });
        var r = await db.user.findAll({
            where: {},
            include: [
                {
                    model: db.schedule,
                    as: 'schedule',
                    attributes: ['start', 'end', 'id'],
                    where: {
                        start: { [Op.gte]: dated },
                        end: { [Op.lte]: endDate },
                        calendarId: { [Op.in]: [3, 4] },
                    },
                    required: true
                },
                {
                    model: db.user_service,
                    as: 'services',
                    required: true,
                    include: [
                        {
                            model: db.speciality,
                            as: 'speciality',
                            where: {
                                status: true,
                            },
                            required: true
                        },
                    ]
                },
                {
                    model: db.booking,
                    as: 'provider_bookings',
                    required: false,
                    include: [
                        {
                            model: db.schedule,
                            as: 'schedule',
                            attributes: ['start', 'end', 'id'],
                            where: {
                                start: { [Op.gte]: dated },
                                end: { [Op.lte]: endDate },
                            },
                            required: true
                        },
                    ]
                }
            ]
        });

        console.log('68', JSON.parse(JSON.stringify(r)));
    } catch (error) {
        console.log(error)
    }
};

mian();