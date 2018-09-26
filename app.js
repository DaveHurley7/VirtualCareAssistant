var config = {
    apiKey: "AIzaSyB8PG_BEUc_z6FjTN-ynOsHuqsc-VXWu84",
    authDomain: "virtual-care-assistant-4105b.firebaseapp.com",
    databaseURL: "https://virtual-care-assistant-4105b.firebaseio.com",
    projectId: "virtual-care-assistant-4105b",
    storageBucket: "virtual-care-assistant-4105b.appspot.com",
    messagingSenderId: "51374411969"
};
firebase.initializeApp(config);
var usersRef = firebase.database().ref().child("users");
var patientsRef = firebase.database().ref().child("patients");
var editBtn = document.getElementById("edit");
var cancelBtn = document.getElementById("cancel");
var saveBtn = document.getElementById("save");
var patientDetails = document.getElementById("patient_details");
var markerDetails = document.getElementById("marker_details");
var notifPanel = document.getElementById("notif_panel");
function loginCarer(){
    var email = document.getElementById("carerEmail").value;
    var password = document.getElementById("carerPassword").value;
    usersRef.child("carers").orderByChild("email").equalTo(email).on("value",function(snapshot){
        if(snapshot.val() != null){
            firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
                var errorCode = error.code;
                var errorMessage = error.message;
            });
            firebase.auth().onAuthStateChanged(function(user) {
                if(user){
                    localStorage.setItem("uid",user.uid);
                    window.location.assign("carerhome.html");
                }else{
                    console.log("Error with user state");
                }
            });
        }else{
            document.getElementById("carererror").innerHTML="Please login with a valid carer account";
        }
    });
}

function loginAdmin(){
    var email = document.getElementById("adminEmail").value;
    var password = document.getElementById("adminPassword").value;
    usersRef.child("admins").orderByChild("email").equalTo(email).on("value",function(snapshot){
        if(snapshot.val() != null){
            firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
                var errorCode = error.code;
                var errorMessage = error.message;
            });
            firebase.auth().onAuthStateChanged(function(user) {
                if(!user){
                    window.location.assign("adminhome.html");
                }else{
                    console.log("Error with user state"+user.uid);

                }
            });
        }else{
            document.getElementById("adminerror").innerHTML="Please login with a valid admin account";
        }
    });
}
function signUserOut(){
    firebase.auth().signOut().then(function(){
        firebase.auth().onAuthStateChanged(function(user) {
            if(user){
                console.log("Error with user state");
            }else{
                window.location.assign("index.html");
            }
        });
    });
}
var secondaryConfig = {
    apiKey: "AIzaSyB8PG_BEUc_z6FjTN-ynOsHuqsc-VXWu84",
    authDomain: "virtual-care-assistant-4105b.firebaseapp.com",
    databaseURL: "https://virtual-care-assistant-4105b.firebaseio.com",
    projectId: "virtual-care-assistant-4105b"
};
var secondaryApp = firebase.initializeApp(secondaryConfig,"secondary");

function addCarer(){
    window.location.assign("addcarer.html");
}
function createCarer(){
    var carerEmail = document.getElementById("emailCarer").value;
    var carerPass = document.getElementById("passCarer").value;
    var carerPassConfirm = document.getElementById("passCarerConfirm").value;
    if(carerPass == carerPassConfirm){
        secondaryApp.auth().createUserWithEmailAndPassword(carerEmail,carerPass).then(function(user){
            usersRef.child("carers").child(user.uid).set({email:carerEmail});
            secondaryApp.auth().signOut();
        });
    }else{
        document.getElementById("carererror").innerHTML="Passwords don't match";
    }
}

patientUIDs = [];
patientsRef.orderByChild("uid").on("value",function(snapshot){
    for(var i in Object.keys(snapshot.val())){
        patientUIDs.push(Object.keys(snapshot.val())[i]);
    }
},function(error){
    console.log("Read failed");
});

var map = null;
geofences = [];
patMarkers = [];
function initMap(){
    var pos = {lat: 51.891173, lng: -8.461282};
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: pos,
        mapTypeId: "satellite"
    });
    function waitForList(){
        if(patientUIDs.length == 0){
            setTimeout(waitForList,200);
        }else{
            for(pUid in patientUIDs){
                patientsRef.child(patientUIDs[pUid]).on("value",function(snapshot){
                    geofenceval = snapshot.val().geofence;
                    geofence = new google.maps.Circle({
                        strokeColor : "#0000BB",
                        strokeOpacity : 0.7,
                        strokeWeight : 2,
                        fillColor : "#0000FF",
                        fillOpacity  : 0.3,
                        map : map,
                        suppressUndo:true,
                        center : geofenceval.centre,
                        radius : geofenceval.radius,
                        patUid : patientUIDs[pUid],
                        edited:false
                    });
                    geofences.push(geofence);
                    geofence.addListener("click",showGeoFenceDetails.bind(this,geofence,false));
                    geofence.addListener("center_changed",showGeoFenceDetails.bind(this,geofence,true));
                    geofence.addListener("radius_changed",showGeoFenceDetails.bind(this,geofence,true));

                    markerval = snapshot.val().location;
                    patMarker = new google.maps.Circle({
                        strokeColor: "#000",
                        strokeOpacity: 1,
                        fillColor: "#33CC00",
                        fillOpacity: 1,
                        center:{lat:markerval.lat,lng:markerval.long},
                        radius: 6,
                        map:map,
                        patUid:patientUIDs[pUid]
                    });
                    patMarkers.push(patMarker);
                    patMarker.addListener("click",showPatientDetails.bind(this,patMarker));
                });
            }
        }
    }
    waitForList();
    warnings = [];
    function getPatientLocations() {
        for(mIndex in patMarkers){
            patientsRef.child(patMarkers[mIndex].patUid).child("location").on("value",function(snapshot){
                patMarkers[mIndex].setCenter({lat:snapshot.val().lat,lng:snapshot.val().long});
                patX = patMarkers[mIndex].center.lng();
                patY = patMarkers[mIndex].center.lat();
                geoX = geofences[mIndex].center.lng();
                geoY = geofences[mIndex].center.lat();
                distance = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng(geoY,geoX),new google.maps.LatLng(patY,patX));
                console.log(distance + "\t" + geofences[mIndex].radius);
                if(distance > geofences[mIndex].radius){
                    name = "";
                    patientsRef.child(patMarkers[mIndex].patUid).on("value",function(snapshot){
                        name = snapshot.val().name;
                    });
                    warnings.push(name);
                }
            });
        }
        if(warnings.length > 0){
            notifPanel.innerHTML = "";
            notifPanel.innerHTML = "Warning:<br>";
            for(w in warnings){
                notifPanel.innerHTML += warnings[w] + " is outside their geo-fence!<br>";
            }
            warnings.clear();
        }else{
            notifPanel.innerHTML = "";
        }
        setTimeout(getPatientLocations,2000);
    }
    getPatientLocations();
}

function showPatientDetails(patmarker){
    patientDetails.style.display="block";
    markerDetails.style.display="none";
    for(pIndex in patMarkers){
        patMarkers[pIndex].setOptions({fillColor:"#33CC00"});
    }
    patmarker.setOptions({fillColor:"#FFF200"});
    patientsRef.child(patmarker.patUid).on("value",function(snapshot){
        document.getElementById("name").innerHTML=snapshot.val().name;
        document.getElementById("patient_lat").innerHTML=snapshot.val().location.lat;
        document.getElementById("patient_long").innerHTML=snapshot.val().location.long;
    });
}

function showGeoFenceDetails(geofence,edit){
    patientDetails.style.display = "none";
    markerDetails.style.display = "block";
    patientsRef.child(geofence.patUid).on("value",function(snapshot){
        document.getElementById("patient").innerHTML=snapshot.val().name;
        document.getElementById("marker_lat").innerHTML=geofence.center.lat().toFixed(6);
        document.getElementById("marker_long").innerHTML=geofence.center.lng().toFixed(6);
        document.getElementById("marker_rad").innerHTML=geofence.radius.toFixed(0);
    });
    if(edit){
        geofence.edited = true;
    }
}

function startEdit() {
    editBtn.style.display = "none";
    cancelBtn.style.display = "inline";
    saveBtn.style.display = "inline";
    patientDetails.style.display = "none";
    markerDetails.style.display = "block";
    for(fence in geofences){
        geofences[fence].setEditable(true);
    }
}
function cancelEdit(){
    editBtn.style.display="inline";
    cancelBtn.style.display="none";
    saveBtn.style.display="none";
    patientDetails.style.display="block";
    markerDetails.style.display="none";
    for(fence in geofences){
        geofences[fence].setEditable(false);
        if(geofences[fence].edited) {
            patientsRef.child(geofences[fence].patUid).child("geofence").on("value", function (snapshot) {
                geoval = snapshot.val();
                geofences[fence].setCenter(geoval.centre);
                geofences[fence].setRadius(geoval.radius);
            });
        }
    }
}
function saveEdit(){
    editBtn.style.display="inline";
    cancelBtn.style.display="none";
    saveBtn.style.display="none";
    patientDetails.style.display="block";
    markerDetails.style.display="none";
    for(fence in geofences){
        geofences[fence].setEditable(false);
        if(geofences[fence].edited){
            geofences[fence].edited=false;
            geo_rad = geofences[fence].radius;
            geo_cX = geofences[fence].center.lat();
            geo_cY = geofences[fence].center.lng();
            console.log(geo_rad + "\t" + geo_cX + "\t" + geo_cY);
            geofenceFb = patientsRef.child(geofences[fence].patUid).child("geofence");
            geofenceFb.child("radius").set(geo_rad);
            geofenceFb.child("centre").child("lat").set(geo_cX);
            geofenceFb.child("centre").child("lng").set(geo_cY);
        }
    }
    window.location.reload();
}