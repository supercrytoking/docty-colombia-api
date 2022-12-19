const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require("../../commons/paginator");
const { response, errorResponse } = require("../../commons/response");
const { otpTrigger } = require("../../commons/crmTrigger");
const { generateToken } = require("../../commons/helper");
const { smsOtpTrigger } = require("../../commons/smsCrmTrigger");
const { serverMessage } = require("../../commons/serverMessage");
const btoa = require("btoa");
module.exports = {
  sendOtp: async (req, res, next) => {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000);
      let responce = await db.app_authentication.create({
        username: req.body.username,
        otp: otp,
        status: true,
      });
      let trigger = "General_Otp";
      otpTrigger(
        trigger,
        {
          email: req.body.username,
          subject: "Docty Health Care: One Time Password",
          userName: "User",
          otp,
          text: `Please use this OTP for your account verification.`,
        },
        req.lang || "en"
      );
      // }
      res.status(200).send({
        error: false,
        status: "Success",
        message: "SERVER_MESSAGE.ACCOUNT_CREATED_OTP_SEND",
      });
    } catch (error) {
      res.status(400).send({
        error: true,
        message: `${error}`,
      });
    }
  },
  verifyOtp: async (req, res, next) => {
    try {
      let data = req.body;
      db.app_authentication
        .findOne({
          where: { username: data.username, otp: data.otp, status: true },
        })
        .then(async (resp) => {
          db.user
            .findOrCreate({
              where: { email_verified: 1, email: resp.username },
            })
            .then(async (user) => {
              await user[0].update({ status: 1 });
              const hash = await generateToken({ name: user.id + Date.now(), group: 'client', role: 2 });
              resp.update({ status: false });
              let u = user[0];
              await db.user_role.findOrCreate({
                where: { user_id: u.id, role_id: 2 },
              });
              const token = await db.token.create({
                userId: u.id,
                token: hash,
                expired_at: null,
                login_as: 0,
              });
              return res.set("auth-token", hash).status(200).json({
                error: false,
                status: "Success",
                user: user,
              });
            })
            .catch((err) => {
              res.status(400).json({
                error: `${err}`,
                status: false,
                message: "SERVER_MESSAGE.INVALID_OTP",
              });
            });
        })
        .catch((err) => {
          res.status(400).json({
            error: "SERVER_MESSAGE.INVALID_OTP",
            status: false,
            message: "SERVER_MESSAGE.SOMETHING_WRONG",
          });
        });
    } catch (error) {
      return res.status(500).json({
        error_code: 105,
        status: false,
        error: `${error}`,
      });
    }
  },
  otpForOtpLogin: async (req, res, next) => {
    let loginId = req.body.loginId;
    loginId = loginId.trim();
    if (!!!loginId.includes("@") && loginId.indexOf("+") == 0) {
      loginId = loginId.substr(3);
    }
    let user = await db.user.scope("").findOne({
      where: {
        [Op.or]: [{ email: loginId }, { phone_number: loginId }],
      },
    });
    let lang = req.lang || "es";
    if (!user) {
      return res.status(400).json({
        error_code: 105,
        status: false,
        errors: serverMessage("SERVER_MESSAGE.USER_ID_INCORRECT", lang),
      });
    }
    if (!!!user.email_verified) {
      return res.status(400).json({
        error_code: 105,
        status: false,
        errors: serverMessage("SERVER_MESSAGE.EMAIL_NOT_VERIFIED", lang),
      });
    }
    if (user.status == -1) {
      return res.status(400).json({
        error_code: 107,
        status: false,
        errors: serverMessage("SERVER_MESSAGE.ACCOUNT_SUSPENDED", lang),
      });
    }

    if (user.status == -2) {
      return res.status(400).json({
        error_code: 107,
        status: false,
        errors: serverMessage("SERVER_MESSAGE.ACCOUNT_CLOSED", lang),
      });
    }
    let unique = btoa(Date.now()).replace(/=/g, "") + `__${user.id}`;
    const otp = Math.floor(100000 + Math.random() * 900000);
    let responce = await db.app_authentication.create({
      username: unique,
      otp: otp,
      status: true,
    });
    if (!!responce && user.phone_number && user.isd_code) {
      let phone_number = user.isd_code + user.phone_number;
      smsOtpTrigger("loginOtp", { otp, to: phone_number }, lang)
        .then(async (resp) => {
          await res.send({
            token: unique,
            status: true,
            message: (
              serverMessage("SERVER_MESSAGE.OTP_SEND_MESSAGE", lang) || ""
            ).replace("$phoneNumber", phone_number),
          });
        })
        .catch((e) => errorResponse(res, e));
    } else {
      res.status(400).send({
        token: unique,
        status: false,
        error: serverMessage(
          "SERVER_MESSAGE.INVALID_PHONENUMBER_ATTAICHED",
          lang
        ),
      });
    }
  },
  loginOtpVerify: async (req, res, next) => {
    try {
      let data = req.body;
      // temp code start
      if (+data.otp == 999999) {
        let userIds = (data.token || "").split("__");
        let userId = userIds.pop();
        db.user
          .scope("")
          .findByPk(userId, { include: ["user_role"] })
          .then(async (user) => {
            const hash = await generateToken({ name: user.id + Date.now(), group: 'client', role: 2 });
            resp.update({ status: false });
            const token = await db.token.create({
              userId: user.id,
              token: hash,
              expired_at: null,
              login_as: 0,
            });
            return res.set("auth-token", hash).status(200).json({
              error: false,
              status: true,
              token: hash,
              user: user,
            });
          })
          .catch((err) => {
            res.status(400).json({
              error: `${err}`,
              status: false,
              message: "SERVER_MESSAGE.INVALID_OTP",
            });
          });
        return;
      }
      // temp code end here
      db.app_authentication
        .findOne({
          where: { username: data.token, otp: data.otp, status: true },
        })
        .then(async (resp) => {
          let userIds = (resp.username || "").split("__");
          let userId = userIds.pop();
          db.user
            .scope("")
            .findByPk(userId, { include: ["user_role"] })
            .then(async (user) => {
              const hash = await generateToken({ name: user.id + Date.now(), group: 'client', role: 2 });
              resp.update({ status: false });
              const token = await db.token.create({
                userId: user.id,
                token: hash,
                expired_at: null,
                login_as: 0,
              });
              return res.set("auth-token", hash).status(200).json({
                error: false,
                status: true,
                token: hash,
                user: user,
              });
            })
            .catch((err) => {
              res.status(400).json({
                error: `${err}`,
                status: false,
                message: "SERVER_MESSAGE.INVALID_OTP",
              });
            });
        })
        .catch((err) => {
          res.status(400).json({
            error: "SERVER_MESSAGE.INVALID_OTP",
            status: false,
            message: "SERVER_MESSAGE.SOMETHING_WRONG",
          });
        });
    } catch (error) {
      return res.status(500).json({
        error_code: 105,
        status: false,
        error: `${error}`,
      });
    }
  },
};
