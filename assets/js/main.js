//-----------------------//
// Global App Management //
//-----------------------//
var intervalToSendRequest;
var watchLocalisation;
var geocoder;


var STATE = {
    LOGIN: 1,
    SIGNUP: 2,
    MAIN: 3,
    MAIN_MENU: 4,
    MAIN_CREATE_SPOT: 5,
    MAIN_ZOOM_SPOT: 6,
    MENU_DELETE_SPOTS: 7,
    MENU_PREFERENCES: 8,
}

var app_view = {
    state: 1,
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
        let menu = $('#menu-list');
        let spotsDeletionPage = $('#spots-deletion-page');
        let preferencesPage = $('#preferences-page');
        //switch case on state, and shows/hides the appropriate bloc in html
        if (this.state === 1){
            loginPage.show();
            signupPage.hide();
            mainApp.hide();
            // spotCreationPage.hide();
            spotViewPage.hide();
            menu.hide();
            spotsDeletionPage.hide();
            preferencesPage.hide();
        } else if (this.state === 2){
            loginPage.hide();
            signupPage.show();
            mainApp.hide();
            // spotCreationPage.hide();
            spotViewPage.hide();
            menu.hide();
            spotsDeletionPage.hide();
            preferencesPage.hide();
        } else if (this.state === 3){
            loginPage.hide();
            signupPage.hide();
            mainApp.show();
            // spotCreationPage.hide();
            spotViewPage.hide();
            menu.hide();
            spotsDeletionPage.hide();
            preferencesPage.hide();
        } else if (this.state === 4){
            // TODO: evaluate if useful, as .toggle() may be able to do the job
            loginPage.hide();
            signupPage.hide();
            mainApp.show();
            // spotCreationPage.hide();
            spotViewPage.hide();
            menu.show();
            spotsDeletionPage.hide();
            preferencesPage.hide();
        } else if (this.state === 5){
            loginPage.hide();
            signupPage.hide();
            mainApp.hide();
            // spotCreationPage.show();
            spotViewPage.hide();
            menu.hide()
            spotsDeletionPage.hide();
            preferencesPage.hide();
        } else if (this.state === 6){
            loginPage.hide();
            signupPage.hide();
            mainApp.hide();
            // spotCreationPage.hide();
            spotViewPage.show();
            menu.hide()
            spotsDeletionPage.hide();
            preferencesPage.hide();
        } else if (this.state === 7){
            loginPage.hide();
            signupPage.hide();
            mainApp.hide();
            // spotCreationPage.hide();
            spotViewPage.hide();
            menu.hide()
            spotsDeletionPage.show();
            preferencesPage.hide();
        } else if (this.state === 8){
            loginPage.hide();
            signupPage.hide();
            mainApp.hide();
            // spotCreationPage.hide();
            spotViewPage.hide();
            menu.hide()
            spotsDeletionPage.hide();
            preferencesPage.show();
        } 
    }
}


// a user object to store his/her location, preferences etc
var user = {
    position: undefined,
    preferences: {
        transportMode: 'DRIVING',
    },
    renderPreferences: function(){
        // render transport Mode to its initial value
        if (this.preferences.transportMode === 'DRIVING'){
            $('#transport-mode-select').val('DRIVING');
        } else if (this.preferences.transportMode === 'WALKING'){
            $('#transport-mode-select').val('WALKING');
        } else if (this.preferences.transportMode === 'BIKING'){
            $('#transport-mode-select').val('BIKING');
        } else if (this.preferences.transportMode === 'TRANSIT'){
            $('#transport-mode-select').val('TRANSIT');
        }
    },
    updatePreferencesIntoFirebase: function(newPreferences){
        database.ref('users/' + firebase.auth().currentUser.uid + '/preferences').set(newPreferences, function(){
            app_view.setState(STATE.MAIN);
            // [NICE TO HAVE] also needs to reactivate data-spot-create
            // [NICE TO HAVE] hides waiting screen
        });
    },
    getPreferencesFromFirebase: function(){
        database.ref('users/' + firebase.auth().currentUser.uid + '/preferences').on("value", function(snapshot){
            console.log(snapshot.val());
            let updatedPreferences = snapshot.val();
            user.preferences = updatedPreferences;
            spots.getTimeToDestinations();
        });
    },
    reset: function(){
        this.preferences = {
            transportMode: '',
        };
        this.position = undefined;
    }
}

// creates this global variable to indicate that data has not been loaded from Firebase yet
var initialDataIsReady = false;

//----------------------------//
// Geolocalization Management //
//----------------------------//

// function that gets the user location from the navigator API (accessing whatever the navigator uses Wifi, GPS etc)
// TODO: could be improved to WATCH the location, thus allowing for updates based on user movement
// TODO: move it into user
function getUserLocalization (){
    function error(err) {
        console.warn('ERROR(' + err.code + '): ' + err.message);
      }
      
      options = {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0
      };
      
      id = navigator.geolocation.watchPosition(function(position){
        user.position = [];
        // creates a small Array of length 2, for easier use for Gmaps conversion
        user.position.push(position.coords.latitude, position.coords.longitude);
        console.log(user.position);
        setUserMarker(position.coords.latitude, position.coords.longitude);
        // calls the Gmaps request
        // TODO: evaluate the interest of creating a user.setPosition method that would call it instead
        spots.getTimeToDestinations();
        // if (!intervalToSendRequest){
        //     intervalToSendRequest = window.setInterval(getUserLocalization,5000);
        // }
    }, error, options);
}

//--------------------------//
// Request to get durations //
//--------------------------//

function getDurationsToSpots(origin, destinations){
    console.log('Im running and sending!');
    // converting latitude and longitude from Geoloc into a google object
    let origin1 = new google.maps.LatLng(...origin);
    // initializing the service for getting the durations, and launche the request
    var service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
            // origins has only one element, the current position of the user
          origins: [origin1],
          // destinations is supposed to be called with the list of the spot addresses
          destinations: destinations,
          // by default we ask for driving durations
          // TODO: have a setting to select the favorite mode of transport
          travelMode: user.preferences ? user.preferences.transportMode : 'DRIVING',
        }, onDurationsReceived);
}

function onDurationsReceived(response, status) {
    console.log('I received an update!');
    // get the number of duration
    let numberOfDestinations = response.rows[0].elements.length;
    console.log(response.rows[0]);
    for (let i = 0; i < numberOfDestinations; i++){
        // assigning the received duration to its spot
        spots.spotsArray[i].timeTo = response.rows[0].elements[i].duration.text;
    }
    // renders the spots to display the durations.
    spots.render();
  }

//----------------------//
// Google Maps API Init //
//----------------------//

function setUserMarker (newLat, newLong) {
    // must check spotsArray for data, if yes, then fire function to plot spot

    var currentSpot = {lat: newLat, lng: newLong};

    var marker = new google.maps.Marker({
        position: currentSpot,
        map: map,
        icon: {
        'path': google.maps.SymbolPath.CIRCLE,
        'fillColor': '#C8D6EC',
        'fillColor': '#4285F4',
        'fillOpacity': 1,
        'scale': 6,
        'strokeColor': 'white',
        'strokeWeight': 2,
        },
    });
    map.panTo(currentSpot);
}

function setSpotMarker (spotToCode){
    geocoder.geocode( { 'address': spotToCode.address}, function(results, status) {
        if (status == 'OK') {
          var marker = new google.maps.Marker({
              map: map,
              position: results[0].geometry.location
          });
          spots.markersArray.push({uid: spotToCode.uid, marker: marker});
        } else {
          alert('Geocode was not successful for the following reason: ' + status);
        }
      });
  
}

var map;

function initMap (){
    var currentSpot = {lat: 41.87, lng: 87.63};
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 4,
      center: currentSpot
    });
    map.setZoom(16);
    spots.getTimeToDestinations();
    activateAutoComplete();
    geocoder = new google.maps.Geocoder();
}

//-------------------------//
// FireBase Initialization //
//-------------------------//

var database = firebase.database();

//------------------------//
// Preferences Management //
//------------------------//

//TODO: need a value added to load preferences at load

//TODO: need a value changed to manage preferences change

//TODO: find a way to initialize preferences when user is created

//------------------//
// spots Management //
//------------------//

var spots = {
    // spotArray stores the spot objects for a quick access, sorting etc
    spotsArray: [],
    markersArray: [],
    reset: function(){
        this.spotsArray = [];
        for (element of this.markersArray){
            element.marker.setMap(null);
        }
        this.markersArray = [];
    },
    // called on child_added, stores the new spot into spots, then call render
    // maybe useless as it will trigger a lot at app startup
    pushspot: function(newSpot){
        this.spotsArray.push(newSpot);
        this.render();
    },
    // used on spotArray, call each individual render
    render: function(){
        $('#spots').empty();
        for (let spotInstance of this.spotsArray){
            spotInstance.render();
        }
    },
    // triggered on a regular interval, asks every spot to update its timeTo value
    updateRoutine: function(){
        // for loop on spotsArray that calls element.updatespotData (for performance improvement, it could call render on all elements but the last, then update information on the last, not sure it is nice though)
    },
    getTimeToDestinations: function(){
        // if google API is ready, and geolocalization is available, and data is received from firebase, then fire the request for distance matrix
        if (typeof google !== 'undefined' && user.position && initialDataIsReady){
            // create the array of destinations from the addresses in the spots
            let destinationsArray = spots.getDestinationsArray();
            // call for the function that will launch the API request
            getDurationsToSpots(user.position,destinationsArray);
            // if (!intervalToSendRequest){
            //     intervalToSendRequest = window.setInterval(getDurationsToSpots.bind(window,user.position,spots.getDestinationsArray()),30000);
            // }
        }
    },
    getDestinationsArray: function(){
        let destinationsArray = [];
            for (let spotIter of spots.spotsArray){
                destinationsArray.push(spotIter.address);
            }
        return destinationsArray;
    },
    renderForDeletion: function(){
        $('#spots-deletion-list').empty();
        for (let spotInstance of this.spotsArray){
            console.log(spotInstance.uid);
            // creating the elements
            let liContainer = $('<li></li>');
            let labelContainer = $('<div></div>');
            let checkboxContainer = $('<input></input>');
            // adding data-*
            checkboxContainer.attr('data-deletion-spotid', spotInstance.uid);
            //adding input type
            checkboxContainer.attr('type', 'checkbox');
            // adding classes
                // this one is for control
            checkboxContainer.addClass('deletionCheckbox');
                //those are for style
            liContainer.addClass('liDeletion');
            labelContainer.addClass('spotLabelDeletion');
            checkboxContainer.addClass('spotCheckboxDeletion');
            // adding Content
            labelContainer.text(spotInstance.label);
            // pushing the element to HTML
            liContainer.append(labelContainer).append(checkboxContainer);
            $('#spots-deletion-list').append(liContainer);
        }
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
        // TODO: maybe think about suppressing it, as the request for durations is done on spots directly 
        //for test only 
        this.timeTo = '-- min'; 
        //callback may need an existence test before being called as it is optional
        callback();
    };
    // function that renders the spot
    this.render = function(){
        console.log(this.timeTo);
        // creating the div elements
        let spotElement = $('<div></div>');
        let spotElementLabel = $('<div></div>');
        let spotElementTimeTo = $('<div></div');
        // TODO: create data-* and change Class name to remove dashes
        // adding ids
        spotElement.attr('id','spot' + this.uid);
        spotElementLabel.attr('id','spot' + this.uid + '-label');
        spotElementTimeTo.attr('id','spot' +this.uid + '-timeTo');
        // adding classes
        spotElement.addClass('spot').addClass('col-12');
        spotElementLabel.addClass('spot-label');
        spotElementTimeTo.addClass('spot-timeTo');
        // adding Content
        spotElementLabel.text(this.label);
        spotElementTimeTo.text(this.timeTo);
        // pushing the element to HTML
        spotElement.append(spotElementLabel).append(spotElementTimeTo);
        $('#spots').append(spotElement);
    };
    // function that update the spot information, and renders
    this.updatespotData = function(){
        this.fetchData(this.render);
    };
};

//----------------------------------------//
// spots Creation Management with Firebase//
//----------------------------------------//



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
    // TODO: [NICE TO HAVE] blocks the UI to avoid multiple ressource creation (killing event on data-spot-create)
    // TODO: [NICE TO HAVE] Waiting screen
    // resets creation page UI (empty inputs)
    $('#data-spot-label').val('');
    $('#data-spot-address').val('');
    // creates ressource in Firebase, once we get the confirmation it is done, goes back to main page 
    database.ref('users/' + firebase.auth().currentUser.uid + '/locations').push(newSpot, function(){ 
        app_view.setState(STATE.MAIN);
        // TODO: [NICE TO HAVE] also needs to reactivate data-spot-create
        // TODO: [NICE TO HAVE] hides waiting screen
    });
}

// autocomplete module 'powered by Google'
function activateAutoComplete(){
    var input = document.getElementById('data-spot-address');
    var options = {
    };
    autocomplete = new google.maps.places.Autocomplete(input, options);    
}

function listenToSpotsCreation (){
    database.ref('users/' + firebase.auth().currentUser.uid + '/locations').on("child_added", function(snapshot){
        let uid = snapshot.key;
        let label = snapshot.val().label;
        let address = snapshot.val().address;
        let type = snapshot.val().address ? snapshot.val().address : null;
        let spotIter = new spot(uid, label, address, type);
        console.log(spotIter);
        spots.spotsArray.push(spotIter);
        // fetchData will be removed, need to manage asynchronous
        spotIter.fetchData(spotIter.render.bind(spotIter));
        // change global variable is ready to true, will be used by distance request to ensure firebase data is here
        initialDataIsReady = true;
        // TODO: collecting the length of the locations in Firebase, it would be possible to throw the getDuration only when all spots are loaded, rather than on every child
        // maybe by changing initialDataIsReady to true only at that time
        spots.getTimeToDestinations();
        setSpotMarker(spotIter);
    });
}

//---------------------------//
// Spots Deletion Management //
//---------------------------//

function deleteSpotsFromFirebase(){
    for (let i = 0; i < spots.spotsArray.length; i++){
        let isToBeDeleted = $("input[data-deletion-spotid='" + spots.spotsArray[i].uid +"']").is(":checked");
        if (isToBeDeleted){
            database.ref('users/' + firebase.auth().currentUser.uid + '/locations/' + spots.spotsArray[i].uid).remove().then(function(){
                app_view.setState(STATE.MAIN);
            });
        }
    }
}


function listenToSpotsDeletion (){
    database.ref('users/' + firebase.auth().currentUser.uid + '/locations').on("child_removed", function(snapshot){
        let deletedUid = snapshot.key;
        let tempSpotsArray = spots.spotsArray.slice();
        for (let i = 0; i < spots.spotsArray.length; i++){
            if (spots.spotsArray[i].uid === deletedUid){
                // TODO: Understand why it works, it should not as the index i is not
                // the good one after the first splice
                tempSpotsArray.splice(i,1);
            }
            if (spots.markersArray[i].uid === deletedUid){
                // TODO: Understand why it works, it should not as the index i is not
                // the good one after the first splice
                spots.markersArray[i].marker.setMap(null);
            }
        }
        spots.spotsArray = tempSpotsArray;
        spots.render();
    });
}

//-------------------------//
// Login Logout Management //
//-------------------------//

//listener on connection/disconnection
firebase.auth().onAuthStateChanged(function (connectedUser) {
    // test on user to know if a user is connected
    if (connectedUser) {
        console.log(connectedUser.uid);
        console.log(firebase.auth().currentUser.displayName);
        // changes the view to the main app
        app_view.setState(STATE.MAIN);
        // 
        getUserLocalization();
        user.getPreferencesFromFirebase();
        listenToSpotsCreation();
        listenToSpotsDeletion();
    } else {
        // reinitialize data held in the runtime
        for (let spotIter of spots.spotsArray){
            delete spotIter;
        }
        spots.spotsArray = [];
        // goes back to login screen
        app_view.setState(STATE.LOGIN);
        // empties the location element for a future session (and data protection :D)
        $('#spots').empty();
        intervalToSendRequest = null;
        watchLocalisation = null;
        user.reset();
        spots.reset();
        //should probably reset the user object once we have one
    }
});


//------------------------//
// Control Initialization //
//------------------------//

$(document).ready(function(){
    // used for testing purpose, to set environement in main app, to skip login
    app_view.render();

    //---------------//
    // Auth Controls //
    //---------------//

    // event to submit sign up
    // TODO: [NICE TO HAVE] disable this control when a user is connected
    $(document).on('click', '#signup-submit', function (event) {
        let name = $('#user-create-display').val();
        let email = $('#user-create-email').val();
        let password = $('#user-create-password').val();
        let passwordConfirm = $('#user-create-password-confirm').val();

            if (password === passwordConfirm) {
                firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
                    // Handle Errors here.
                    var errorCode = error.code;
                    console.log(errorCode + '   ' + errorMessage);
                  }).then(function(user){
                      // update the user name display name using a dork interface
                      user.updateProfile({displayName: name});
                      database.ref('users/' + firebase.auth().currentUser.uid + '/preferences/transportMode').set('DRIVING');
                      // reset the values in the fields
                      $('#user-create-display').val('');
                      $('#user-create-email').val('');
                      $('#user-create-password').val('');
                  });
            }
            else {
                alert("Passwords do not match. Please re-enter password.")
            }


    });


    //event to login
    // TODO: [NICE TO HAVE] disable this control when a user is connected
    $(document).on('click', '#login-button', function (event) {
        let email = $('#user-email').val().trim();
        let password = $('#user-password').val().trim();
        firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            // ...
          });
          $('#user-email').val('');
          $('#user-password').val('');
    });

    //event to launch sign up
    $(document).on('click','#signup-button', function(event){
        app_view.setState(STATE.SIGNUP);
        $('#user-email').val('');
        $('#user-password').val('');
    });

    // event to logout
    $(document).on('click', '#logout-button', function (event) {
        firebase.auth().signOut().then(function() {
            console.log('logout successful');
          }).catch(function(error) {
            // An error happened.
          });
    });

    //------------------------//
    // Spot Creation Controls //
    //------------------------//    

    // event to open spot creation menu
    $(document).on('click','#create-spot-button', function(){
        // app_view.setState(STATE.MAIN_CREATE_SPOT);
    });

    // event on spot creation
    $(document).on('click','#data-spot-create', function(){
        let label = $('#data-spot-label').val();
        let address = $('#data-spot-address').val();
        createSpotInFirebase(label,address);
    });

    //------------------------//
    // Spot Deletion Controls //
    //------------------------//   
    
    $(document).on('click','#delete-spots-open',function(){
        // generate the list of spots for deletion
        spots.renderForDeletion();
        // moves to delete spots page
        app_view.setState(STATE.MENU_DELETE_SPOTS);
    });

    $(document).on('click','#spots-deletion-back',function(){
        app_view.setState(STATE.MAIN);
    });

    $(document).on('click','#spot-deletion-confirm',function(){
        deleteSpotsFromFirebase();
    });

    //----------------------//
    // Preferences Controls //
    //----------------------// 

    $(document).on('click','#preferences-open',function(){
        // shall generate the page with the current preferences
        user.renderPreferences();
        // moves to preferences page
        app_view.setState(STATE.MENU_PREFERENCES);
    });

    $(document).on('click','#preferences-confirm',function(){
        let modifTransportMode = $('#transport-mode-select').val();
        console.log(modifTransportMode);
        let modif = {
            transportMode: modifTransportMode,
        }
        user.updatePreferencesIntoFirebase(modif);
    });

    $(document).on('click','#preferences-back',function(){
        app_view.setState(STATE.MAIN);
    });



    //---------------------//
    // Navigation Controls //
    //---------------------// 
    $(document).on('click','#menu-toggle', function(){
        $('#menu-list').toggle();
    });

});


