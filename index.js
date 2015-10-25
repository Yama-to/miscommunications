// Settings
var projectAPIKey = "DAK6d614c0db55d457fbf0bd0de9647ecbc";
// Setup Kandy
kandy.setup({
  // Designate HTML elements to be our stream containers.
  remoteVideoContainer: document.getElementById("remote-container"),
  localVideoContainer: document.getElementById("local-container"),

  // Register listeners to call events.
  listeners: {
    callinitiated: onCallInitiated,
    callincoming: onCallIncoming,
    callestablished: onCallEstablished,
    callended: onCallEnded,
    // Media Event
    media: onMediaError,
    // Screensharing Event
    callscreenstopped: onStopSuccess,
    message: onMessageReceived
  },

  // Reference the default Chrome extension.
  chromeExtensionId: {
    chromeExtensionId: 'daohbhpgnnlgkipndobecbmahalalhcp'
  }
});

// Global Variables
var username;
var password;
var isLoggedIn = false; // Status of the user.
var recipient;
var localType;
var remoteType;
var challenge;
var callId; // Keep track of the callId.
var sessionId; // Keep track of the session Id.
var remotePlayer;

var challengesJSON = [
    {
      "challengeName": "Pictionary",
      "localType": "draw",
      "remoteType" : "text",
      "localInstructions" : "Draw a picture. The other person will be guessing.",
      "remoteInstructions" : "What is this a picture of?"
    },
    {
      "challengeName": "Group Pictionary",
      "localType": "draw",
      "remoteType" : "audio",
      "localInstructions" : "Draw a picture. The other people will be guessing.",
      "remoteInstructions" : "What is this a picture of?"
    },
    {
      "challengeName": "Web Degrees of Separation",
      "localType": "text",
      "remoteType" : "screen",
      "localInstructions" : "Name a starting page on the web (i.e. www.apple.com). Tell the other player to find an object (i.e. a picture of an orange) on the web using the shortest number of clicks.",
      "remoteInstructions" : "Using a starting page on the web (i.e. www.apple.com), find an object (i.e. a picture of an orange) on the web using the smallest number of clicks."
    },
    {
      "challengeName": "Charades",
      "localType": "video",
      "remoteType" : "text",
      "localInstructions" : "Act out a scene. The other person will be guessing.",
      "remoteInstructions" : "What is this person doing?"
    },
    {
      "challengeName": "Group Charades",
      "localType": "video",
      "remoteType" : "audio",
      "localInstructions" : "Act out a scene. The other person will be guessing.",
      "remoteInstructions" : "What is this person doing?"
    },
    {
      "challengeName": "So You Think You Can Dance?",
      "localType": "draw",
      "remoteType" : "video",
      "localInstructions" : "Draw out some dance steps for the other person.",
      "remoteInstructions" : "If this drawing represents a dance, how would you do it?"
    },
    {
      "challengeName": "Draw This!",
      "localType": "screen",
      "remoteType" : "draw",
      "localInstructions" : "Show the other person a picture to draw.",
      "remoteInstructions" : "Draw the picture!"
    },
];

var challenges = JSON.parse(challengesJSON);

// Canvas variables etc
// Get the canvas element.
var canvas = document.getElementById('canvas');
// Get the actual CanvasRenderingContext2D object.
var ctx = canvas.getContext('2d');

// Set some configurations for drawing lines.
ctx.lineWidth = 5;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.strokeStyle = 'blue';

// Flag for whether we're currently drawing.
var isDrawing = false;

// Position objects to keep track of line X and Y coordinates.
var startPos = {};
var endPos = {};

// Listen for the user holding the mouse button down.
canvas.addEventListener('mousedown', mouseDown);
// Listen for the user releasing the mouse button.
canvas.addEventListener('mouseup', mouseUp);
// Listen for the user moving the mouse.
canvas.addEventListener('mousemove', mouseMove);
// Listen for the mouse moving outside the canvas area.
canvas.addEventListener('mouseout', mouseUp);

function changeChallenge() {
  log('Changing challenge');
  var number = Math.floor( Math.random() * 8 );
  $('#challenge_title').html(
    challengesJSON[number].challengeName
  );
  $('#local_inst').html(
    '<span class="badge"><span class="glyphicon glyphicon-user" aria-hidden="true"></span> YOU</span><br>' +
    challengesJSON[number].localInstructions
  );
  $('#remote_inst').html(
    '<span class="badge"><span class="glyphicon glyphicon-user" aria-hidden="true"></span> OTHER PERSON</span><br>' +
    challengesJSON[number].remoteInstructions
  );
  startChallenge(number);
};

/* setChallengesStates
* randnum - challenge selection
* Set remote/local settings based on challenge
*/
function setChallengeStates(randnum){
  switch(challenges[randnum].localType) {
    case "text":
        kandy.call.muteCall(callId);
        kandy.call.stopCallVideo(callId);
        kandy.call.stopScreenSharing(callId, onStopSuccess, onStopFailure);
      $('#canvasDiv').CSS('display=none');
        break;
    case "audio":
        kandy.call.unmuteCall(callId);
        kandy.call.stopCallVideo(callId);
        kandy.call.stopScreenSharing(callId, onStopSuccess, onStopFailure);
            $('#canvasDiv').CSS('display=none');
        break;
    case "video":
        kandy.call.muteCall(callId);
        kandy.call.startCallVideo(callId);
        kandy.call.stopScreenSharing(callId, onStopSuccess, onStopFailure);
            $('#canvasDiv').CSS('display=none');
        break;
    case "draw":
        kandy.call.muteCall(callId);
        kandy.call.stopCallVideo(callId);
        kandy.call.stopScreenSharing(callId, onStopSuccess, onStopFailure);
            $('#canvasDiv').CSS('display=block');
        break;
    case "screen":
        kandy.call.muteCall(callId);
        kandy.call.stopCallVideo(callId);
        kandy.call.startScreenSharing(callId, onStartSuccess, onStartFailure);
            $('#canvasDiv').CSS('display=none');
        break;
}

  switch(challenges[randnum].remoteType) {
      case "text":
          break;
      case "audio":
          kandy.call.unmuteCall(callId);
          break;
      case "video":
          kandy.call.startCallVideo(callId);
          break;
      case "draw":
          break;
      case "screen":
          kandy.call.startScreenSharing(callId, onStartSuccess, onStartFailure);
          break;
  }
}

/* toggleLogin
 * Log the user in / out depending on current status.
 */
function toggleLogin() {
  log('Logging in');
  $('#login').val("...");
  $('#login').addClass("disabled");
  username = $('#username').val();
  password = $('#password').val();
   if(isLoggedIn) {
     kandy.logout(onLogoutSuccess);
   } else {
     kandy.login(projectAPIKey, username, password, onLoginSuccess, onLoginFailure);
   }
}

/* log
* message - String to log
* Utility function for appending messages to the log div.
*/
function log(message) {
  //document.getElementById("log").innerHTML += "<div>" + message + "</div>";
  $('#log').val($('#log').val() + '\n' + message);
}

/* setMessage
* message - String to log
* Utility function for setting messages to the message div.
*/
function setMessage(message) {
  document.getElementById("messages").innerHTML = "<div>" + message + "</div>";
  log(message);
}

/* onLoginSuccess
* What to do on a successful login.
*/
function onLoginSuccess() {
  $('#flash_message').html(
    "<div class='alert alert-success' role='alert'>"+
    "Login successfully" +
    "</div>"
  );
  $('#login').removeClass("disabled")
  $('#username').hide();
  $('#password').hide();
  $('#login').val('Logout');
    isLoggedIn = true;
}

/* onLoginFailure
* What to do on a failed login.
*/
function onLoginFailure() {
$('#flash_message').html(
    "<div class='alert alert-danger' role='alert'>"+
    "Login Failed" +
    "</div>"
  );
  $('#login').removeClass("disabled")
  $('#login').val("Login")
}

/* onLogoutSuccess
* What to do on a succesful logout.
*/
function onLogoutSuccess() {
  $('#flash_message').html(
    "<div class='alert alert-success' role='alert'>"+
    "Logout successfully" +
    "</div>"
  );
  $('#login').removeClass("disabled")
  $('#username').val('');
  $('#password').val('');
  $('#login').val('Login');
  $('#username').show();
  $('#password').show();
    isLoggedIn = false;
}

/* sendJSONMessage
* Gathers the user's input and sends a JSON message to the recipient.
*/
function sendJSONMessage() {
  // Get user input.
  // The URL format we're expecting is https://www.youtube.com/watch?v=Ely5wLcNw0Q
  var recipient = document.getElementById('recipient').value;
  localType = document.getElementById('localType').value;
  remoteType = document.getElementById('remoteType').value;
  challenge = document.getElementById('challenge').value;

  // Create the JSON object.
  var data = {
    "type": "gauntlet",
    "localType": remoteType,
    "remoteType": localType,
    "challenge": challenge
  };

  // Send the JSON message.
  kandy.messaging.sendJSON(recipient, data, onSendSuccess, onSendFailure);
}

/* onSendSuccess
* What to do on a send JSON success.
*/
function onSendSuccess() {
  log("JSON message sent successfully.");
}

/* onSendFailure
* What to do on a send JSON failure.
*/
function onSendFailure() {
  log("Failed to send JSON message.");
}

/* onMessageReceived
 * message - JSON message to process
 * Called when the `message` event is triggered.
 * Receives the message object as a parameter.
 */
function onMessageReceived(message) {
  log("Message received");
  var sender = message.sender.user_id;
  var remotePlayer = message.sender.full_user_id;
  var content = message.message;

  // Determine if the message JSON message.
  if (content.mimeType == "application/json") {

    // Parse the JSON object to ensure it's format.
    var data = JSON.parse(content.json);

    // Determine the type of message that was sent.
    if (data.type == "gauntlet") {
      // Get gauntlet
      localType = data.localType;
      remoteType = data.remoteType;
      challenge = data.challenge;
      $('#recipient').val(message.sender.full_user_id)
      $('#localType').val(localType);
      $('#remoteType').val(remoteType);
      $('#challenge').val(challenge);
      $('#recipient').val(remotePlayer);
      log("Guantlet thrown!");
      startChallenge();
    } else {
      // Unknown JSON type
      log("Unknown JSON type");
    }
  }
}

/* startChallenge
* Begin the game
*/
function startChallenge(number) {
  log('Starting challenge');
  // TODO: Randnum to select challenge
  setChallengeStates(number);
  startCall();
  $('#end-call').css('display:block');
}

/******************
 * User functions *
 ******************/

/* startCall
* Get user input and make a call to the callee.
*/
function startCall() {
  log('Starting call');
  var callee = document.getElementById("callee").value;

  // Tell Kandy to make a call to callee.
  kandy.call.makeCall(callee, true);
  log('Call connected');
}

/* toggleCall
* Executed when a call button is clicked.
*/
function toggleCall() {
  // Check if we have a callId, meaning if a call is in progress.
  log("Logging in...");
  if (callId) {
    // Tell Kandy to end the call.
    kandy.call.endCall(callId);
    callId = null;
  } else {
    // Get user input and make the call.
    var callee = document.getElementById('callee').value;
    kandy.call.makeCall(callee, true);
  }
}

/* endCall
* End a call.
*/
function endCall() {
  // Tell Kandy to end the call.
  kandy.call.endCall(callId);
    $('#end-call').css('display:none');
}

/***********************
 * Listener functions *
 ***********************/

/* onCallInitiated
* call -
* calleeName -
* Executed when the user makes a call.
*/
function onCallInitiated(call, calleeName) {
  log('Making call to ' + calleeName);
  // Store the callId.
  callId = call.getId();
}

/* onCallIncoming
* call -
* Executed when the user is being called.
*/
function onCallIncoming(call) {
  // Store the callId.
  callId = call.getId();

  // Automatically answer the call.
  kandy.call.answerCall(callId, true);
  //kandy.call.answerCall(callId, showVideo);
}

/* onCallEstablished
* call -
* What to do when call is established.
*/
function onCallEstablished(call) {
  log("Call established.");

  // Handle UI changes. Call in progress.
  document.getElementById("make-call").disabled = true;
  document.getElementById("end-call").disabled = false;
}

/* onCallEnded
* call -
* What to do when a call is ended.
*/
function onCallEnded(call) {
  log("Call ended.");

  // Handle UI changes. No current call.
  document.getElementById("make-call").disabled = false;
  document.getElementById("end-call").disabled = true;

  // Call no longer active, reset mute and hold statuses.
  isMuted = false;
}

/* onMediaError
* error -
* Called when the media event is triggered.
*/
function onMediaError(error) {
  switch (error.type) {
    case kandy.call.MediaErrors.NOT_FOUND:
      log("No WebRTC support was found.");
      break;
    case kandy.call.MediaErrors.NO_SCREENSHARING_WARNING:
      log("WebRTC supported, but no screensharing support was found.");
      break;
    default:
      log('Other error or warning encountered.');
      break;
  }
}

// What to do on a successful screenshare start.
function onStartSuccess() {
    log('Screensharing started.');
    isSharing = true;
}

// What to do on a failed screenshare start.
function onStartFailure() {
    log('Failed to start screensharing.');
}

// What to do on a successful screenshare stop.
function onStopSuccess() {
    log('Screensharing stopped.');
    isSharing = false;
}

// What to do on a failed screenshare stop.
function onStopFailure() {
    log('Failed to stop screensharing.');
}

/* onData
* data -
* Handle received data from the session.
*/
function onData(data) {
  // Draw the line on our canvas.
  drawLine(data.payload);
}

/* onUserJoin
* data -
* Let the user know another user has joined.
*/
function onUserJoin(data) {
  log(data.full_user_id + ' has joined the session.');
}

/* onUserJoinRequest
* data -
 * Automatically accept join requests.
 */
function onUserJoinRequest(data) {
  kandy.session.acceptJoinRequest(data.session_id, data.full_user_id);
}

/********************
 * Server functions *
 ********************/

/* createSession
* Creates a session.
*/
function createSession() {
  // Give our session a type and a unique name.
  var randomId = Date.now();
  var sessionConfig = {
    session_type: 'whiteboard-demo',
    session_name: randomId
  };

  // Create the session.
  kandy.session.create(sessionConfig, onSessionCreateSuccess, onSessionFailure);
}

/* onSessionCreateSuccess
* What to do on a create session success.
*/
function onSessionCreateSuccess(session) {
  sessionId = session.session_id;

  // Let the user know what happened.
  log('Created session: ' + sessionId);
  // Display the session Id for the user.
  document.getElementById('current-session-id').value = sessionId;

  // Activate the session.
  kandy.session.activate(sessionId);

  // Declare our listeners.
  var listeners = {
    'onData': onData,
    'onUserJoin': onUserJoin,
    // Include the admin-only event listener.
    'onUserJoinRequest': onUserJoinRequest
  };

  // Register event listeners.
  kandy.session.setListeners(sessionId, listeners);
}

/* onSessionFailure
* What to do on a session error.
*/
function onSessionFailure() {
  log('Error creating/joining session.');
}

/********************
 * Client functions *
 ********************/

/* joinSession
* Joins a session.
*/
function joinSession() {
  // Gather the user's input.
  sessionId = document.getElementById('join-session-id').value;

  // Join the session.
  kandy.session.join(sessionId, {}, onSessionJoinSuccess, onSessionFailure);
}

/* onSessionJoinSuccess
* What to do on join session success.
*/
function onSessionJoinSuccess() {
  // Let the user know what happened.
  log('Joined session: ' + sessionId);
  // Display the session Id for the user.
  document.getElementById('current-session-id').value = sessionId;

  // Declare our listeners.
  var listeners = {
    'onData': onData,
    'onUserJoin': onUserJoin
  };

  // Register listeners.
  kandy.session.setListeners(sessionId, listeners);
}

/****************
 * Canvas stuff *
 ****************/

/* drawLine
* coordinates -
* Draw a line on the canvas using data coordinates.
*/
function drawLine(coordinates) {
  var start = coordinates.prevPos;
  var end = coordinates.pos;

  // Begin a new path (what I've been calling a line).
  ctx.beginPath();
  // Set the start position of the path.
  ctx.moveTo(start.x, start.y);
  // Set the end position of the path.
  ctx.lineTo(end.x, end.y);
  // End the path.
  ctx.closePath();
  // Draw the path.
  ctx.stroke();
}

/* mouseDown
* e -
* What to do on a mousedown event.
*/
function mouseDown(e) {
  // Set flag to currently drawing.
  isDrawing = true;
  // Set the position to where the mouse is now.
  pos = {
    x: e.pageX - this.offsetLeft,
    y: e.pageY - this.offsetTop
  };
  // There isn't a previous position, since this is a new line.
  prevPos = {};
}

/* mouseUp
* e -
* What to do on a mouseup or mouseout event.
*/
function mouseUp(e) {
  isDrawing = false;
}

/* mouseMove
* e -
* What to do on a mousemove event.
*/
function mouseMove(e) {
  // If we aren't drawing, do nothing.
  if (!isDrawing) {
    return;
  }

  // Update our line end-point coordinates.
  prevPos = {
    x: pos.x,
    y: pos.y
  };
  pos = {
    x: e.pageX - this.offsetLeft,
    y: e.pageY - this.offsetTop
  };

  // Create our data object to send.
  var data = {
    prevPos,
    pos
  };

  // Draw the line on our own canvas.
  drawLine(data);
  // Send the data to the session for other canvases.
  kandy.session.sendData(sessionId, data, onSendSuccess, onSendFailure);
}


// JS countdown
function setDate() {
  var startDateTime = new Date();
  var endDateTime = startDateTime.setMinutes(startDateTime.getMinutes() + 5);
  countDown(startDateTime, endDateTime);
}
function countDown(startDateTime, endDateTime) {
  startDateTime = new Date();
  var left = endDateTime - startDateTime;
  console.log(left)

  var a_day = 24 * 60 * 60 * 1000;

  var m = Math.floor((left % a_day) / (60 * 1000)) % 60
  var s = Math.floor((left % a_day) / 1000) % 60 % 60

  $("#TimeLeft").val(m + '分' + s + '秒');
  setTimeout('countDown(startDateTime, endDateTime)', 1000);
};


