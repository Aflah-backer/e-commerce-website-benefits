require("dotenv").config();

const accountSID = process.env.TWILIO_ACCOUNTSID;
const authToken = process.env.TWILIO_AUTHTOKEN;
const serviceId = process.env.TWILIO_SERVICEID;
const client = require("twilio")(accountSID, authToken);

module.exports = {
  makeOtp: (MobNumber) => {
    return new Promise(async (resolve, reject) => {
      try {
        const verifications = await client.verify
          .services(process.env.TWILIO_SERVICEID)
          .verifications.create({
            to: `+91${MobNumber}`,
            channel: "sms",
          });
        resolve(verifications);
      } catch (error) {
        reject(error);
      }
    });
  },
  verifyOtp: (otp, MobNumber) => {
    return new Promise(async (resolve, reject) => {
      try {
        const verification_check = await client.verify
          .services(process.env.TWILIO_SERVICEID)
          .verificationChecks.create({
            to: `+91${MobNumber}`,
            code: otp,
          });
        resolve(verification_check);
      } catch (error) {
        reject(error);
      }
    });
  },
};
