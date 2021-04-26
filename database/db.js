const mongoose = require('mongoose');
mongoose.connect(
    "mongodb+srv://<user>:<password>@<cluster-url>?retryWrites=true&writeConcern=majority",
    { useNewUrlParser: true,useUnifiedTopology: true,useCreateIndex: true})

module.exports = mongoose;