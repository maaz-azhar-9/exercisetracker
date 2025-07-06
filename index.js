const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
})

let logSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: String
  }
})

let exerciseSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  log: {
    type: [logSchema]
  }
})


let userModel = new mongoose.model("user", userSchema);
let exerciseModel = new mongoose.model("exercise", exerciseSchema);

app.use(cors())
app.use(bodyParser());
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users", (req, res) => {
  let user = new userModel({
    username: req.body.username
  })
  user.save().then((user) => {
    res.json(user);
  }).catch((err) => {
    res.json({ error: err });
  })
})
app.get("/api/users", (req, res) => {
  userModel.find().then((users) => {
    res.json(users)
  })
})

app.post("/api/users/:_id/exercises", (req, res) => {

  const userId = req.params._id;

  userModel.findById(userId).then((user) => {
    exerciseModel.findById(userId).then((resExercise) => {
      const date = req.body.date ? new Date(req.body.date) : new Date();
      const myLog = {
        "description": req.body.description,
        "duration": Number(req.body.duration),
        "date": date.toDateString()
      }
      if (!resExercise) {
        let exercise = new exerciseModel({
          "_id": userId,
          "log": myLog
        })

        exercise.save().then((exercise) => {
          res.json({
            date: myLog.date,
            description: myLog.description,
            duration: Number(myLog.duration),
            username: user.username,
            _id: exercise._id
          })
        })
      }
      else {
        resExercise.log.push(myLog);
        resExercise.save().then(() => {
          res.json({
            _id: resExercise._id,
            username: user.username,
            date: myLog.date,
            duration: Number(myLog.duration),
            description: myLog.description,
          })
        })
      }
    })
  })

})

app.get("/api/users/:_id/logs", (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  userModel.findById(userId).then((user) => {
    exerciseModel.findById(userId).then((exerciseDoc) => {
      if (!exerciseDoc) {
        return res.json({
          _id: user._id,
          username: user.username,
          count: 0,
          log: []
        });
      }
      if (from || to || limit) {
        let logs = exerciseDoc.log;
        // Filter by from and to
        if (from) {
          const fromDate = new Date(from);
          logs = logs.filter(item => new Date(item.date) >= fromDate);
        }
        if (to) {
          const toDate = new Date(to);
          logs = logs.filter(item => new Date(item.date) <= toDate);
        }
        // Apply limit
        if (limit) {
          logs = logs.slice(0, Number(limit));
        }
        res.json({
          _id: user._id,
          username: user.username,
          count: logs.length,
          log: logs
        });
      }
      else {
        res.json({
          _id: userId,
          username: user.username,
          count: exerciseDoc.log.length,
          log: exerciseDoc.log
        })
      }
    })
  })
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
