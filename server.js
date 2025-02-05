const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

const PORT = process.env.PORT || 4001;

app.use((req, res, next) => {
    console.log(`This appears before the request is passed to the bodyParser.json() method. req.body lookes like:`)
    console.log(req.body)
    next()
});

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.status(200).json({ info: 'Node.js, Express, and Postgress API'})
});

app.post('/', (req, res) => {
    console.log(`After the request is passed to the bodyParser.json() method, the req.body lookes like:`)
    console.log(req.body)
    res.status(200).json(req.body)
});

app.listen(PORT, () => {
    console.log(`Server is listening to port ${PORT}`)
});
