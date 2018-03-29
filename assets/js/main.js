var STATE = {
    LOGIN: 1,
    SIGNUP: 2,
    MAIN: 3,
    MAIN_MENU: 4,
    MAIN_CREATE_LOCATION: 5,
    MAIN_ZOOM_LOCATION: 6,
}

var app_view = {
    state: '',
    setState: function(newState){
        //change the state to newState
        //call render
    },
    render: function(){
        // assign jQuery elements to variables, for faster reuse
        let loginPage = $('#login-page');
        let signupPage = $('#signup-page');
        let mainApp = $('#main-app');
        let locationCreationPage = $('#location-creation-page');
        let locationViewPage = $('#location-view-page');
        //switch case on state, and shows/hides the appropriate bloc in html
        if (this.state = 1){
            loginPage.show();
            signupPage.hide();
            mainApp.hide();
            locationCreationPage.hide();
            locationViewPage.hide();
        }
    }
}
