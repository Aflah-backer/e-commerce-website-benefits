const MongoClient = require("mongodb").MongoClient;

const state = {
  db: null,
};
module.exports.connect = async (done) => {
  try {
    const url = process.env.MONGO
    // "mongodb+srv://beats:beats@beats.ke0ab6u.mongodb.net/?retryWrites=true&w=majority"
    const dbname = "Beats";
    MongoClient.connect(url, (err, data) => {
      if (err) return done(err);
      state.db = data.db(dbname);
      done();
    });
  } catch (err) {
    console.log(err);
  }
};

module.exports.get = () => {
  return state.db;
};


