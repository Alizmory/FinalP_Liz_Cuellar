// import dependencies you will use
const express = require('express');
const path = require('path');
const fileUpload = require('express-fileupload');
const mongoose = require('mongoose');
const session = require('express-session');

//const bodyParser = require('body-parser'); // not required for Express 4.16 onwards as bodyParser is now included with Express
// set up expess validator
const {check, validationResult} = require('express-validator'); //destructuring an object

// connect to DB
mongoose.connect('mongodb://localhost:27017/lizVet',{
    useNewUrlParser: true,
    useUnifiedTopology: true
});


// define the model

const Pet = mongoose.model('Pet', {
    clientName : String,
    clientEmailPhone : String,
    clientDescription : String,
    clientImageName : String
});

// define model for admin users

const User = mongoose.model('User', {
    userName: String,
    userPass: String
});

// set up variables to use packages
var myApp = express();

// set up the session middleware
myApp.use(session({
    secret: 'superrandomsecret',
    resave: false,
    saveUninitialized: true
}));

// myApp.use(bodyParser.urlencoded({extended:false})); // old way before Express 4.16
myApp.use(express.urlencoded({extended:false})); // new way after Express 4.16
myApp.use(fileUpload()); // set up the express file upload middleware to be used with Express
// set path to public folders and view folders
 
myApp.set('views', path.join(__dirname, 'views'));
//use public folder for CSS etc.
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');

var nameRegex = /^[a-zA-Z0-9]{1,}\s[a-zA-Z0-9]{1,}$/;

// set up different routes (pages) of the website
// render the home page
myApp.get('/',function(req, res){
    res.render('home'); // will render views/home.ejs
});

// render thx submit page
myApp.get('/thxsubmit',function(req, res){
    res.render('thxsubmit'); // will render views/thxsubmit.ejs
});

// render thx edit page
myApp.get('/thxedit',function(req, res){
    res.render('thxedit'); // will render views/thxedit.ejs
});

// render thx delete page
myApp.get('/thxdelete',function(req, res){
    res.render('thxdelete'); // will render views/thxdelete.ejs
});

// render the login page
myApp.get('/login',function(req, res){
    res.render('login'); // will render views/login.ejs
});

myApp.post('/login', function(req, res){
    // fetch username and pass
    var userName = req.body.userName;
    var userPass = req.body.userPass;

    // find it in the database
    User.findOne({userName: userName, userPass: userPass}).exec(function(err, user){
        // set up the session variables for logged in users
        console.log('Errors: ' + err);
        if(user){
            req.session.userName = user.userName;
            req.session.loggedIn = true;
            // redirect to dashboard
            res.redirect('/allpets');
        }
        else{
            res.redirect('/login'); // in case you want to redirect the user to login
            // alternatively, render login form with errors
            //res.render('login', {error: 'Incorrect username/password'}); // complete the logic on login.ejs file to show the error only if error is undefined.
        }
    });
});

// show all pets
myApp.get('/allpets',function(req, res){
    if(req.session.loggedIn){
        // write some code to fetch all the pets from db and send to the view allpets
        Pet.find({}).exec(function(err, pets){
            console.log(err);
            console.log(pets);
            res.render('allpets', {pets:pets}); // will render views/allpets.ejs
        });
    }
    else{
        res.redirect('/login');
    }
});

myApp.get('/logout', function(req, res){
    // destroy the whole session
    // req.session.destroy();
    // alternatively just unset the variables you had set 
    req.session.userName = '';
    req.session.loggedIn = false;
    res.redirect('/login');
});

myApp.get('/print/:petid', function(req, res){
    // --------add some logic to put this page behind login---------
    // write some code to fetch a pet and create pageData
    var petId = req.params.petid;
    Pet.findOne({_id: petId}).exec(function(err, pet){
        res.render('pet', pet); // render pet.ejs with the data from pet
    });
})
// to delete a pet from the database
myApp.get('/delete/:petid', function(req, res){
    // --------add some logic to put this page behind login---------
    var petId = req.params.petid;
    Pet.findByIdAndDelete({_id: petId}).exec(function(err, pet){
        //res.render('delete', pet); // render delete.ejs with the data from pet
        // send the data to the view and render it
        res.render('thxdelete', pet); 
    });
})
// edit a pet
myApp.get('/edit/:petid', function(req, res){
    // --------add some logic to put this page behind login---------
    var petId = req.params.petid;
    // write some logic to show the pet in a form with the details
    Pet.findOne({_id: petId}).exec(function(err, pet){
        res.render('edit', pet); // render edit.ejs with the data from pet
    });
})

// process the edited form from admin
myApp.post('/editprocess/:petid', function(req,res){
    if(!req.session.loggedIn){
        res.redirect('/login');
    }
    else{
        //fetch all the form fields
        var clientName = req.body.clientName; // the key here is from the name attribute not the id attribute
        var clientEmailPhone = req.body.clientEmailPhone;
        var clientDescription = req.body.clientDescription;
        var clientImageName = req.files.clientImage.name;
        var clientImageFile = req.files.clientImage; // this is a temporary file in buffer.
        // check if the file already exists or employ some logic that each filename is unique.
        var clientImagePath = 'public/uploads/' + clientImageName;
        // move the temp file to a permanent location mentioned above
        clientImageFile.mv(clientImagePath, function(err){
            console.log(err);
        });
        // find the pet in database and update it
        var petId = req.params.petid;
        Pet.findOne({_id: petId}).exec(function(err, pet){
            // update the pet and save
            pet.clientName = clientName;
            pet.clientEmailPhone = clientEmailPhone;
            pet.clientDescription = clientDescription;
            pet.clientImageName = clientImageName;
            pet.save();
            //res.render('thanks', pet); // render pet.ejs with the data from pet
            res.render('thxedit', pet); 
        });
        
    }
});




// process the form submission from the user
myApp.post('/process',[
    check('clientDescription', 'Please enter a description for your pet card.').not().isEmpty(),
    check('clientEmailPhone', 'Please enter a valid email address to generate your pet card.').not().isEmpty(),
    check('clientName', 'Please enter your full name, that is, first and last name.').matches(nameRegex)
], function(req,res){

    // check for errors
    const errors = validationResult(req);
    console.log(errors);
    if(!errors.isEmpty())
    {
        res.render('home',{er: errors.array()});
    }
    else
    {
        //fetch all the form fields
        var clientName = req.body.clientName; // the key here is from the name attribute not the id attribute
        var clientEmailPhone = req.body.clientEmailPhone;
        var clientDescription = req.body.clientDescription;

        // fetch the file 
        // get the name of the file
        var clientImageName = req.files.clientImage.name;
        // get the actual file
        var clientImageFile = req.files.clientImage; // this is a temporary file in buffer.

        // save the file
        // check if the file already exists or employ some logic that each filename is unique.
        var clientImagePath = 'public/uploads/' + clientImageName;
        // move the temp file to a permanent location mentioned above
        clientImageFile.mv(clientImagePath, function(err){
            console.log(err);
        });

        // create an object with the fetched data to send to the view
        var pageData = {
            clientName : clientName,
            clientEmailPhone : clientEmailPhone,
            clientDescription : clientDescription,
            clientImageName : clientImageName
        }

        // create an object from the model to save to DB
        var myPet = new Pet(pageData);
        // save it to DB
        myPet.save();

        // send the data to the view and render it
        res.render('thxsubmit', pageData); 
    }
});


// setup routes

myApp.get('/setup', function(req, res){

    let userData = [
        {
            userName: 'admin',
            userPass: 'admin'
        }
    ]
    User.collection.insertMany(userData);
    res.send('data added');
});

// start the server and listen at a port
myApp.listen(8080);

//tell everything was ok
console.log('Everything executed fine.. website at port 8080....');