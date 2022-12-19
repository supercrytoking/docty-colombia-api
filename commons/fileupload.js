const formidable = require('formidable');
const config = require(__dirname + '/../config/config.json');
var { serverMessage } = require('./serverMessage');
var AWS = require('aws-sdk');
const stream = require('stream');
var awsCred = config.awsCred;
var awsBucket = config.awsBucket;
AWS.config.update(awsCred);
var S3 = require('aws-sdk/clients/s3');
const bucket = new S3(awsCred);
var fs = require('fs');

module.exports = {
    bucket: bucket,
    awsBucket: awsBucket,
    upload: (req, folder, fileKey) => {
        var form = new formidable.IncomingForm();
        return new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                const store = `public/${folder}`;
                if (!fs.existsSync(store)) {
                    fs.mkdirSync(store);
                }
                var fileName = '';
                if (files[fileKey] != null) {
                    fileName = files[fileKey].name
                    const path = `${store}/${new Date().getTime()}_${fileName}`;
                    fs.rename(files[fileKey].path, path, (err) => {
                        if (err) {
                            reject(err)
                        }
                        resolve({
                            path: config.basePath + path,
                            fields: fields
                        })
                    });
                } else {
                    reject('files[fileKey] == null')
                }

                // res.send(fields)
            });
        })
    },

    uploadFile: (req, res, next) => {
        var form = new formidable.IncomingForm();
        const bucket = new S3(awsCred);

        form.parse(req, (err, fields, files) => {
            if (err) {
                return res.status(400).send({
                    status: false, error: err, message: `${err}`
                });
            }


            var fileName = '';
            let fileKey = fields.fileKey || 'file';
            let filePath = files[fileKey].path;
            let type = files[fileKey].type;
            if (files[fileKey] != null) {

                fileName = files[fileKey].name;
                let folder = fields.folder || 'storage';
                const key = `${folder}/${fileName}`;
                var fs = require('fs');
                // var fileStream = fs.createReadStream(filePath);
                // fileStream.on('error', function (err) {
                //     if (err) {
                //         return res.status(400).send({
                //             status: false, error: err, message: `${err}`
                //         });
                //     }
                // });
                fs.readFile(filePath, function (err, data) {
                    if (err) {
                        return res.status(400).send({
                            status: false, error: err, message: `${err}`
                        });
                    }
                    const params = {
                        Bucket: awsBucket,
                        Key: key,
                        Body: data,
                        ACL: 'public-read',
                        ContentType: type
                    };

                    bucket.upload(params, (err, data) => {
                        fs.unlink(filePath, function (err) {
                            if (err) {
                                console.error(err);
                            }
                            console.log('Temp File Delete');
                        });
                        if (err) {
                            return res.status(400).send({
                                status: false, error: err, message: `${err}`
                            });
                        }
                        else {
                            return res.send({
                                status: true, data: data, message: 'SERVER_MESSAGE.UPLOADED', type, filePath
                            })
                        }
                    })
                })
            }
        });
    },
    uploadBase64: (req, res, next) => {
        let base64 = req.body.base64;
        let folder = req.body.folder;
        const type = base64.split(';')[0].split('/')[1];
        const base64Data = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const bucket = new S3(awsCred);

        const params = {
            Bucket: awsBucket,
            Key: `${folder}/${Date.now()}.${type}`,
            Body: base64Data,
            ACL: 'public-read',
            ContentType: `image/${type}`
        };

        bucket.upload(params, (err, data) => {
            if (err) {
                return res.status(400).send({
                    status: false, error: err, message: `${err}`
                });
            }
            return res.send({
                status: true, data: data, message: serverMessage('SERVER_MESSAGE.UPLOADED', req.lang)
            })
        })
    }
}