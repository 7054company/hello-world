const express = require('express');
const app = express();

app.get('/', function(req, res) {
  res.send('Hello World!');
});

app.post('/', function(req, res) {
  res.send({ status: 'Success', message: 'Hello World' });
});

app.listen(3000, function () {
  console.log('Listening on port 3000!');
});
