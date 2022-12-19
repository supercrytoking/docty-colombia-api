'use strict';
module.exports = (sequelize, DataTypes) => {
    const weather = sequelize.define('weather', {
        user_id: DataTypes.INTEGER,
        device_type: DataTypes.STRING,
        device_id: DataTypes.STRING,
        macAddress: DataTypes.STRING,
        weather: DataTypes.JSON
    }, {});
    weather.associate = function(models) {
        // associations can be defined here
    };
    return weather;
};