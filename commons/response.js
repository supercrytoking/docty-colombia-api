const { getLimitOffset, limit } = require('./paginator');

module.exports = {
    response: (res, data, message = null, _limit = 25) => {
        let json = {
            status: true,
            data: data,
            pageSize: _limit ? _limit : limit(),
            total: data ? 1 : 0,
            message
        }
        if (data && data.rows) {
            json.data = data.rows;
            json.total = data.rows.length;
        }
        if (data && data.count) {
            json.total = data.count;
        }
        if (data && data.otherObject) {
            json = { ...json, ...data.otherObject };
        }
        return res.send(json)
    },
    responseObject: (data, message = null) => {
        let json = {
            status: true,
            data: data,
            pageSize: limit(),
            total: data ? 1 : 0,
            message
        }
        if (data && data.rows) {
            json.data = data.rows;
            json.total = data.rows.length;
        }
        if (data && data.count) {
            json.total = data.count;
        }
        return json;
    },
    errorResponse: (res, err, message = null) => {
        return res.status(400).send({
            status: false,
            error: `${err}`,
            errorObject: err,
            message
        })
    }
}