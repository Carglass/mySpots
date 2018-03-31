//-----------------------//
// Global App Management //
//-----------------------//

var STATE = {
    LOGIN: 1,
    SIGNUP: 2,
    MAIN: 3,
    MAIN_MENU: 4,
    MAIN_CREATE_SPOT: 5,
    MAIN_ZOOM_SPOT: 6,
}

var app_view = {
    state: 5,
    setState: function(newState){
        //change the state to newState
        this.state = newState;
        //call render
        this.render();
    },
    render: function(){
        // assign jQuery elements to variables, for faster reuse
        let loginPage = $('#login-page');
        let signupPage = $('#signup-page');
        let mainApp = $('#main-app');
        let spotCreationPage = $('#spot-creation-page');
        let spotViewPage = $('#spot-view-page');
        //switch case on state, and shows/hides the appropriate bloc in html
        if (this.state === 1){
            loginPage.show();
            signupPage.hide();
            mainApp.hide();
            spotCreationPage.hide();
            spotViewPage.hide();
        } else if (this.state === 2){
            loginPage.hide();
            signupPage.show();
            mainApp.hide();
            spotCreationPage.hide();
            spotViewPage.hide();
        } else if (this.state === 3){
            loginPage.hide();
            signupPage.hide();
            mainApp.show();
            spotCreationPage.hide();
            spotViewPage.hide();
        } else if (this.state === 4){
            // need to add another group for menu
            loginPage.hide();
            signupPage.hide();
            mainApp.hide();
            spotCreationPage.hide();
            spotViewPage.hide();
        } else if (this.state === 5){
            loginPage.hide();
            signupPage.hide();
            mainApp.hide();
            spotCreationPage.show();
            spotViewPage.hide();
        } else if (this.state === 6){
            loginPage.hide();
            signupPage.hide();
            mainApp.hide();
            spotCreationPage.hide();
            spotViewPage.show();
        }
    }
}



//-------------------------//
// FireBase Initialization //
//-------------------------//

var database = firebase.database();

//----------------------//
// spots Management //
//----------------------//

var spots = {
    // spotArray stores the spot objects for a quick access, sorting etc
    spotsArray: [],
    // called on child_added, stores the new spot into spots, then call render
    pushspot: function(newSpot){
        this.spotsArray.push(newSpot);
        this.render();
    },
    // used on spotArray, call each individual render
    render: function(){
        for (let spotInstance of this.spotsArray){
            console.log(spotInstance);
        }
    },
    // triggered on a regular interval, asks every spot to update its timeTo value
    updateRoutine: function(){
        // for loop on spotsArray that calls element.updatespotData (for performance improvement, it could call render on all elements but the last, then update information on the last, not sure it is nice though)
    },
}

// spot Object constructor, called on child_added
function spot(uid,label,address,type,isFavorite){
    // identification properties, could be encapsulated in an object
    this.uid = uid;
    this.label = label;
    this.address = address;
    this.type = type;
    this.isFavorite = isFavorite;
    // current information, comes from GMaps API, could be encapsulated
    this.timeTo = 0;
    // function that go fetch data, then assign them to properties
    this.fetchData = function(callback){
        callback();
    };
    // function that renders the spot
    this.render = function(){

    };
    // function that update the spot information, and renders
    this.updatespotData = function(){
        this.fetchData(this.render);
    };
};

//----------------------//
// spots Management //
//----------------------//

// function that will be triggered by a click on data-spot-create
function createSpotInFirebase(label,address,type,isFavorite){
    console.log('createspotInFirebase runs');
    console.log(label + address)
    // builds an object to store the values, quick check on type and isFavorite to send nothing if nothing received from user (optional parameter)
    let newSpot = {
        label: label,
        address: address,
        type: type ? type : null,
        isFavorite: isFavorite ? isFavorite : null,
    }
    // [NICE TO HAVE] blocks the UI to avoid multiple ressource creation (killing event on data-spot-create)
    // [NICE TO HAVE] Waiting screen
    // resets creation page UI (empty inputs)
    $('#data-spot-label').val('');
    $('#data-spot-address').val('');
    // creates ressource in Firebase, once we get the confirmation it is done, goes back to main page
    database.ref('users/max/locations').push(newSpot, function(){
        app_view.setState(STATE.MAIN);
        // [NICE TO HAVE] also needs to reactivate data-spot-create
        // [NICE TO HAVE] hides waiting screen
    });
}

database.ref('users/max/locations').on("child_added", function(snapshot){
    let uid = snapshot.key;
    let label = snapshot.val().label;
    let address = snapshot.val().address;
    let type = snapshot.val().address ? snapshot.val().address : null;
    let spotIter = new spot(uid, label, address, type);
    console.log(spotIter);
    spots.pushspot(spotIter);
});


//------------------------//
// Control Initialization //
//------------------------//

$(document).ready(function(){
    // used for testing purpose, to set environement in main app, to skip login
    app_view.render();

    // event on creation spot
    $(document).on('click','#data-spot-create', function(){
        let label = $('#data-spot-label').val();
        let address = $('#data-spot-address').val();
        createSpotInFirebase(label,address);
    });
});
