const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
    console.log(`Server is listening to port ${PORT}`)
});

module.exports = app;