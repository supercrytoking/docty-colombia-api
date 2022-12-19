'use strict';
module.exports = (sequelize, DataTypes) => {
    let expiredAt = new Date();
    const minuts = expiredAt.getMinutes();
    let expitedAt1 = new Date(expiredAt.setMinutes(minuts + 5));
    const token = sequelize.define('token', {
        userId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'users',
                referencesKey: 'id'
            }
        },
        token: DataTypes.STRING,
        expiredAt: { type: DataTypes.DATE, allowNull: true, defaultValue: expitedAt1 },
        login_as: DataTypes.INTEGER,
        is_online: {
            type: DataTypes.BOOLEAN,
            defaultValue: 0
        },
        is_for_link: { type: DataTypes.BOOLEAN, defaultValue: false },
        platform: DataTypes.STRING
    }, {
        underscored: true,
        timestamps: true,
        expiredAt: true,
        // freezeTableName: true
        hooks: {
            beforeCreate: function (token, options) {
                let expiredAt = new Date();
                const minuts = expiredAt.getMinutes();
                let expitedAt1 = new Date(expiredAt.setMinutes(minuts + 5));
                token.expiredAt = expitedAt1;
            }
        }
    });
    token.associate = function (models) {
        // associations can be defined here
        //otp
    };
    return token;
};