const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const db = require("../../models");
const { getLimitOffset, limit } = require('../../commons/paginator');
const { response, errorResponse } = require('../../commons/response');

var transform = (templateList, logs) => {
  var temp = [];
  var result = [];
  temp = JSON.parse(JSON.stringify(templateList));

  for (let log of logs) {
    let data = log.data;
    let table = '';
    if (!!!data) {
      result.push({
        id: log.id,
        createdAt: log.createdAt,
        details: (log.details || (log.type || '').replace(/_/g, ' '))
      });
    } else {
      if (!!data && typeof data != 'object') {
        data = JSON.parse(data);
      }
      let template = temp.find(tem => tem.trigger && tem.trigger.trigger == log.type);
      for (let d in data) {
        if (template) {
          let key = '${' + d + '}';
          template = template.split(key).join(data[d]);
        } else {
          table += `<tr>
                      <td>${d}</td>
                      <td>${data[d]}</td>
                    </tr>`;
        }
      }
      result.push({
        createdAt: log.createdAt,
        id: log.id,
        details: !!template ? template : `<table class="table table-borderd">${table}</table>`
      });
    }

  }
  return result;

};

module.exports = {
  async getLogs(req, res, next) {
    let templates = await db.activity_log_template.findAll({ where: { language: (req.lag || 'en') } });
    let page = 1;
    db.activity_log.findAll({
      where: {
        user_id: req.params.user_id
      },
      order: [['createdAt', 'DESC']],
      limit: getLimitOffset(page)
    }).then(providers => {
      let logs = transform(templates, providers);
      response(res, logs);
    })
      .catch(err => errorResponse(res, err));
  },
  addActivityLog(data) {
    return db.activity_log.create(data);
  }
};