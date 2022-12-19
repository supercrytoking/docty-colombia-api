var fs = require("fs");

const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const db = require("../models");
var tmp = require("tmp");
var IMG_DIR = "./public/icons";
const PDFDocument = require("pdfkit");
const Entities = require("html-entities").AllHtmlEntities;
const entities = new Entities();
const request = require("request");
var btoa = require("btoa");
const { getFullAge } = require("./fullAge");
const {
  dateFormat,
  unSlug,
  getTranslations,
  getTranslation,
  scheduleTimeFormat,
  getAge,
} = require("../commons/helper");

const downloadFile = (url, dest) => {
  try {
    return new Promise((resolve, reject) => {
      if (url == null || url == "") return reject("need url");
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
        if (!!dest)
          fs.unlink(`${dest}`);
        return reject(err.message);
      });

      file.on("error", (err) => {
        // Handle errors
        if (!!dest)
          fs.unlink(dest); // Delete the file async. (But we don't check the result)
        return reject(err.message);
      });
    });
  } catch (error) {
    console.log(error)
  }
};

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  var start = polarToCartesian(x, y, radius, endAngle);
  var end = polarToCartesian(x, y, radius, startAngle);

  var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  var d = [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");

  return d;
}

var fixedNum = (num) => {
  if (num) {
    const n = num * 100;
    return n.toFixed(2);
  }
  return 0;
};

var getBooking = async (id, lang = "en") => {
  if (!!!id) {
    return {}
  };
  try {
    let specilityAtr = ["title"];
    if (!!lang && lang === "es") {
      specilityAtr = [["title_es", "title"]];
    }
    var booking = await db.booking.findOne({
      where: { id: id },
      include: [
        {
          model: db.user.scope("publicInfo", "idInfo", "contactInfo"),
          as: "providerInfo",
          include: [
            "address",
            {
              model: db.user_service,
              as: "services",
              include: [
                {
                  model: db.speciality,
                  attributes: specilityAtr,
                  as: "speciality",
                  required: true,
                },
              ],
            },
            "associatedTo",
          ],
        },
        {
          model: db.userFamilyView.scope(
            "publicInfo",
            "idInfo",
            "contactInfo",
            "timezone"
          ),
          as: "patientInfo",
          include: ["address", "user_medical"],
          required: false,
        },
        "analysis",
        "schedule",
        "booking_calls",
        {
          model: db.prescription,
          as: "prescription",
          include: ["note"],
          required: false,
        },
        "invoice",
        {
          model: db.speciality,
          as: "speciality",
          attributes: specilityAtr,
          required: false,
          include: [
            {
              model: db.department,
              as: "department",
              attributes: specilityAtr,
            },
          ],
        },
      ],
    });
    booking = JSON.parse(JSON.stringify(booking));
    return booking;
  } catch (e) {
    console.log(e);
  }
};

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
        `${getTranslation(translation, "CONSULTATION", "DR_COMMENTS")} ${diagnostics.comment
        }`
      ) + 10;
  });
  return beforeHeight;
};

var createPDF = async (id, req, fileName) => {
  var lang = req.lang || "en";
  return new Promise(async (resolve, reject) => {
    var WIDTH = 620;

    const doc = new PDFDocument({
      margins: { to: 20, left: 10, right: 10, bottom: 20 },
      autoFirstPage: true,
      size: "A4",
    }); //, size: [WIDTH, PDF_HEIGHT]

    try {
      var booking = await getBooking(id);

      if (!!!booking) return;
      let translation = await getTranslations(lang, [
        "FORM",
        "CONSULTATION",
        "MEDICATION",
        "MEDICINES",
        "GENDER",
        "MY_HISTORY",
        "CLINIC",
        "INVOICES",
        "DOCTOR_PROFILE",
        "PROFILE",
        "ALERT",
        "COLUMN",
        "PRESCRIPTIONS",
        "ETHINICITY",
      ]);
      var TOP = 50;

      try {
        doc.image(`${IMG_DIR}/logo.png`, 60, 50, {
          fit: [166 / 1.5, 61 / 1.5],
        });
      } catch (e) {
        console.log(e);
      }

      doc
        .fontSize(12)
        .fillColor("#272b41")
        .text(
          getTranslation(translation, "MEDICATION", "INVOICE_FROM"),
          WIDTH -
          60 -
          doc.widthOfString(
            getTranslation(translation, "MEDICATION", "INVOICE_FROM")
          ),
          TOP + 100
        );
      if (booking.providerInfo) {
        doc
          .fontSize(12)
          .fillColor("#757575")
          .text(
            `${getTranslation(translation, "MY_HISTORY", "DR")} ${booking.providerInfo.fullName
            }`,
            WIDTH -
            60 -
            doc.widthOfString(
              `${getTranslation(translation, "MY_HISTORY", "DR")} ${booking.providerInfo.fullName
              }`
            ),
            TOP + 120
          );
        // doc.fontSize(10).fillColor('#757575').text(`${booking.providerInfo.id_proof_type || ''}: ${booking.providerInfo.national_id}`, WIDTH - 60 - doc.widthOfString(`${booking.providerInfo.id_proof_type || ''}: ${booking.providerInfo.national_id}`), TOP + 137);
      }

      if (
        booking.providerInfo &&
        booking.providerInfo.address &&
        booking.providerInfo.address.address
      ) {
        var addX =
          WIDTH -
          60 -
          doc.widthOfString(`${booking.providerInfo.address.address}`);
        if (
          doc.widthOfString(`${booking.providerInfo.address.address}`) >
          WIDTH / 2 - 50
        ) {
          addX = WIDTH / 2;
        }
        doc
          .fontSize(10)
          .fillColor("#757575")
          .text(`${booking.providerInfo.address.address}`, addX, TOP + 150, {
            width: WIDTH / 2 - 50,
          });
      }

      doc
        .fontSize(12)
        .fillColor("#272b41")
        .text(
          getTranslation(translation, "MEDICATION", "INVOICE_TO"),
          60,
          TOP + 100
        );
      if (booking.patientInfo) {
        var patient = booking.patientInfo;
        if (booking.family_member) {
          patient = booking.family_member;
        }
        doc
          .fontSize(12)
          .fillColor("#757575")
          .text(`${patient.fullName}`, 60, TOP + 120);
        var gender = "";
        if (patient.gender)
          gender = ` (${getTranslation(
            translation,
            "GENDER",
            patient.gender.toUpperCase()
          )})`;
        let age = await getFullAge(patient.dob, lang);
        var patient_summary = `${age} ${gender}`;
        doc
          .fontSize(10)
          .fillColor("#757575")
          .text(patient_summary, 60, TOP + 137);
        var posY = TOP + 137 + 17;

        if (
          booking.patientInfo.ethnicity_id &&
          booking.patientInfo.ethnicity_id.length > 0
        ) {
          doc
            .fontSize(10)
            .fillColor("#757575")
            .text(
              `${getTranslation(
                translation,
                "FORM",
                "ETHNICITY"
              )} : ${getTranslation(
                translation,
                "ETHINICITY",
                booking.patientInfo.ethnicity_id.toUpperCase()
              )}`,
              60,
              posY
            );
          posY += 17;
        }

        var emergencyContact = {};

        emergencyContact.fullName = booking.patientInfo.fullName;
        emergencyContact.phone_number = booking.patientInfo.phone_number;
        emergencyContact.relation = booking.patientInfo.relation;

        if (emergencyContact.fullName) {
          var emString = `${getTranslation(
            translation,
            "ALERT",
            "EMERGENCY_CONTACT"
          )}: ${emergencyContact.fullName}`;
          if (emergencyContact.relation) {
            emString = `${emString} (${getTranslation(
              translation,
              "RELATIONSHIPS",
              emergencyContact.relation.toUpperCase()
            )})`;
          }
          var w = doc.widthOfString(emString);
          doc.fontSize(10).fillColor("#757575").text(emString, 60, posY);
          if (emergencyContact.phone_number)
            doc
              .fontSize(10)
              .fillColor("#858585")
              .text(emergencyContact.phone_number, 60 + w, posY);
          posY += 17;
        }

        if (booking.family_member) {
          if (booking.family_member.family_address)
            doc
              .fontSize(10)
              .fillColor("#757575")
              .text(
                `${booking.family_member.family_address.address} `,
                60,
                posY,
                { width: WIDTH / 2 - 50 }
              );
        }
        if (
          booking.family_member == null ||
          getAge(booking.family_member.dob) < 18
        ) {
          // not family, or, minor family member
          if (
            booking.patientInfo &&
            booking.patientInfo.address &&
            booking.patientInfo.address.address
          )
            doc
              .fontSize(10)
              .fillColor("#757575")
              .text(`${booking.patientInfo.address.address} `, 60, posY, {
                width: WIDTH / 2 - 50,
              });
        }
      }

      doc.strokeColor("#ebedf2");
      var GRID_HEIGHT = 30;
      var TABLE_WIDTH = 500;

      var TABLE_TOP = 260;

      var data = [
        {
          label: getTranslation(translation, "MEDICATION", "COUNSELLING_ID"),
          value: booking.reference_id,
        },
        {
          label: getTranslation(translation, "MEDICATION", "COUNSELLING_TYPE"),
          value: getTranslation(
            translation,
            "CONSULTATION",
            (booking.councelling_type || "").toUpperCase()
          ),
        },
        {
          label: getTranslation(translation, "MEDICATION", "START_TIME"),
          value: `${scheduleTimeFormat(
            booking.schedule,
            booking.patientInfo.timezone_offset
          )}`,
        },
        {
          label: getTranslation(translation, "MEDICATION", "COUNSELLING_FOR"),
          value: (booking.family_member || booking.patientInfo).fullName,
        },
        {
          label: getTranslation(translation, "MEDICATION", "INVOICE_ID"),
          value: "#" + (booking.invoice || { id: "" }).id,
        },
        {
          label: getTranslation(translation, "MEDICATION", "STATUS"),
          value: getTranslation(
            translation,
            "CONSULTATION",
            (booking.status || "").toUpperCase()
          ),
        },
      ];

      var medical = null;
      if (booking.family_member) {
        medical = booking.family_member.family_medical;
      } else {
        if (booking.patientInfo && booking.patientInfo) {
          medical = booking.patientInfo.user_medical;
        }
      }

      if (medical) {
        if (booking.patientInfo.user_medical.weight != null)
          data.push({
            label: `${getTranslation(
              translation,
              "COLUMN",
              "PATIENT"
            )} ${getTranslation(translation, "FORM", "WEIGHT")} `,
            value: medical.weight,
          });
        if (medical.height != null)
          data.push({
            label: `${getTranslation(
              translation,
              "COLUMN",
              "PATIENT"
            )} ${getTranslation(translation, "FORM", "HEIGHT")} `,
            value: medical.height,
          });
        if (medical.bmi != null)
          data.push({
            label: `${getTranslation(
              translation,
              "COLUMN",
              "PATIENT"
            )} ${getTranslation(translation, "FORM", "BMI")} `,
            value: medical.bmi,
          });

        if (medical.blood_group != null)
          data.push({
            label: `${getTranslation(
              translation,
              "COLUMN",
              "PATIENT"
            )} ${getTranslation(translation, "FORM", "BLOOD_GROUP")} `,
            value: medical.blood_group,
          });
      }

      for (var y = 0; y < data.length + 1; y++) {
        doc.strokeColor("#ebedf2");
        doc.moveTo(50, TABLE_TOP + GRID_HEIGHT * y);
        doc.lineTo(50 + TABLE_WIDTH, TABLE_TOP + GRID_HEIGHT * y).stroke();

        if (y < data.length) {
          doc.strokeColor("#000");
          doc
            .text(data[y].label, 55, TABLE_TOP + GRID_HEIGHT * y + 12)
            .stroke();

          doc
            .text(
              data[y].value,
              55 + TABLE_WIDTH / 2,
              TABLE_TOP + GRID_HEIGHT * y + 12
            )
            .stroke();
        }
      }

      doc.strokeColor("#ebedf2");
      doc.moveTo(50, TABLE_TOP);
      doc.lineTo(50, TABLE_TOP + GRID_HEIGHT * data.length).stroke();

      doc.moveTo(50 + TABLE_WIDTH, TABLE_TOP);
      doc
        .lineTo(50 + TABLE_WIDTH, TABLE_TOP + GRID_HEIGHT * data.length)
        .stroke();

      doc.moveTo(50 + TABLE_WIDTH / 2, TABLE_TOP);
      doc
        .lineTo(50 + TABLE_WIDTH / 2, TABLE_TOP + GRID_HEIGHT * data.length)
        .stroke();

      doc.strokeColor("#000");

      if (booking.prescription) {
        doc.addPage();
        // PRESCRIPTION
        var prescription = booking.prescription;

        if (prescription && prescription.note) {
          prescription.default_note = prescription.note.default_note;
          prescription.multipleoptions_note =
            prescription.note.multipleoptions_note;
          prescription.singleoption_note = prescription.note.singleoption_note;
          prescription.dynamicnote = prescription.note.dynamicnote;
        }

        doc.rect(0, 45, 700, 40).fill("#E0E0E0");
        doc
          .fillColor("#000")
          .fontSize(15)
          .text(
            getTranslation(translation, "MY_HISTORY", "PRESCRIPTION"),
            40,
            60
          );

        if (typeof prescription.medications === "string")
          prescription.medications = JSON.parse(prescription.medications);
        var medications = prescription.medications || [];

        var provider = prescription.provider || {};

        var patient = booking.family_member || booking.patientInfo || {};
        provider = booking.providerInfo || {};
        if (patient === null) return;

        prescription.patient = patient;

        var TOP = 180;

        var PAGE_MARGIN_TOP = 30;

        var WIDTH = doc.page.width;
        var LINE_HEIGHT = 18;

        doc.fillColor("#000").fontSize(10);

        var yPrev = TOP - 60;
        if (medications.length) {
          doc
            .save()
            .moveTo(20, TOP - 60)
            .lineTo(WIDTH - 20, TOP - 60)
            .lineTo(WIDTH - 20, TOP - 20)
            .lineTo(20, TOP - 20)
            .lineTo(20, TOP - 60)
            .stroke("#707070");

          doc
            .fillColor("#000000")
            .stroke("#000000")
            .text(
              `${getTranslation(translation, "MEDICATION", "MEDICATION")}`,
              50,
              TOP - 50
            );

          var beforeHeight = TOP + 20;

          for (var total = 0; total < medications.length; total++) {
            var medication = medications[total];

            // get one block height
            var h = getHeightOfOneMediciation(medication, LINE_HEIGHT);
            if (doc.y + h > doc.page.height) {
              doc.addPage();
              beforeHeight = PAGE_MARGIN_TOP + 20;
              yPrev = PAGE_MARGIN_TOP;
              doc
                .moveTo(40, PAGE_MARGIN_TOP)
                .lineTo(WIDTH - 40, PAGE_MARGIN_TOP)
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
                  `${getTranslation(
                    translation,
                    "MEDICINES",
                    "DESCRIPTION_ATC"
                  )}`,
                  130,
                  beforeHeight + 1 * LINE_HEIGHT
                );
              doc
                .fillColor("#000")
                .text(
                  medicineObj.descriptionATC,
                  130 +
                  doc.widthOfString(
                    getTranslation(
                      translation,
                      "MEDICINES",
                      "DESCRIPTION_ATC"
                    )
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
                    getTranslation(
                      translation,
                      "MEDICINES",
                      "ADMINISTRATION_VIA"
                    )
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
                  `${getTranslation(
                    translation,
                    "MEDICINES",
                    "ACTIVE_PRINCIPLE"
                  )}`,
                  130,
                  beforeHeight + 3 * LINE_HEIGHT
                );
              doc
                .fillColor("#000")
                .text(
                  medicineObj.activePrinciple,
                  130 +
                  doc.widthOfString(
                    getTranslation(
                      translation,
                      "MEDICINES",
                      "ACTIVE_PRINCIPLE"
                    )
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
                .text(dayDuration, WIDTH - 100, beforeHeight, {
                  stroke: false,
                });
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
                  doc
                    .fillColor("#000")
                    .text(
                      `${medication.scheduleList[i].note}`,
                      40,
                      beforeHeight +
                      MEDICINE_OBJECT_NUMBER * LINE_HEIGHT +
                      i * LINE_HEIGHT +
                      LINE_HEIGHT,
                      {
                        lineBreak: true,
                        ellipsis: false,
                        height: LINE_HEIGHT * 2,
                      }
                    );
                  beforeHeight += LINE_HEIGHT * 2 + 5;
                }
              }
            }

            beforeHeight += 100;
            if (MEDICINE_OBJECT_NUMBER > 0) beforeHeight += 100;

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
        if (typeof prescription.recommendations == "string")
          prescription.recommendations = JSON.parse(
            prescription.recommendations
          );
        var recommendations = prescription.recommendations || [];

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
              `${getTranslation(
                translation,
                "PRESCRIPTIONS",
                "RECOMMENDATIONS"
              )}`,
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
          (prescription.followUpComments &&
            prescription.followUpComments.length)
        ) {
          if (doc.y + 300 > doc.page.height) {
            doc.addPage();
            yPrev = 50;
            beforeHeight = yPrev + 20;
          } else {
            yPrev = currentPos + 20;
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
                `${getTranslation(
                  translation,
                  "MEDICATION",
                  "DR_COMMENTS"
                )} - ${prescription.followUpComments}`,
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
            .stroke("#07070f");
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
                  .moveTo(40, doc.y)
                  .lineTo(WIDTH - 40, doc.y)
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
          currentPos = currentPos || doc.y + 20;
          var yPrev = currentPos + 20;
          beforeHeight = yPrev + 60;
          prescription.notes = prescription.notes.replace(/<(.|\n)*?>/g, '');
          var NOTES_HEIGHT =
            40 + doc.heightOfString(entities.decode(prescription.notes));
          if (yPrev + NOTES_HEIGHT > doc.page.height) {
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
              `${getTranslation(translation, "FORM", "NOTE")}`,
              50,
              yPrev + 10
            );
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

        if (prescription.cups) {
          if (typeof prescription.cups == "string")
            prescription.cups = JSON.parse(prescription.cups);
          if (prescription.cups.length) {
            var yPrev = currentPos + 20;
            beforeHeight = yPrev + 60;

            var CUPS_HEIGHT = getHeightOfCUPS(
              prescription.cups,
              LINE_HEIGHT,
              doc
            );

            if (yPrev + CUPS_HEIGHT > doc.page.height) {
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
                `${getTranslation(translation, "MEDICATION", "CUPS")}`,
                50,
                yPrev + 10
              );

            prescription.cups.forEach((c, index) => {
              doc.fontSize(12);
              doc.text(
                `${getTranslation(translation, "MEDICINES", "PROCESS")}: ${c.process
                }`,
                50,
                beforeHeight
              );
              beforeHeight += doc.heightOfString(
                `${getTranslation(translation, "MEDICINES", "PROCESS")}: ${c.process
                }`
              );
              doc.fontSize(10);
              doc.text(
                `${getTranslation(translation, "MEDICINES", "SECTION")}: ${c.section
                }`,
                50,
                beforeHeight
              );
              beforeHeight += doc.heightOfString(
                `${getTranslation(translation, "MEDICINES", "PROCESS")}: ${c.process
                }`
              );
              doc.text(
                `${getTranslation(translation, "MEDICINES", "CHAPTER")}: ${c.chapter
                }`,
                50,
                beforeHeight
              );
              beforeHeight += doc.heightOfString(
                `${getTranslation(translation, "MEDICINES", "CHAPTER")}: ${c.chapter
                }`
              );
              doc.text(
                `${getTranslation(translation, "MEDICINES", "GROUP")}: ${c.group
                }`,
                50,
                beforeHeight
              );
              beforeHeight += doc.heightOfString(
                `${getTranslation(translation, "MEDICINES", "GROUP")}: ${c.group
                }`
              );
              doc.text(
                `${getTranslation(translation, "MEDICINES", "SUBGROUP")}: ${c.subgroup
                }`,
                50,
                beforeHeight
              );
              beforeHeight += doc.heightOfString(
                `${getTranslation(translation, "MEDICINES", "SUBGROUP")}: ${c.subgroup
                }`
              );

              if (index < prescription.cups.length - 1)
                doc
                  .moveTo(40, doc.y)
                  .lineTo(WIDTH - 40, doc.y)
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

        if (prescription.diagnostics) {
          if (typeof prescription.diagnostics == "string")
            prescription.diagnostics = JSON.parse(prescription.diagnostics);
          if (prescription.diagnostics.length) {
            var yPrev = currentPos;
            beforeHeight = yPrev + 60;

            var DIAGNOSTICS_HEIGHT =
              50 +
              getHeightOfDiagnostics(
                prescription.diagnostics,
                doc,
                translation
              );

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
                `${diagnostics.cie_4_char}-${diagnostics.title}`,
                50,
                beforeHeight
              );
              beforeHeight += doc.heightOfString(
                `${diagnostics.cie_4_char}-${diagnostics.title}`
              );

              doc.text(diagnostics.discription, 50);
              beforeHeight += doc.heightOfString(diagnostics.discription);
              doc.text(
                `${getTranslation(
                  translation,
                  "CONSULTATION",
                  "DR_COMMENTS"
                )} ${diagnostics.comment}`,
                50
              );
              beforeHeight +=
                doc.heightOfString(
                  `${getTranslation(
                    translation,
                    "CONSULTATION",
                    "DR_COMMENTS"
                  )} ${diagnostics.comment}`
                ) + 10;
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
              c.note = entities.decode(c.note);
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
              c.note = c.note.replace(/(<([^>]+)>)/gi, "");
              doc.fontSize(12);
              doc.text(`${c.title}: ${c.note}`, 50, beforeHeight);
              beforeHeight += doc.heightOfString(`${c.title}: ${c.note}`);

              if (index < prescription.dynamicnote - 1)
                doc
                  .moveTo(40, doc.y)
                  .lineTo(WIDTH - 40, doc.y)
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

              var NOTE_HEIGHT =
                40 + prescription.multipleoptions_note.length * 100;

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
                    .moveTo(40, doc.y)
                    .lineTo(WIDTH - 40, doc.y)
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

              var NOTE_HEIGHT =
                40 + prescription.singleoption_note.length * 100;

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
                    .moveTo(40, doc.y)
                    .lineTo(WIDTH - 40, doc.y)
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

            doc.image(pngURL, WIDTH - 200, currentPos + 20, {
              scale: 0.3,
            });
          }
        } catch (e) {
          console.log(e);
        }
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
            .text(
              provider.associatedTo.user.company_name,
              40,
              currentPos + 130
            );
          if (!!addr) doc.fontSize(12).text(addr.address, 40, currentPos + 150);
        }

        doc.fontSize(12).text(provider.fullName, WIDTH - 200, currentPos + 10);
        // console.log(doc.y)
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

        // prescription end
      }

      if (booking.booking_calls && booking.booking_calls.length) {
        var booking_calls = booking.booking_calls;

        doc.addPage();

        doc.rect(0, 45, 700, 40).fill("#E0E0E0");
        doc
          .fillColor("#000")
          .fontSize(15)
          .text(
            getTranslation(translation, "MY_HISTORY", "EMOTION_INDEX"),
            40,
            60
          );

        doc.fillColor("#000").fontSize(12);

        var COLORLIST = [
          "#5AA454",
          "#E44D25",
          "#CFC0BB",
          "#7aa3e5",
          "#a8385d",
          "#aae3f5",
        ];

        var top = 190;
        var y = top;

        booking_calls.forEach((first_call, callIndex) => {
          if (first_call.mood && first_call.mood.mood) {
            if (typeof first_call.mood.mood === "string")
              first_call.mood.mood = JSON.parse(first_call.mood.mood);
            const mood = [];
            for (const key in first_call.mood.mood) {
              mood.push({
                name: getTranslation(
                  translation,
                  "MY_HISTORY",
                  key.toUpperCase()
                ),
                value: first_call.mood.mood[key],
              });
            }
            first_call.graphData = mood;

            if (callIndex > 0) y += 200;
            if (y + 60 > doc.page.height) {
              doc.addPage();
              y = 100;
            }
            mood.forEach((item, index) => {
              var x = 110 + (index % 4) * 130;
              if (index % 4 == 0 && index > 0) y += 150;
              if (y + 60 > doc.page.height) {
                doc.addPage();
                y = 100;
              }
              doc
                .circle(x, y, 50)
                .lineWidth(5)
                .strokeOpacity(0.3)
                .stroke(COLORLIST[index]);

              doc
                .path(describeArc(x, y, 50, 0, 360 * item.value))
                .strokeOpacity(0.7)
                .stroke(COLORLIST[index]);
              var valueStr = fixedNum(item.value) + "%";

              doc.text(valueStr, x - doc.widthOfString(valueStr) / 2, y - 8);

              var labelStr = item.name;
              doc.text(labelStr, x - doc.widthOfString(labelStr) / 2, y + 6);

              var bottomStr =
                getTranslation(translation, "MY_HISTORY", "EMOTION_INDEX") +
                fixedNum(item.value);
              doc.text(bottomStr, x - doc.widthOfString(bottomStr) / 2, y + 60);
            });
          }
        });
      }

      var analysis = booking.analysis;
      if (analysis) {
        if (typeof analysis.conditions === "string")
          analysis.conditions = JSON.parse(analysis.conditions);

        doc.addPage();

        doc.rect(0, 45, 700, 40).fill("#E0E0E0");
        doc
          .fillColor("#000")
          .fontSize(15)
          .text(getTranslation(translation, "MY_HISTORY", "SYMPTOMS"), 40, 60);

        doc.fillColor("#000").fontSize(12);
        var MARGIN = 100;
        var x = 50;
        beforeHeight = MARGIN;
        (analysis.conditions || []).forEach((c, index) => {
          if (beforeHeight + 75 > doc.page.height) {
            doc.addPage();
            beforeHeight = 20;
          }
          doc
            .fillColor("#000")
            .fontSize(12)
            .text(c.categories, x, beforeHeight)
            .stroke();
          doc
            .rect(x, beforeHeight + 15, 500, 5)
            .fillColor("gray")
            .fill();
          doc
            .rect(x, beforeHeight + 15, 500 * c.probability, 5)
            .fillColor("#ED3B5A")
            .fill();

          doc
            .fillColor("#000")
            .fontSize(10)
            .text(c.common_name, x, beforeHeight + 25)
            .fillColor("#000")
            .stroke();
          doc
            .fillColor("#3e3e3e")
            .fontSize(8)
            .text(
              `Probability: ${fixedNum(c.probability)}%`,
              x,
              beforeHeight + 38
            )
            .stroke();

          beforeHeight += 55;
        });
      }

      //////////////////////////////////INVOICE---------------
      var invoice = booking.invoice;
      if (invoice) {
        doc.addPage();

        let attr = ["title", "id"];
        if (lang === "es") {
          attr = [["title_es", "title"], "id"];
        }

        invoice = JSON.parse(JSON.stringify(invoice));
        if (typeof invoice.details !== "object")
          invoice.details = JSON.parse(invoice.details);

        // try {
        //     doc.image(`${IMG_DIR}/logo.png`, 40, 50, {
        //         fit: [166 / 1.5, 61 / 1.5]
        //     });
        // } catch (e) { console.log(e) }

        var title = `${getTranslation(
          translation,
          "INVOICES",
          "INVOICE_HEADING"
        )}`;
        if (invoice.status)
          title = `${title} (${getTranslation(
            translation,
            "INVOICES",
            invoice.status
          )})`;

        doc.rect(0, 45, 700, 40).fill("#E0E0E0");
        doc.fillColor("#000").fontSize(15).text(title, 40, 60);
        TOP = 20;

        // doc.fontSize(16).fillColor('#272b41').text(title, WIDTH / 2 - doc.widthOfString(title) / 2, TOP - 20);

        // doc.fontSize(10).fillColor('#272b41').text(`${getTranslation(translation, 'MEDICATION', 'COUNSELLING_ID')}:`, WIDTH - 100 - doc.widthOfString(`${getTranslation(translation, 'MEDICATION', 'COUNSELLING_ID')}:`), TOP)
        // doc.fontSize(10).fillColor('#757575').text(`#${invoice.booking.reference_id || ''}`, WIDTH - 95, TOP)

        // doc.fontSize(10).fillColor('#272b41').text(`${getTranslation(translation, 'MEDICATION', 'INVOICE_ID')}:`, WIDTH - 100 - doc.widthOfString(`${getTranslation(translation, 'MEDICATION', 'INVOICE_ID')}:`), TOP + 17)
        // doc.fontSize(10).fillColor('#757575').text(`#${invoice.id}`, WIDTH - 95, TOP + 17)

        // doc.fontSize(10).fillColor('#272b41').text(`${getTranslation(translation, 'MEDICATION', 'INVOICE_DATE')}:`, WIDTH - 100 - doc.widthOfString(`${getTranslation(translation, 'MEDICATION', 'INVOICE_DATE')}:`), TOP + 17 * 2)
        // doc.fontSize(10).fillColor('#757575').text(`${dateFormat(invoice.createdAt)}`, WIDTH - 95, TOP + 17 * 2)

        // doc.fontSize(10).fillColor('#272b41').text(`${getTranslation(translation, 'MEDICATION', 'COUNSELLING_STATUS')}:`, WIDTH - 100 - doc.widthOfString(`${getTranslation(translation, 'MEDICATION', 'COUNSELLING_STATUS')}:`), TOP + 17 * 3);
        // if (invoice.booking && invoice.booking.status) {
        //     var status = invoice.booking.status;
        //     status = status.charAt(0).toUpperCase() + status.slice(1);
        //     doc.fontSize(10).fillColor('#757575').text(`${status}`, WIDTH - 95, TOP + 17 * 3)
        // }

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            getTranslation(translation, "MEDICATION", "INVOICE_FROM"),
            WIDTH -
            60 -
            doc.widthOfString(
              getTranslation(translation, "MEDICATION", "INVOICE_FROM")
            ),
            TOP + 100
          );
        if (booking.providerInfo) {
          invoice.from = booking.providerInfo;
          doc
            .fontSize(12)
            .fillColor("#757575")
            .text(
              `${getTranslation(translation, "MY_HISTORY", "DR")} ${invoice.from.fullName
              }`,
              WIDTH -
              60 -
              doc.widthOfString(
                `${getTranslation(translation, "MY_HISTORY", "DR")} ${invoice.from.fullName
                }`
              ),
              TOP + 120
            );
          // doc.fontSize(10).fillColor('#757575').text(`${invoice.from.id_proof_type || ''}: ${invoice.from.national_id}`, WIDTH - 60 - doc.widthOfString(`${invoice.from.id_proof_type || ''}: ${invoice.from.national_id}`), TOP + 137);
        }

        if (invoice.from && invoice.from.address)
          doc
            .fontSize(10)
            .fillColor("#757575")
            .text(
              `${invoice.from.address.address}`,
              WIDTH - 60 - doc.widthOfString(`${invoice.from.address.address}`),
              TOP + 150,
              { width: WIDTH / 2 - 20 }
            );

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            getTranslation(translation, "MEDICATION", "INVOICE_TO"),
            50,
            TOP + 100
          );
        if (booking.patientInfo) {
          invoice.to = booking.patientInfo;
          doc
            .fontSize(12)
            .fillColor("#757575")
            .text(`${invoice.to.fullName}`, 50, TOP + 120);
          doc
            .fontSize(10)
            .fillColor("#757575")
            .text(`#${invoice.to.national_id || ""}`, 50, TOP + 132);
        }

        // if (invoice.to && invoice.to.address)
        //     doc.fontSize(10).fillColor('#757575').text(`${invoice.to.address.address} `, 50, TOP + 132, { width: WIDTH / 2 - 20 });

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            getTranslation(translation, "INVOICES", "INVOICE_DESCRIPTOPN"),
            50,
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
              50,
              TOP + 176
            );
          doc
            .fontSize(10)
            .fillColor("#757575")
            .text(
              `${invoice.booking.speciality.department.title}`,
              50 +
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
              50,
              TOP + 190
            );
          doc
            .fontSize(10)
            .fillColor("#757575")
            .text(
              `${invoice.booking.speciality.title}`,
              50 +
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
            50,
            TOP + 220
          );
        doc
          .fontSize(12)
          .fillColor("#757575")
          .text(`${invoice.payment_mod}`, 50, TOP + 240);

        doc
          .fillColor("#757575")
          .moveTo(WIDTH - 30, TOP + 250)
          .lineTo(WIDTH - 240, TOP + 250)
          .stroke("#757575");

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            `${getTranslation(translation, "DOCTOR_PROFILE", "FEES")}:`,
            WIDTH - 200,
            TOP + 259
          );
        if (invoice.details)
          doc
            .fontSize(12)
            .fillColor("#757575")
            .text(
              `$${invoice.details.provider_amount +
              invoice.details.provider_insured_cover
              }`,
              WIDTH - 100,
              TOP + 259
            );

        doc
          .fillColor("#757575")
          .moveTo(WIDTH - 30, TOP + 280)
          .lineTo(WIDTH - 240, TOP + 280)
          .stroke("#757575");

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            `${getTranslation(translation, "CLINIC", "INSURED_COVER")}:`,
            WIDTH - 200,
            TOP + 290
          );
        if (invoice.details)
          doc
            .fontSize(12)
            .fillColor("#757575")
            .text(
              `-$${invoice.details.provider_insured_cover}`,
              WIDTH - 100,
              TOP + 290
            );

        doc
          .fillColor("#757575")
          .moveTo(WIDTH - 30, TOP + 310)
          .lineTo(WIDTH - 240, TOP + 310)
          .stroke("#757575");

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            `${getTranslation(translation, "MEDICATION", "DISCOUNTS")}:`,
            WIDTH - 200,
            TOP + 320
          );
        doc
          .fontSize(12)
          .fillColor("#757575")
          .text(`-$${invoice.discount}`, WIDTH - 100, TOP + 320);

        doc
          .fillColor("#757575")
          .moveTo(WIDTH - 30, TOP + 340)
          .lineTo(WIDTH - 240, TOP + 340)
          .stroke("#757575");

        doc
          .fontSize(12)
          .fillColor("#272b41")
          .text(
            `${getTranslation(translation, "MEDICATION", "TOTAL")}:`,
            WIDTH - 200,
            TOP + 350
          );
        doc
          .fontSize(12)
          .fillColor("#757575")
          .text(`$${invoice.amount} `, WIDTH - 100, TOP + 350);

        doc
          .fillColor("#757575")
          .moveTo(WIDTH - 30, TOP + 370)
          .lineTo(WIDTH - 240, TOP + 370)
          .stroke("#757575");
        /////////////////////////////////////// INVOICE END ///////////////////////////////////////
      }

      // doc.pipe(res);

      doc.save();
      doc.end();

      if (fileName)
        doc.pipe(fs.createWriteStream(fileName)).on("close", (r) => {
          resolve(doc);
        });
      //debugging
      else resolve(doc);
    } catch (e) {
      reject(e);
      console.log(e);
    }
  });
};

module.exports = {
  createPDF: createPDF,
};
