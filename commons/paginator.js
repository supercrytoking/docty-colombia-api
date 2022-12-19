var limit = 25;
const offset = 0;

module.exports = {
    getLimitOffset(pageNo = 1, lim = 25) {
        limit = lim;
        if (pageNo < 1) pageNo = 1;
        let offset = (pageNo - 1) * limit;
        if (offset > 0) offset -= 1
        return [offset, limit]
    },
    limit: () => { return limit; },

}