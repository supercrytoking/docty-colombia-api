const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../models");
const { getLimitOffset, limit } = require("../commons/paginator");
const { response, errorResponse } = require("../commons/response");

module.exports = {
  my_favorites: async (req, res, next) => {
    // if (req.user && req.user.id) {
    //     db.my_favorite.findAll({
    //         where: { user_id: req.user.id }
    //     }).then(resp => {
    //         res.send({resp, id:req.user.id})
    //     }).catch(err => {
    //         res.status(400).send({
    //             status: false, errors: `${err}`
    //         })
    //     })
    // } else {
    //     res.sendStatus(406)
    // }
    let where = { status: { [Op.gt]: 0 } };
    if (req.body.id) {
      where.id = req.body.id;
    }

    let page = 1;
    let order = [];
    if (req.query && req.query.page) {
      page = req.query.page;
    } else if (req.body.page) {
      page = req.body.page;
    }
    if (req.query && req.query.order) {
      order.push(req.query.order);
    } else if (req.body.order) {
      order.push(req.body.order);
    }
    if (req.query && req.query.order_by) {
      order.push(req.query.order_by);
    } else if (req.body.order_by) {
      order.push(req.body.order_by);
    }
    let include = [
      "country",
      "state",
      "address",
      // 'user_medical', 'licence', 'availability',
      // 'practice', 'services',
      "education",
      // 'user_location', 'skills', 'user_speciality',
      "rating_summary",
      {
        model: db.my_favorite,
        as: "favorites",
        where: { user_id: req.user.id, deleted_at: { [Op.eq]: null } },
      },
    ];
    if ((req.query && req.query.role) || req.body.role) {
      let role_id = req.query.role || req.body.role;
      include.push({
        model: db.user_role,
        where: { role_id: role_id },
      });
    } else {
      include.push("user_role");
    }

    let options = {
      limit: getLimitOffset(page),
      order: order,
      where: where,
      include: include,
    };
    db.user
      .findAndCountAll(options)
      .then((resp) => {
        res.send(resp);
      })
      .catch((err) => {
        res.status(400).send({
          status: false,
          errors: `${err}`,
        });
      });
  },
  // who is added me as favorite
  my_favorittens: async (req, res, next) => {
    var favorList = await db.my_favorite.findAll({
      where: {
        provider_id: req.user.id,
        deleted_at: { [Op.eq]: null },
      },
      attributes: ["createdAt", "user_id", "provider_id"],
    });

    favorList = JSON.parse(JSON.stringify(favorList));

    var userIdList = favorList.map((favor) => favor.user_id);

    let include = [
      {
        model: db.symptom_analysis,
        as: "symptom_analysis",
        include: ["for_family_member", "changed_admin", "changed_user"],
      },
      "user_medical",
      "medical_conditions",
      {
        model: db.activity_log,
        as: "activity_log",
        limit: 1,
        order: [["createdAt", "DESC"]],
        required: false,
        attributes: ["createdAt", "data"],
        where: {
          type: { [Op.like]: "Login" },
        },
      },
    ];
    if (req.user && req.user.role == 5) {
      let OneYearAgo = new Date(
        new Date().setFullYear(new Date().getFullYear() - 1)
      );
      include.push({
        model: db.booking,
        as: "patient_bookings",
        separate: true,
        where: { createdAt: { [Op.gte]: OneYearAgo } },
        attributes: [
          "id",
          [Sequelize.fn("COUNT", "patient_bookings.id"), "bookings_in_year"],
        ],
        group: ["patient_id"],
      });
    }

    let search = "";
    let page = 1;
    let orderKey = "first_name";
    let order = "asc";
    if (req.body) {
      let data = req.body;
      search = data.search || "";
      orderKey = data.orderKey || "first_name";
      order = data.order || "asc";
      page = data.page || 1;
    }
    let where = {
      status: { [Op.gt]: 0 },
      [Op.or]: [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { middle_name: { [Op.like]: `%${search}%` } },
      ],
      id: { [Op.in]: userIdList },
    };
    db.user
      .findAndCountAll({
        where: where,
        order: [[orderKey, order]],
        limit: getLimitOffset(page),
        include: include,
      })
      .then((resp) => {
        resp = JSON.parse(JSON.stringify(resp));
        if (resp && resp.rows) {
          resp.rows.forEach((user) => {
            var favorite =
              favorList.find((fav) => fav.user_id == user.id) || {};
            user.favoritten_date = favorite.createdAt;
          });
        }

        return response(res, resp);
      })
      .catch((err) => {
        return errorResponse(res, err);
      });
  },
  add_my_favorites: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.my_favorite
        .scope("")
        .findOrCreate({
          where: {
            user_id: req.user.id,
            provider_id: req.body.provider_id,
          },
        })
        .then((resp) => {
          if (!!resp[0].deleted_at) {
            resp[0].update({ deleted_at: null });
          }
          res.send({
            status: true,
            data: resp[0],
          });
        })
        .catch((err) => {
          res.status(400).send({
            status: false,
            errors: `${err}`,
          });
        });
    } else {
      res.sendStatus(406);
    }
  },
  remove_my_favorites: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.my_favorite
        .update(
          { deleted_at: new Date() },
          {
            where: {
              user_id: req.user.id,
              provider_id: req.body.provider_id,
            },
          }
        )
        .then((resp) => {
          res.send({
            status: true,
            message: `Deleted successfuly`,
          });
        })
        .catch((err) => {
          res.status(400).send({
            status: false,
            errors: `${err}`,
          });
        });
    } else {
      res.sendStatus(406);
    }
  },
  // remove self from favorite list
  remove_my_favoritten: async (req, res, next) => {
    if (req.user && req.user.id) {
      db.my_favorite
        .update(
          { deleted_at: new Date() },
          {
            where: {
              provider_id: req.user.id,
              user_id: req.body.user_id,
            },
          }
        )
        .then((resp) => {
          res.send({
            status: true,
            message: `Deleted successfuly`,
          });
        })
        .catch((err) => {
          res.status(400).send({
            status: false,
            errors: `${err}`,
          });
        });
    } else {
      res.sendStatus(406);
    }
  },
};
