const express = require('express')
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require("fs");



const app = express()
app.use(cors());  // Enable all CORS requests
const path = require('path');

// Set the view engine to EJS
app.set('view engine', 'ejs');


// Set the views directory
app.set('views', path.join(__dirname, 'views'));

app.use('/public', express.static('public'));

const Accounts = require('./models/accounts.model.js');
const { userInfo } = require('os');

app.use(bodyParser.json());

const port = 3000

function authentication(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic');
        const error = new Error('Authorization header missing. You are not authenticated!');
        error.status = 401;
        return next(error);
    }

    const encodedCredentials = authHeader.split(' ')[1];
    if (!encodedCredentials) {
        res.setHeader('WWW-Authenticate', 'Basic');
        const error = new Error('Malformed Authorization header. You are not authenticated!');
        error.status = 401;
        return next(error);
    }

    const credentials = Buffer.from(encodedCredentials, 'base64').toString().split(':');
    const [username, password] = credentials;

    if (username === 'admin' && password === 'password') {
        return next(); // User authenticated successfully
    }

    res.setHeader('WWW-Authenticate', 'Basic');
    const error = new Error('Invalid username or password. You are not authenticated!');
    error.status = 401;
    return next(error);
}

app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.render('welcome');
});


// Route to render an HTML view
app.get('/dashboard',authentication,  (req, res) => {
    res.render('index');
});

app.post('/create',authentication, async (req, res) => {
    let { name, user, pass } = req.body;
    console.log(req.body)
    ///saving
    const newAccount = new Accounts({
        name: name,
        user: user,
        pass: pass,
        status:''
    });

    try {
        const savedAccount = await newAccount.save();

        return res.status(200).json({ message: "Success " });

    } catch (err) {

        return res.status(400).json({ message: err.message });
    }
});

app.get('/getallaccounts',authentication, async (req, res) => {
    try {
        // Fetch all accounts from the Accounts collection
        const accounts = await Accounts.find();

        // If no accounts are found, return a message
        if (accounts.length === 0) {
            return res.status(404).json({ message: "No accounts found" });
        }

        return res.json({
            draw: req.query.draw, // DataTables draw counter
            recordsTotal: accounts.length, // Total records in the database
            recordsFiltered: accounts.length, // Filtered records (no filtering implemented in this example)
            data: accounts // Data to display
        });

    } catch (err) {
        // Handle errors (e.g., database connection issues)
        return res.status(500).json({ message: err.message });
    }
});

app.post('/login',authentication, async (req, res) => {
    let { user, pass } = req.body;
    console.log(req.body);
    try {
        // Launch Puppeteer and navigate to Facebook
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: null
        });
        const page = await browser.newPage();
        await page.goto('https://www.facebook.com');

        // Perform login automation
        await page.type('[name="email"]', user);
        await page.type('[name="pass"]', pass);
        
        // Optionally, you can simulate a click on the login button
        //await page.click('[name="login"]');
    
        // Send success response
        res.json({ success: true, message: 'Login attempted' });
    } catch (error) {
        console.error('Error during Puppeteer login automation:', error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
});


app.get('/logoutUser', (req, res) => {
    res.status(401).send('You have been logged out.'); // Forces browser to re-prompt for credentials
});

///db connection

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://kronovi24:aezakmi24@pictu-db.3yj3b0d.mongodb.net/pgo?retryWrites=true&w=majority&appName=pictu-db")
        console.log("Connect to MongoDB successfully")
    } catch (error) {
        console.log("Connect failed " + error.message)
    }
}

connectDB();



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})