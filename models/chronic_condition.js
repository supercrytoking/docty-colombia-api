'use strict';
module.exports = (sequelize, DataTypes) => {
    const chronic_condition = sequelize.define('chronic_condition', {
        condition: DataTypes.STRING,
    }, {});
    chronic_condition.associate = function (models) {
        // associations can be defined here
    };
    return chronic_condition;
};