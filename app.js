const express = require('express')
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require("fs");


const HOST = 'localhost';
const PORT = 3000;



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

    // Example users with roles
    const users = {
        admin: { password: 'password', role: 'admin' },
        user: { password: 'userpass', role: 'user' },
    };

    // Check username and password
    const user = users[username];
    if (user && user.password === password) {
        req.user = { username, role: user.role }; // Attach user info to the request object
        return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic');
    const error = new Error('Invalid username or password. You are not authenticated!');
    error.status = 401;
    return next(error);
}

function authorize(roles = []) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            const error = new Error('Forbidden: You do not have the necessary permissions!');
            error.status = 403;
            return next(error);
        }
        next();
    };
}

app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.render('welcome');
});


// Route to render an HTML view
app.get('/dashboard',authentication,  (req, res) => {
    res.render('index', { user: req.user });
});

app.post('/create',authentication, async (req, res) => {
    let { name, user, pass, remarks } = req.body;
    console.log(req.body)
    ///saving
    const newAccount = new Accounts({
        name: name,
        user: user,
        pass: pass,
        remarks: remarks,
        status:''
    });

    try {
        const savedAccount = await newAccount.save();

        return res.status(200).json({ success: true ,message: "Success " });

    } catch (err) {

        return res.status(400).json({ message: err.message });
    }
});

app.get('/getallaccounts', authentication, async (req, res) => {
    try {
        // Parse DataTables parameters
        const start = parseInt(req.query.start, 10) || 0; // Starting record
        const length = parseInt(req.query.length, 10) || 10; // Number of records per page
        const searchValue = req.query.search?.value || ''; // Search value
        const order = req.query.order || []; // Sorting order array
        const columns = req.query.columns || []; // Column definitions

        // Build the search filter
        const searchFilter = searchValue
            ? { $or: [{ name: { $regex: searchValue, $options: 'i' } }, { email: { $regex: searchValue, $options: 'i' } }] }
            : {};

        // Build the sort filter
        let sortFilter = {};
        if (order.length > 0) {
            const sortColumnIndex = parseInt(order[0].column, 10); // Column index for sorting
            const sortDirection = order[0].dir === 'asc' ? 1 : -1; // Sorting direction
            const sortColumn = columns[sortColumnIndex]?.data; // Column name to sort by

            if (sortColumn) {
                sortFilter[sortColumn] = sortDirection;
            }
        }

        // Fetch filtered, sorted, and paginated data
        const totalRecords = await Accounts.countDocuments(); // Total records in the collection
        const filteredRecords = await Accounts.countDocuments(searchFilter); // Total filtered records

        const accounts = await Accounts.find(searchFilter)
            .sort(sortFilter) // Apply sorting
            .skip(start)
            .limit(length);

        // Calculate 'done' accounts
        const doneCount = accounts.filter(account => account.status === "Done").length;

        // Return the DataTables response
        return res.json({
            draw: parseInt(req.query.draw, 10) || 1, // DataTables draw counter
            recordsTotal: totalRecords, // Total records
            recordsFiltered: filteredRecords, // Total filtered records
            data: accounts, // Data for the current page
            done: doneCount
        });
    } catch (err) {
        // Handle errors
        return res.status(500).json({ message: err.message });
    }
});


// Assume Accounts is your Mongoose model
app.get('/resettask', authentication, async (req, res) => {
    try {
        // Define the filter (empty means update all documents)
        const filter = {};

        // Define the update operation
        const update = { status: '' }; // Example: Set status to 'Active' for all records

        // Execute the update
        const result = await Accounts.updateMany(filter, update);

        return res.status(200).json({ success: true ,message: "Success " });
    } catch (error) {
        return res.status(500).json({ message: err.message });
    }
});



app.post('/login',authentication, async (req, res) => {
    let { user, pass , id } = req.body;
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

        //update status
        try {
            // Update one document
            const update = { status: 'Done' }; // The fields to update

            // Find by ID and update
            const updatedAccount = await Accounts.findByIdAndUpdate(
                id, 
                update, 
            );

            if (!updatedAccount) {
                console.log("No document found with this ID.");
            } else {
                console.log("Updated Document:", updatedAccount);
            }
        
          } catch (error) {
            console.error(error);
          }
    
        // Send success response
        res.json({ success: true, message: 'Login attempted' });
    } catch (error) {
        console.error('Error during Puppeteer login automation:', error);
        res.status(500).json({ success: false, message: 'An error occurred' });
    }
});


app.post('/deleteAccount',authentication, async (req, res) => {
    let { id } = req.body;
    try {
         // Find and delete the document by ID
         const deletedAccount = await Accounts.findByIdAndDelete(id);

         if (!deletedAccount) {
             console.log("No Account found with.");
             res.json({ success: false, message: 'Account Deleted' });
         } else {
             console.log("Deleted Document:", deletedAccount);
             res.json({ success: true, message: 'Account Deleted' });
         }
         
      } catch (error) {
        console.error(error);
      }

})



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



app.listen(port, async () => {
    console.log(`Example app listening on port ${port}`);

  
    console.log('opening browser')
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });
    const page = await browser.newPage();
    await page.goto(`http://${HOST}:${PORT}/`);
});
