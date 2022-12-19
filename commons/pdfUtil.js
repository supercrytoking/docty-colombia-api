/* eslint-disable no-unused-vars */
/* eslint-disable eqeqeq */
const PDFDocument = require("pdfkit");
const Entities = require("html-entities").AllHtmlEntities;
const config = require(__dirname + "/../config/config.json");
const entities = new Entities();
const {
  S3UploadToFile,
  dateFormat,
  unSlug,
  getTranslations,
  getTranslation,
} = require("./helper");

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../models");
const fs = require("fs");
const request = require("request");

const { getFullAge } = require("./fullAge");
var tmp = require("tmp");
var IMG_DIR = "./public/icons";

var timeHHampmFormat = (hours) => {
  var ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  var strTime = hours + " " + ampm;
  return strTime;
};

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const sendReq = request.get(url);

    // verify response code
    sendReq.on("response", (response) => {
      if (response.statusCode !== 200) {
        reject("Response status was " + response.statusCode);
      }

      sendReq.pipe(file);
    });

    // close() is async, call cb after close completes
    file.on("finish", () => {
      file.close();
      resolve();
    });

    // check for request errors
    sendReq.on("error", (err) => {
      fs.unlink(`${dest}`);
      return reject(err.message);
    });

    file.on("error", (err) => {
      // Handle errors
      fs.unlink(dest); // Delete the file async. (But we don't check the result)
      return reject(err.message);
    });
  });
};

function numberWithCommas(x) {
  return (x || '0').toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

var getHeightOfCUPS = (cups, LINE_HEIGHT, doc, translation) => {
  var h = 40;
  cups.forEach((c, index) => {
    doc.fontSize(12);

    h += doc.heightOfString(
      `${getTranslation(translation, "MEDICINES", "PROCESS")}: ${c.process}`
    );
    doc.fontSize(10);

    h += doc.heightOfString(
      `${getTranslation(translation, "MEDICINES", "SECTION")}: ${c.section}`
    );
    h += doc.heightOfString(
      `${getTranslation(translation, "MEDICINES", "CHAPTER")}: ${c.chapter}`
    );
    h += doc.heightOfString(
      `${getTranslation(translation, "MEDICINES", "GROUP")}: ${c.group}`
    );
    h += doc.heightOfString(
      `${getTranslation(translation, "MEDICINES", "SUBGROUP")}: ${c.subgroup}`
    );

    h += LINE_HEIGHT;
  });
  return h;
};

var getHeightOfOneMediciation = (medication, LINE_HEIGHT) => {
  var beforeHeight = 0;
  var MEDICINE_OBJECT_NUMBER = 0;
  var medicineObj = medication.medicineObj;
  if (medicineObj) {
    MEDICINE_OBJECT_NUMBER = 4;
  }

  if (medication.scheduleList == null) medication.scheduleList = [];
  medication.scheduleList = medication.scheduleList.filter(
    (e) => e.enabled == true
  );
  for (var i = 0; i < medication.scheduleList.length; i++) {
    if (medication.scheduleList[i].enabled) {
      beforeHeight += LINE_HEIGHT * 2;
    }
  }

  // beforeHeight += 100;
  if (MEDICINE_OBJECT_NUMBER > 0) beforeHeight += 100;
  return beforeHeight;
};

var getHeightOfDiagnostics = (diagnostics, doc, translation) => {
  var beforeHeight = 0;
  (diagnostics || []).forEach((diagnostics) => {
    beforeHeight += doc.heightOfString(
      `${diagnostics.cie_4_char}-${diagnostics.title}`
    );

    beforeHeight += doc.heightOfString(diagnostics.discription);

    beforeHeight +=
      doc.heightOfString(
        `${getTranslation(translation, "CONSULTATION", "DR_COMMENTS")} ${diagnostics.comment || ''}`
      ) + 10;
  });
  return beforeHeight;
};

module.exports = {
  // create prescription pdf
  async createPDF(json, req, isUploadS3 = true) {
    var prescription = json;
    if (prescription && prescription.note) {
      prescription.default_note = prescription.note.default_note;
      prescription.multipleoptions_note =
        prescription.note.multipleoptions_note;
      prescription.singleoption_note = prescription.note.singleoption_note;
      prescription.dynamicnote = prescription.note.dynamicnote;
    }

    var beforeHeight = 0;
    if (typeof json.medications == "string")
      json.medications = JSON.parse(json.medications);
    var medications = json.medications || [];

    if (typeof json.recommendations == "string")
      json.recommendations = JSON.parse(json.recommendations);
    var recommendations = json.recommendations || [];

    var provider = json.provider || {};
    let specilityAtr = ["title"];
    if (!!req.lang && req.lang == "es") {
      specilityAtr = [["title_es", "title"]];
    }
    var booking = await db.booking.findOne({
      where: { reference_id: json.reference_id },
      include: [
        {
          model: db.user.scope("publicInfo", "idInfo", "contactInfo"),
          as: "providerInfo",
          include: [
            {
              model: db.user_service,
              as: "services",
              include: [
                {
                  model: db.speciality,
                  attributes: specilityAtr,
                  as: "speciality",
                },
              ],
            },
            "associatedTo",
          ],
        },
        {
          model: db.userFamilyView.scope("publicInfo", "idInfo", "timezone"),
          as: "patientInfo",
        },
        "schedule",
      ],
    });
    if (booking == null) return;

    booking = JSON.parse(JSON.stringify(booking));

    var patient = booking.family_member || booking.patientInfo || {};
    provider = booking.providerInfo || {};
    if (patient == null) return;
    let lang = req.lang || booking.patientInfo.lang || "en";
    let translation = await getTranslations(lang, [
      "PRESCRIPTIONS",
      "MEDICATION",
      "MEDICINES",
      "GENDER",
      "COLUMN",
      "FORM",
    ]);
    json.patient = patient;

    var TOP = 300;

    var LINE_HEIGHT = 18;

    const doc = new PDFDocument({
      margins: { to: 20, left: 10, right: 10, bottom: 20 },
      autoFirstPage: true,
      size: "A4",
    });
    var WIDTH = doc.page.width;

    var PAGE_MARGIN_TOP = 30;

    try {
      doc.image(`${IMG_DIR}/logo.png`, 40, 50, {
        fit: [166 / 1.5, 61 / 1.5],
      });
    } catch (e) { }
    var d = new Date();
    if (!!json.createdAt) {
      d = new Date(json.createdAt);
    }
    d.setMinutes(
      d.getMinutes() -
      (booking.patientInfo.timezone_offset - new Date().getTimezoneOffset())
    );
    let now = new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc
      .fillColor("#707070")
      .fontSize(11)
      .text(
        `${getTranslation(translation, "COLUMN", "DATE")}: ${now}`,
        410,
        50
      );
    json.today = `${now}`;
    doc
      .fillColor("#707070")
      .fontSize(11)
      .text(
        `${getTranslation(translation, "MEDICATION", "COUNSELLING_ID")}: ${json.reference_id
        }`,
        410,
        70
      );
    doc.fontSize(14).fillColor("#000").text(`${patient.fullName}`, 40, 120);

    doc
      .fontSize(9)
      .text(
        `${getTranslation(translation, "COLUMN", "NATIONAL_ID")}:${patient.national_id
        }`
      );

    // json.age = getAge(patient.dob);
    json.age = await getFullAge(patient.dob, lang);
    doc.text(`${getTranslation(translation, "COLUMN", "AGE")}:${json.age}`);
    doc.text(
      `${getTranslation(translation, "COLUMN", "SEX")}:${getTranslation(
        translation,
        "GENDER",
        patient.gender
      )}`
    );

    doc.save().moveTo(0, 200).lineTo(WIDTH, 200).fillColor("#707070");
    doc
      .fontSize(12)
      .text(getTranslation(translation, "PRESCRIPTIONS", "FORMULA"), 290, 215, {
        stroke: true,
      })
      .fillColor("#000");
    if (medications.length) {
      doc
        .save()
        .moveTo(20, 240)
        .lineTo(WIDTH - 20, 240)
        .lineTo(WIDTH - 20, 280)
        .lineTo(20, 280)
        .lineTo(20, 240)
        .stroke("#707070");
      doc
        .fillColor("#000000")
        .stroke("#000000")
        .text(
          `${getTranslation(translation, "MEDICATION", "MEDICATION")}`,
          50,
          257,
          { stroke: true }
        );

      var beforeHeight = 280 + 10;
      var yPrev = TOP - 60;

      for (var total = 0; total < medications.length; total++) {
        var medication = medications[total];

        // get one block height
        var h = getHeightOfOneMediciation(medication, LINE_HEIGHT);
        if (beforeHeight + h > doc.page.height) {
          doc.addPage();
          beforeHeight = PAGE_MARGIN_TOP + 20;
          yPrev = PAGE_MARGIN_TOP;
          doc
            .moveTo(20, PAGE_MARGIN_TOP)
            .lineTo(WIDTH - 20, PAGE_MARGIN_TOP)
            .stroke();
        }

        var MEDICINE_OBJECT_NUMBER = 0;
        var medicineObj = medication.medicineObj;
        if (medicineObj) {
          var dayDuration = "";
          if (
            medication.scheduleList != null &&
            medication.scheduleList.length > 0
          ) {
            dayDuration = `${medication.scheduleList[0].doseDuration
              } ${getTranslation(
                translation,
                "MEDICATION",
                medication.scheduleList[0].doseDurationType
              )}`;
          }

          MEDICINE_OBJECT_NUMBER = 4;

          doc
            .fillColor("#000")
            .strokeColor("#000")
            .fontSize(10)
            .text(medication.name, 40, beforeHeight, {
              stroke: false,
              width: 90,
            });

          doc
            .fillColor("#FD740F")
            .text(
              `${getTranslation(
                translation,
                "MEDICINES",
                "COMMERCIAL_DESCRIPTION"
              )}`,
              130,
              beforeHeight + 0 * LINE_HEIGHT
            );
          doc
            .fillColor("#000")
            .text(
              medicineObj.commercialDescription,
              130 +
              doc.widthOfString(
                getTranslation(
                  translation,
                  "MEDICINES",
                  "COMMERCIAL_DESCRIPTION"
                )
              ) +
              10,
              beforeHeight + 0 * LINE_HEIGHT,
              {
                width: 250,
                lineBreak: true,
                ellipsis: true,
                height: LINE_HEIGHT,
              }
            );

          doc
            .fillColor("#FD740F")
            .text(
              `${getTranslation(translation, "MEDICINES", "DESCRIPTION_ATC")}`,
              130,
              beforeHeight + 1 * LINE_HEIGHT
            );
          doc
            .fillColor("#000")
            .text(
              medicineObj.descriptionATC,
              130 +
              doc.widthOfString(
                getTranslation(translation, "MEDICINES", "DESCRIPTION_ATC")
              ) +
              10,
              beforeHeight + 1 * LINE_HEIGHT,
              {
                width: 250,
                lineBreak: true,
                ellipsis: true,
                height: LINE_HEIGHT,
              }
            );

          doc
            .fillColor("#FD740F")
            .text(
              `${getTranslation(
                translation,
                "MEDICINES",
                "ADMINISTRATION_VIA"
              )}`,
              130,
              beforeHeight + 2 * LINE_HEIGHT
            );
          doc
            .fillColor("#000")
            .text(
              medicineObj.viaAdministration,
              130 +
              doc.widthOfString(
                getTranslation(translation, "MEDICINES", "ADMINISTRATION_VIA")
              ) +
              10,
              beforeHeight + 2 * LINE_HEIGHT,
              {
                width: 250,
                lineBreak: true,
                ellipsis: true,
                height: LINE_HEIGHT,
              }
            );

          doc
            .fillColor("#FD740F")
            .text(
              `${getTranslation(translation, "MEDICINES", "ACTIVE_PRINCIPLE")}`,
              130,
              beforeHeight + 3 * LINE_HEIGHT
            );
          doc
            .fillColor("#000")
            .text(
              medicineObj.activePrinciple,
              130 +
              doc.widthOfString(
                getTranslation(translation, "MEDICINES", "ACTIVE_PRINCIPLE")
              ) +
              10,
              beforeHeight + 3 * LINE_HEIGHT,
              {
                width: 250,
                lineBreak: true,
                ellipsis: true,
                height: LINE_HEIGHT,
              }
            );

          doc
            .fillColor("#000")
            .strokeColor("#000")
            .text(dayDuration, WIDTH - 100, beforeHeight, { stroke: false });
        }

        if (medication.scheduleList == null) medication.scheduleList = [];
        medication.scheduleList = medication.scheduleList.filter(
          (e) => e.enabled == true
        );
        for (var i = 0; i < medication.scheduleList.length; i++) {
          if (medication.scheduleList[i].enabled) {
            medication.scheduleList[i].between = "";
            if (
              medication.scheduleList[i].doseTimeFrom &&
              medication.scheduleList[i].doseTimeTo
            ) {
              medication.scheduleList[i].between = `(${getTranslation(
                translation,
                "MEDICATION",
                "BETWEEN"
              )} ${medication.scheduleList[i].doseTimeFrom} - ${medication.scheduleList[i].doseTimeTo
                })`;
            }

            if (medication.scheduleList[i].enabled) {
              doc.image(
                `${IMG_DIR}/check.png`,
                130,
                -2 +
                beforeHeight +
                MEDICINE_OBJECT_NUMBER * LINE_HEIGHT +
                i * LINE_HEIGHT,
                { width: 12, height: 12 }
              );
            }

            doc.text(
              `${getTranslation(
                translation,
                "MEDICATION",
                medication.scheduleList[i].type
              )}`,
              130 + 14,
              beforeHeight +
              MEDICINE_OBJECT_NUMBER * LINE_HEIGHT +
              i * LINE_HEIGHT
            );

            doc
              .fillColor("#000")
              .text(
                `${medication.scheduleList[i].doseAmount} ${getTranslation(
                  translation,
                  "MEDICATION",
                  medication.scheduleList[i].doseType
                )}${medication.scheduleList[i].between}  ${getTranslation(
                  translation,
                  "MEDICATION",
                  medication.scheduleList[i].doseDetail
                )}`,
                130 + 90,
                beforeHeight +
                MEDICINE_OBJECT_NUMBER * LINE_HEIGHT +
                i * LINE_HEIGHT,
                {
                  width: 200,
                  lineBreak: true,
                  ellipsis: true,
                  height: LINE_HEIGHT,
                }
              );

            if (
              medication.scheduleList[i].note != null &&
              medication.scheduleList[i].note.length > 0
            ) {
              // doc.text(`${medication.scheduleList[i].note}`);
              doc
                .fillColor("#000")
                .text(
                  `${medication.scheduleList[i].note}`,
                  40,
                  beforeHeight +
                  MEDICINE_OBJECT_NUMBER * LINE_HEIGHT +
                  i * LINE_HEIGHT +
                  LINE_HEIGHT,
                  { lineBreak: true, ellipsis: false, height: LINE_HEIGHT * 2 }
                );
              beforeHeight += LINE_HEIGHT * 2 + 5;
            }
          }
        }

        beforeHeight += 20;
        if (MEDICINE_OBJECT_NUMBER > 0) beforeHeight += 100;

        var currentPos = beforeHeight + 10;
        // bottom
        doc
          .save()
          .moveTo(20, yPrev)
          .lineTo(20, currentPos)
          .lineTo(WIDTH - 20, currentPos)
          .lineTo(WIDTH - 20, yPrev)
          .stroke("#07070f");
        yPrev = currentPos;
        beforeHeight = beforeHeight + 20;
      }
    }

    beforeHeight = currentPos;
    var currentPos = beforeHeight;

    if (!!recommendations && !!Object.keys(recommendations).length) {
      var TABLE_WIDTH = 500;
      currentPos = doc.y + 40;
      var beforeHeight = currentPos;
      yPrev = beforeHeight;
      var h = 0;
      Object.keys(recommendations).forEach((key, y) => {
        var listString = recommendations[key];
        listString.forEach((line, index) => {
          h += doc.heightOfString(`${index + 1}. ${line}`, {
            width: TABLE_WIDTH / 2,
          });
        });
        h += 18;
      });

      h += 50;

      if (beforeHeight + h > doc.page.height) {
        doc.addPage();
        beforeHeight = PAGE_MARGIN_TOP + 20;
        yPrev = PAGE_MARGIN_TOP;
        doc
          .moveTo(20, PAGE_MARGIN_TOP)
          .lineTo(WIDTH - 20, PAGE_MARGIN_TOP)
          .stroke();
      }

      doc
        .save()
        .moveTo(20, yPrev)
        .lineTo(WIDTH - 20, yPrev)
        .lineTo(WIDTH - 20, yPrev + 40)
        .lineTo(20, yPrev + 40)
        .lineTo(20, yPrev)
        .stroke("#707070");

      doc
        .fillColor("#000000")
        .stroke("#000000")
        .text(
          `${getTranslation(translation, "PRESCRIPTIONS", "RECOMMENDATIONS")}`,
          40,
          yPrev + 10
        );

      beforeHeight = beforeHeight + 40;

      var gridPosY = 0;

      Object.keys(recommendations).forEach((key, y) => {
        doc.strokeColor("#000");
        doc
          .text(
            getTranslation(translation, "MEDICATION", key.toUpperCase()),
            55,
            beforeHeight + gridPosY + 12
          )
          .stroke();

        var listString = recommendations[key];

        listString.forEach((line, index) => {
          doc
            .text(
              `${index + 1}. ${line}`,
              55 + TABLE_WIDTH / 2,
              beforeHeight + gridPosY + 12
            )
            .stroke();
          gridPosY += doc.heightOfString(`${index + 1}. ${line}`, {
            width: TABLE_WIDTH / 2,
          });
        });
        gridPosY += 18;

        doc.strokeColor("#707070");
        doc.moveTo(20, beforeHeight + gridPosY);
        doc.lineTo(WIDTH - 20, beforeHeight + gridPosY).stroke();
      });

      var currentPos = doc.y + 20;
      // bottom
      doc
        .save()
        .moveTo(20, beforeHeight + gridPosY)
        .lineTo(20, yPrev + 40)
        .moveTo(WIDTH - 20, beforeHeight + gridPosY)
        .lineTo(WIDTH - 20, yPrev + 40)
        .stroke("#707070");
      yPrev = currentPos;
    }

    if (
      prescription.followUpDate ||
      (prescription.followUpComments && prescription.followUpComments.length)
    ) {
      if (currentPos + 300 > doc.page.height) {
        doc.addPage();
        currentPos = 50;
        beforeHeight = currentPos + 20;
      }

      var yPrev = currentPos + 20;
      beforeHeight = yPrev + 60;

      doc
        .save()
        .moveTo(20, yPrev)
        .lineTo(WIDTH - 20, yPrev)
        .lineTo(WIDTH - 20, yPrev + 40)
        .lineTo(20, yPrev + 40)
        .lineTo(20, yPrev)
        .stroke("#707070");

      doc
        .fillColor("#000000")
        .stroke("#000000")
        .text(
          `${getTranslation(
            translation,
            "MEDICATION",
            "FOLLOW_UP_AND_REMINDER"
          )}`,
          50,
          yPrev + 10
        );

      var sMessage = "";
      if (prescription.followUpDate) {
        sMessage = `${getTranslation(
          translation,
          "MEDICATION",
          "SCHEDULE_FOLLOWUP"
        )} : ${dateFormat(prescription.followUpDate)}`;
        doc.text(sMessage, 50, beforeHeight);

        var msg = getTranslation(
          translation,
          "MEDICATION",
          "DISALLOWED_SEND_MESSAGE"
        );

        if (prescription.allowSendMessage) {
          msg = getTranslation(
            translation,
            "MEDICATION",
            "ALLOWED_SEND_MESSAGE"
          );
        }

        doc
          .text(msg, 50 + doc.widthOfString(sMessage) + 5, beforeHeight, {
            stroke: true,
          })
          .stroke();

        beforeHeight += LINE_HEIGHT;
      }

      beforeHeight += LINE_HEIGHT;

      if (prescription.followUpComments) {
        doc
          .text(
            `${getTranslation(translation, "MEDICATION", "DR_COMMENTS")} - ${prescription.followUpComments
            }`,
            50,
            beforeHeight
          )
          .stroke();
      }

      var currentPos = doc.y + 20;
      // bottom
      doc
        .save()
        .moveTo(20, yPrev)
        .lineTo(20, currentPos)
        .lineTo(WIDTH - 20, currentPos)
        .lineTo(WIDTH - 20, yPrev)
        .stroke("#707070");
      yPrev = currentPos;
    }

    if (prescription.therapies) {
      if (typeof prescription.therapies == "string")
        prescription.therapies = JSON.parse(prescription.therapies);
      if (prescription.therapies.length) {
        var yPrev = currentPos + 20;
        beforeHeight = yPrev + 60;

        var THERAPIES_HEIGHT = 40 + prescription.therapies.length * 100;

        if (yPrev + THERAPIES_HEIGHT > doc.page.height) {
          doc.addPage();
          yPrev = 20;
          beforeHeight = yPrev + 70;
        }

        doc
          .save()
          .moveTo(20, yPrev)
          .lineTo(WIDTH - 20, yPrev)
          .lineTo(WIDTH - 20, yPrev + 40)
          .lineTo(20, yPrev + 40)
          .lineTo(20, yPrev)
          .stroke("#707070");

        doc
          .fillColor("#000000")
          .stroke("#000000")
          .text(
            `${getTranslation(
              translation,
              "PRESCRIPTIONS",
              "PRESCRIBE_THERAPY"
            )}`,
            50,
            yPrev + 10
          );

        prescription.therapies.forEach((t, index) => {
          doc.text(t, 50, beforeHeight);
          beforeHeight += doc.heightOfString(t) + 5;

          if (index < prescription.therapies.length - 1)
            doc
              .moveTo(20, doc.y)
              .lineTo(WIDTH - 20, doc.y)
              .stroke("#707070");
        });

        var currentPos = doc.y + 20;
        // bottom
        doc
          .save()
          .moveTo(20, yPrev)
          .lineTo(20, currentPos)
          .lineTo(WIDTH - 20, currentPos)
          .lineTo(WIDTH - 20, yPrev)
          .stroke("#07070f");
        yPrev = currentPos;
      }
    }

    if (prescription.notes && prescription.notes.length > 0) {
      var currentPos = doc.y + 20;

      var yPrev = currentPos + 20;
      beforeHeight = yPrev + 60;
      prescription.notes = prescription.notes.replace(/(<([^>]+)>)/g, "");
      // prescription.notes = prescription.notes.replace(/(&([^>]+);)/ig, '');
      var NOTES_HEIGHT =
        40 + doc.heightOfString(entities.decode(prescription.notes));

      if (yPrev + NOTES_HEIGHT + 70 > doc.page.height) {
        doc.addPage();
        yPrev = 20;
        beforeHeight = yPrev + 70;
      }

      doc
        .save()
        .moveTo(20, yPrev)
        .lineTo(WIDTH - 20, yPrev)
        .lineTo(WIDTH - 20, yPrev + 40)
        .lineTo(20, yPrev + 40)
        .lineTo(20, yPrev)
        .stroke("#707070");

      doc
        .fillColor("#000000")
        .stroke("#000000")
        .text(`${getTranslation(translation, "FORM", "NOTE")}`, 40, yPrev + 10);
      console.log(entities.encode(prescription.notes).replace(/&(Tab|amp|quot|lt|gt);/g, ''))
      doc.text(entities.encode(prescription.notes).replace(/&(Tab|amp|quot|lt|gt);/g, ''), 50, beforeHeight, {
        width: doc.page.width - 70,
      });

      var currentPos = doc.y + 20;
      // bottom
      doc
        .save()
        .moveTo(20, yPrev)
        .lineTo(20, currentPos)
        .lineTo(WIDTH - 20, currentPos)
        .lineTo(WIDTH - 20, yPrev)
        .stroke("#07070f");
      yPrev = currentPos;
    }

    if (prescription.diagnostics) {
      if (typeof prescription.diagnostics == "string")
        prescription.diagnostics = JSON.parse(prescription.diagnostics);
      if (prescription.diagnostics.length) {
        var yPrev = currentPos + 10;
        beforeHeight = yPrev + 60;

        var DIAGNOSTICS_HEIGHT =
          50 +
          getHeightOfDiagnostics(prescription.diagnostics, doc, translation);

        if (yPrev + DIAGNOSTICS_HEIGHT > doc.page.height) {
          doc.addPage();
          yPrev = 50;
          beforeHeight = yPrev + 60;
        }

        doc
          .save()
          .moveTo(20, yPrev)
          .lineTo(WIDTH - 20, yPrev)
          .lineTo(WIDTH - 20, yPrev + 40)
          .lineTo(20, yPrev + 40)
          .lineTo(20, yPrev)
          .stroke("#707070");

        doc
          .fillColor("#000000")
          .stroke("#000000")
          .text(
            `${getTranslation(translation, "MY_HISTORY", "DIAGNOSTICS")}`,
            50,
            yPrev + 10
          );

        (prescription.diagnostics || []).forEach((diagnostics) => {
          doc.text(
            `${diagnostics.cie_4_char || ""}-${diagnostics.title}`,
            50,
            beforeHeight
          );
          beforeHeight += doc.heightOfString(
            `${diagnostics.cie_4_char}-${diagnostics.title}`
          );

          doc.text(diagnostics.discription, 50);
          beforeHeight += doc.heightOfString(diagnostics.discription);
          if (!!diagnostics.comment) {
            doc.text(
              `${getTranslation(translation, "CONSULTATION", "DR_COMMENTS")} ${diagnostics.comment
              }`,
              50
            );
            beforeHeight +=
              doc.heightOfString(
                `${getTranslation(translation, "CONSULTATION", "DR_COMMENTS")} ${diagnostics.comment
                }`
              ) + 10;
          }
        });

        var currentPos = doc.y + 20;
        // bottom
        doc
          .save()
          .moveTo(20, yPrev)
          .lineTo(20, currentPos)
          .lineTo(WIDTH - 20, currentPos)
          .lineTo(WIDTH - 20, yPrev)
          .stroke("#07070f");
        yPrev = currentPos;
      }
    }

    var currentPos = currentPos || doc.y + 20;
    currentPos = currentPos || doc.y + 20;

    ////Prescription custom Notes////
    if (prescription.dynamicnote) {
      if (typeof prescription.dynamicnote == "string")
        prescription.dynamicnote = JSON.parse(prescription.dynamicnote);
      if (prescription.dynamicnote.length) {
        var yPrev = currentPos + 20;
        beforeHeight = yPrev + 60;

        var NOTE_HEIGHT = 40;

        prescription.dynamicnote.forEach((c) => {
          c.note = c.note.replace(/(<([^>]+)>)/gi, "");
          doc.fontSize(12);
          NOTE_HEIGHT += doc.heightOfString(`${c.title}: ${c.note}`);
        });

        if (yPrev + NOTE_HEIGHT > doc.page.height) {
          doc.addPage();
          yPrev = 20;
          beforeHeight = yPrev + 70;
        }

        doc
          .save()
          .moveTo(20, yPrev)
          .lineTo(WIDTH - 20, yPrev)
          .lineTo(WIDTH - 20, yPrev + 40)
          .lineTo(20, yPrev + 40)
          .lineTo(20, yPrev)
          .stroke("#707070");

        doc
          .fillColor("#000000")
          .stroke("#000000")
          .text(
            `${getTranslation(
              translation,
              "PRESCRIPTION_NOTE_TYPES",
              "CALL_NOTES"
            )}`,
            50,
            yPrev + 10
          );
        prescription.dynamicnote.forEach((c, index) => {
          c.note = entities.decode(c.note);
          doc.fontSize(12);

          doc.text(`${c.title}: ${c.note}`, 50, beforeHeight);
          beforeHeight += doc.heightOfString(`${c.title}: ${c.note}`);

          if (index < prescription.dynamicnote - 1)
            doc
              .moveTo(20, doc.y)
              .lineTo(WIDTH - 20, doc.y)
              .stroke("#707070");
        });

        var currentPos = doc.y + 20;
        // bottom
        doc
          .save()
          .moveTo(20, yPrev)
          .lineTo(20, currentPos)
          .lineTo(WIDTH - 20, currentPos)
          .lineTo(WIDTH - 20, yPrev)
          .stroke("#07070f");
        yPrev = currentPos;
      }
    }

    ////Prescription custom Notes Multiple selection options////
    if (prescription.multipleoptions_note) {
      if (typeof prescription.multipleoptions_note == "string")
        prescription.multipleoptions_note = JSON.parse(
          prescription.multipleoptions_note
        );
      var yprev_loop = 0;
      var yPrev = currentPos + 20;
      var curntPos;
      if (prescription.multipleoptions_note.length) {
        prescription.multipleoptions_note.forEach((a, index1) => {
          yPrev = yprev_loop + yPrev;
          beforeHeight = yPrev + 60;

          var NOTE_HEIGHT = 40 + prescription.multipleoptions_note.length * 100;

          if (yPrev + NOTE_HEIGHT > doc.page.height) {
            doc.addPage();
            yPrev = 20;
            beforeHeight = yPrev + 70;
          }

          if (index1 == 0) {
            yprev_loop = 0;
          }

          doc
            .save()
            .moveTo(20, yPrev)
            .lineTo(WIDTH - 20, yPrev)
            .lineTo(WIDTH - 20, yPrev + 40)
            .lineTo(20, yPrev + 40)
            .lineTo(20, yPrev)
            .stroke("#707070");

          doc
            .fillColor("#000000")
            .stroke("#000000")
            .text(`${a.title}`, 50, yPrev + 10);
          a.checkBoxEl.forEach((c, index) => {
            doc.fontSize(12);
            if (c.value) {
              doc
                .image(`${IMG_DIR}/check.png`, 50, beforeHeight, {
                  width: 12,
                  height: 12,
                })
                .text(`${c.name}`, 65, beforeHeight);
            } else {
              doc.text(`${c.name}`, 65, beforeHeight);
            }

            beforeHeight += doc.heightOfString(`${c.title}: ${c.note}`);
            yprev_loop += 10;

            if (index < prescription.multipleoptions_note.checkBoxEl - 1)
              doc
                .moveTo(20, doc.y)
                .lineTo(WIDTH - 20, doc.y)
                .stroke("#707070");
          });
          var currentPos = doc.y + 20;
          // bottom
          doc
            .save()
            .moveTo(20, yPrev)
            .lineTo(20, currentPos)
            .lineTo(WIDTH - 20, currentPos)
            .lineTo(WIDTH - 20, yPrev)
            .stroke("#07070f");

          yPrev = currentPos;
          curntPos = currentPos;
        });
        var currentPos = doc.y + 20;
        // bottom
        doc
          .save()
          .moveTo(20, yPrev)
          .lineTo(20, currentPos)
          .lineTo(WIDTH - 20, currentPos)
          .lineTo(WIDTH - 20, yPrev)
          .stroke("#07070f");

        yPrev = currentPos;
        curntPos = currentPos;
      }
    }

    ////Prescription custom Notes Single selection options////
    if (prescription.singleoption_note) {
      if (typeof prescription.singleoption_note == "string")
        prescription.singleoption_note = JSON.parse(
          prescription.singleoption_note
        );
      var yprev_loop = 0;
      var yPrev = currentPos + 20;

      if (prescription.singleoption_note.length) {
        prescription.singleoption_note.forEach((a, index1) => {
          yPrev = yprev_loop + yPrev;
          beforeHeight = yPrev + 60;

          var NOTE_HEIGHT = 40 + prescription.singleoption_note.length * 100;

          if (yPrev + NOTE_HEIGHT > doc.page.height) {
            doc.addPage();
            yPrev = 20;
            beforeHeight = yPrev + 70;
          }

          if (index1 == 0) {
            yprev_loop = 0;
          }

          doc
            .save()
            .moveTo(20, yPrev)
            .lineTo(WIDTH - 20, yPrev)
            .lineTo(WIDTH - 20, yPrev + 40)
            .lineTo(20, yPrev + 40)
            .lineTo(20, yPrev)
            .stroke("#707070");
          console.log(prescription.singleoption_note);

          doc
            .fillColor("#000000")
            .stroke("#000000")
            .text(`${a.title}`, 50, yPrev + 10);
          a.radioListEl.forEach((c, index) => {
            doc.fontSize(12);
            if (c == a.selected) {
              doc.image(`${IMG_DIR}/check.png`, 50, beforeHeight, {
                width: 12,
                height: 12,
              });
              doc.text(`${c}`, 65, beforeHeight);
            } else {
              doc.text(`${c}`, 65, beforeHeight);
            }

            beforeHeight += doc.heightOfString(`${c}`);
            yprev_loop += 10;

            if (index < prescription.singleoption_note.radioListEl - 1)
              doc
                .moveTo(20, doc.y)
                .lineTo(WIDTH - 20, doc.y)
                .stroke("#707070");
          });
          var currentPos = doc.y + 20;
          // bottom
          doc
            .save()
            .moveTo(20, yPrev)
            .lineTo(20, currentPos)
            .lineTo(WIDTH - 20, currentPos)
            .lineTo(WIDTH - 20, yPrev)
            .stroke("#07070f");
          yPrev = currentPos;
        });
      }
    }

    var currentPos = doc.y + 20;
    var SIGN_HEIGHT = 400;
    if (doc.y + SIGN_HEIGHT > doc.page.height) {
      doc.addPage();
      currentPos = 20;
    }
    try {
      var provider_signature = await db.signedContract.findOne({
        where: { user_id: provider.id, status: 1 },
      });
      if (provider_signature != null) {
        var tmpobj = tmp.fileSync();

        var pngURL = `${tmpobj.name}.png`;
        await downloadFile(provider_signature.signature, pngURL);
        json.signature = provider_signature.signature;

        doc.image(pngURL, WIDTH - 200, currentPos + 20, {
          scale: 0.3,
        });
      }
    } catch (e) { }
    if (provider.associatedTo && provider.associatedTo.user) {
      let addr = await db.address.findOne({
        where: { user_id: provider.associatedTo.user_id },
      });
      try {
        var lgm = tmp.fileSync();
        var lg = `${lgm.name}.png`;
        await downloadFile(provider.associatedTo.user.picture, lg);
        doc.image(lg, 40, currentPos + 20, {
          height: 100,
          width: 100,
        });
      } catch (e) { }
      doc
        .fontSize(12)
        .text(provider.associatedTo.user.company_name, 40, currentPos + 130);
      if (!!addr) doc.fontSize(12).text(addr.address, 40, currentPos + 150);
    }
    doc.fontSize(12).text(provider.fullName, WIDTH - 200, currentPos + 130);

    // doc.fontSize(8).text(`${getTranslation(translation, 'COLUMN', 'PHONE_NUMBER')} : +${provider.isd_code}${provider.phone_number}`, WIDTH - 200);
    if (!!provider.tp) {
      doc.fontSize(8).text(`TP : ${provider.tp}`, WIDTH - 200);
    }
    // doc.fontSize(8).text(`${(unSlug(provider.id_proof_type) || getTranslation(translation, 'COLUMN', 'NATIONAL_ID'))} : ${provider.national_id}`, WIDTH - 200);
    if (provider.services && provider.services.length > 0) {
      var service = [];
      provider.services.forEach((item) => {
        if (item.speciality) service.push(item.speciality.title);
      });

      doc
        .fontSize(8)
        .text(
          `${getTranslation(
            translation,
            "COLUMN",
            "SPECIALTY"
          )}: ${service.join(", ")}`,
          WIDTH - 200
        );
    }

    // doc.pipe(fs.createWriteStream('output.pdf'));
    doc.end();

    json.logo = `${config.basePath}icons/logo.png`;
    if (isUploadS3)
      S3UploadToFile(doc, `${json.reference_id}.pdf`)
        .then(async (res) => {
          doc.end();
          if (res == null) {
            res = {};
          }

          try {
            json.file = res.Location;
            await db.prescription.upsert(json);
          } catch (error) {
            console.log(error);
          }
        })
        .catch((e) => {
          console.error(e);
        });
    return doc;
  },
  async createInvoicePDF(invoice, req, isDownload = false) {
    return new Promise(async (resolve, reject) => {
      try {
        let lang = req.lang || "en";
        let attr = ["title", "id"];
        if (lang == "es") {
          attr = [["title_es", "title"], "id"];
        }

        let translation = await getTranslations(lang, [
          "PRESCRIPTIONS",
          "MEDICATION",
          "MEDICINES",
          "CLINIC",
          "COLUMN",
          "CONSULTATION",
          "DOCTOR_PROFILE",
          "GLOBAL_ALERTS",
          "INVOICES",
        ]);
        invoice = JSON.parse(JSON.stringify(invoice));
        // if (invoice.from == null) {
        invoice.from = await db.user.findOne({
          where: { id: invoice.from_id },
          include: ["address", "associatedTo"],
        });
        // }

        if (invoice.to == null) {
          invoice.to = await db.user.findOne({
            where: { id: invoice.to_id },
            include: ["address"],
          });
        }
        if (invoice.booking == null) {
          invoice.booking = await db.user.booking({
            where: { id: invoice.booking_id },
            include: [
              {
                model: db.speciality,
                as: "speciality",
                attributes: attr,
                include: [
                  {
                    model: db.department,
                    as: "department",
                    attributes: attr,
                  },
                ],
              },
            ],
          });
        }
        invoice = JSON.parse(JSON.stringify(invoice));
        if (typeof invoice.details != "object")
          invoice.details = JSON.parse(invoice.details);

        // console.log(invoice)
        var TOP = 50;
        var WIDTH = 620;
        var PDF_HEIGHT = 600;
        const doc = new PDFDocument({
          margins: { to: 20, left: 10, right: 10, bottom: 20 },
          autoFirstPage: true,
          size: [WIDTH, PDF_HEIGHT],
        });
        // doc.pipe(fs.createWriteStream('./output.pdf')); // for debug

        try {
          doc.image(`${IMG_DIR}/logo.png`, 40, 50, {
            fit: [166 / 1.5, 61 / 1.5],
          });
        } catch (e) {
          console.log(e);
        }

        var title = `${getTranslation(
          translation,
          "INVOICES",
          "INVOICE_HEADING"
        )}`;
        if (invoice.status)
          title = `${title} (${getTranslation(
            translation,
            "GLOBAL_ALERTS",
            invoice.status
          )})`;
        console.log(title);
        doc
          .fontSize(16)
          .fillColor("#272b41")
          .text(title, WIDTH / 2 - doc.widthOfString(title) / 2, TOP - 20);

        doc
          .fontSize(10)
          .fillColor("#272b41")
          .text(
            `${getTranslation(translation, "MEDICATION", "COUNSELLING_ID")}:`,
            WIDTH -
            100 -
            doc.widthOfString(
              `${getTranslation(
                translation,
                "MEDICATION",
                "COUNSELLING_ID"
              )}:`
            ),
            TOP
          );
        doc
          .fontSize(10)
          .fillColor("#757575")
          .text(`#${invoice.booking.reference_id || ""}`, WIDTH - 95, TOP);

        doc
          .fontSize(10)
          .fillColor("#272b41")
          .text(
            `${getTranslation(translation, "MEDICATION", "INVOICE_ID")}:`,
            WIDTH -
            100 -
            doc.widthOfString(
              `${getTranslation(translation, "MEDICATION", "INVOICE_ID")}:`
            ),
            TOP + 17
          );
        doc
          .fontSize(10)
          .fillColor("#757575")
          .text(`#${invoice.id}`, WIDTH - 95, TOP + 17);

        doc
          .fontSize(10)
          .fillColor("#272b41")
          .text(
            `${getTranslation(translation, "MEDICATION", "INVOICE_DATE")}:`,
            WIDTH -
            100 -
            doc.widthOfString(
              `${getTranslation(translation, "MEDICATION", "INVOICE_DATE")}:`
            ),
            TOP + 17 * 2
          );
        doc
          .fontSize(10)
          .fillColor("#757575")
          .text(`${dateFormat(invoice.createdAt)}`, WIDTH - 95, TOP + 17 * 2);

        doc
          .fontSize(10)
          .fillColor("#272b41")
          .text(
            `${getTranslation(
              translation,
              "MEDICATION",
              "COUNSELLING_STATUS"
            )}:`,
            WIDTH -
            100 -
            doc.widthOfString(
              `${getTranslation(
                translation,
                "MEDICATION",
                "COUNSELLING_STATUS"
              )}:`
            ),
            TOP + 17 * 3
          );
        if (invoice.status) {
          var status = invoice.status.toUpperCase();
          doc
            .fontSize(10)
            .fillColor("#757575")
            .text(
              `${getTranslation(translation, "GLOBAL_ALERTS", status)}`,
              WIDTH - 95,
              TOP + 17 * 3
            );
        }

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            getTranslation(translation, "MEDICATION", "INVOICE_FROM"),
            WIDTH -
            20 -
            doc.widthOfString(
              getTranslation(translation, "MEDICATION", "INVOICE_FROM")
            ),
            TOP + 100
          );
        if (invoice.from) {
          doc
            .fontSize(12)
            .fillColor("#757575")
            .text(
              `${getTranslation(translation, "MY_HISTORY", "DR")} ${invoice.from.fullName
              }`,
              WIDTH -
              20 -
              doc.widthOfString(
                `${getTranslation(translation, "MY_HISTORY", "DR")} ${invoice.from.fullName
                }`
              ),
              TOP + 120
            );
          // doc.fontSize(10).fillColor('#757575').text(`${invoice.from.id_proof_type || 'ID'}: ${invoice.from.national_id}`, WIDTH - 20 - doc.widthOfString(`${invoice.from.id_proof_type || ''}: ${invoice.from.national_id}`), TOP + 137);
        }
        if (
          invoice.from &&
          invoice.from.associatedTo &&
          invoice.from.associatedTo.user
        )
          doc
            .fontSize(10)
            .fillColor("#757575")
            .text(
              `(${invoice.from.associatedTo.user.company_name})`,
              WIDTH / 2 + 20,
              TOP + 130,
              { width: WIDTH / 2 - 40, align: "right" }
            );

        if (invoice.from && invoice.from.address)
          doc
            .fontSize(10)
            .fillColor("#757575")
            .text(
              `${invoice.from.address.address || ""}`,
              WIDTH / 2 + 20,
              TOP + 163,
              { width: WIDTH / 2 - 40, align: "right" }
            );

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            getTranslation(translation, "MEDICATION", "INVOICE_TO"),
            10,
            TOP + 100
          );
        if (invoice.to) {
          doc
            .fontSize(12)
            .fillColor("#757575")
            .text(`${invoice.to.fullName}`, 10, TOP + 120);
          doc
            .fontSize(10)
            .fillColor("#757575")
            .text(`#${invoice.to.national_id || ""}`, 10, TOP + 132);
        }
        // if (invoice.to && invoice.to.address)
        //     doc.fontSize(10).fillColor('#757575').text(`${invoice.to.address.address} `, 10, TOP + 132, { width: WIDTH / 2 - 20 });

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            getTranslation(translation, "INVOICES", "INVOICE_DESCRIPTOPN"),
            10,
            TOP + 160
          );
        if (
          invoice.booking &&
          invoice.booking.speciality &&
          invoice.booking.speciality.department &&
          invoice.booking.speciality.department.title
        ) {
          doc
            .fontSize(10)
            .fillColor("#272b41")
            .text(
              `${getTranslation(translation, "CLINIC", "DEPARTMENT")}: `,
              10,
              TOP + 176
            );
          doc
            .fontSize(10)
            .fillColor("#757575")
            .text(
              `${invoice.booking.speciality.department.title}`,
              10 +
              doc.widthOfString(
                `${getTranslation(translation, "CLINIC", "DEPARTMENT")}: `
              ),
              TOP + 176
            );
        }
        if (
          invoice.booking &&
          invoice.booking.speciality &&
          invoice.booking.speciality.title
        ) {
          doc
            .fontSize(10)
            .fillColor("#272b41")
            .text(
              `${getTranslation(translation, "CLINIC", "SPECIALITY")}: `,
              10,
              TOP + 190
            );
          doc
            .fontSize(10)
            .fillColor("#757575")
            .text(
              `${invoice.booking.speciality.title}`,
              10 +
              doc.widthOfString(
                `${getTranslation(translation, "CLINIC", "SPECIALITY")}: `
              ),
              TOP + 190
            );
        }

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            getTranslation(translation, "MEDICATION", "PAYMENT_MODE"),
            10,
            TOP + 220
          );
        doc
          .fontSize(12)
          .fillColor("#757575")
          .text(`${invoice.payment_mod}`, 10, TOP + 240);

        doc
          .fillColor("#757575")
          .moveTo(20, TOP + 270)
          .lineTo(WIDTH - 20, TOP + 270)
          .stroke("#757575");

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            `${getTranslation(translation, "DOCTOR_PROFILE", "FEES")}:`,
            30,
            TOP + 280
          );
        doc
          .fontSize(12)
          .fillColor("#757575")
          .text(
            `$${numberWithCommas(invoice.details.total)}`,
            WIDTH - 120,
            TOP + 280
          );

        doc
          .fillColor("#757575")
          .moveTo(20, TOP + 300)
          .lineTo(WIDTH - 20, TOP + 300)
          .stroke("#757575");

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            `${getTranslation(translation, "CLINIC", "INSURED_COVER")}:`,
            30,
            TOP + 310
          );
        if (invoice.details)
          doc
            .fontSize(12)
            .fillColor("#757575")
            .text(
              `-$${numberWithCommas(
                invoice.details.provider_insured_cover || 0
              )}`,
              WIDTH - 120,
              TOP + 310
            );

        doc
          .fillColor("#757575")
          .moveTo(20, TOP + 330)
          .lineTo(WIDTH - 20, TOP + 330)
          .stroke("#757575");

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            `${getTranslation(translation, "MEDICATION", "DISCOUNTS")}:`,
            30,
            TOP + 340
          );
        doc
          .fontSize(12)
          .fillColor("#757575")
          .text(
            `-$${numberWithCommas(invoice.discount)}`,
            WIDTH - 120,
            TOP + 340
          );

        doc
          .fillColor("#757575")
          .moveTo(20, TOP + 360)
          .lineTo(WIDTH - 20, TOP + 360)
          .stroke("#757575");

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            `${getTranslation(translation, "MEDICATION", "TOTAL")}:`,
            30,
            TOP + 370
          );
        doc
          .fontSize(12)
          .fillColor("#757575")
          .text(
            `$${numberWithCommas(invoice.details.net_payable || 0)} `,
            WIDTH - 120,
            TOP + 370
          );

        doc
          .fillColor("#757575")
          .moveTo(20, TOP + 380)
          .lineTo(20, TOP + 380)
          .stroke("#757575");

        doc.save();
        doc.end();
        if (isDownload) {
          resolve(doc);

          return resolve(result);
        }
        var now = new Date();
        var result = await S3UploadToFile(doc, `invoice_${now.getTime()}.pdf`);

        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  },
};
