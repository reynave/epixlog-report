require('dotenv').config();
const sql = require('msnodesqlv8');
const express = require('express');
const app = express();
const fs = require('fs');
const port = process.env.PORT;
const connectionString = "Driver={"+process.env.SQL_DRIVE+"};Server="+process.env.SQL_SERVER+";Database="+process.env.SQL_DATABASE+";Trusted_Connection=yes;";

//Solve CORS Origin issue
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    // res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Headers', '*');
    // res.setHeader('Access-Control-Allow-Headers', 'Key, Token'); 
    // res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
  

// sql.query(connectionString, "select GETDATE() as 'today'", (err, rows) => {
//     if (err) {
//         console.error('Error: ' + err);
//     } else {
//         console.log('DB Success',rows);
//     }
// });


app.use(express.json());
app.use(express.static(__dirname + '/public'));

app.use('/report', require('./controllers/report'));

app.get('/', (req, res) => {
    fs.readFile(__dirname + '/public/index.html', 'utf8', (err, text) => {
        res.send(text);
    });
});

app.get('/table.html', (req, res) => {
    fs.readFile(__dirname + '/public/table.html', 'utf8', (err, text) => {
        res.send(text);
    });
});
 
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});