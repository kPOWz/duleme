var express = require('express'),
    RedisStore = require('connect-redis')(express),
    app = express.createServer(express.logger());

var everyauth = require('everyauth');

everyauth.facebook
.appId('246956725404450')
.appSecret('a603f39d66596641f529662ef62ea5a2')
.handleAuthCallbackError( function (req, res) {
  // If a user denies your app, Facebook will redirect the user to
  // /auth/facebook/callback?error_reason=user_denied&error=access_denied&error_description=The+user+denied+your+request.
  // This configurable route handler defines how you want to respond to
  // that.
  // If you do not configure this, everyauth renders a default fallback
  // view notifying the user that their authentication failed and why.
})
.findOrCreateUser( function (session, accessToken, accessTokExtra, fbUserMetadata) {
  session.fb_token = accessToken;
  session.fb_username = fbUserMetadata.username;
  session.fb_id = fbUserMetadata.id;
  session.first_name = fbUserMetadata.first_name;
  console.log(fbUserMetadata);

  return 1;
})
.redirectPath('/cache');


var port = process.env.PORT || 3000;

app.configure(function () {
  app.use("/assets", express.static(__dirname + '/assets'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({secret: 'dualme', store: new RedisStore({ host: 'fish.redistogo.com', port: '9011', db: 'bweber36', pass: '67920d08b0d7f9d1d73257352cfd7a88' })}));
  app.use(everyauth.middleware());
  app.use(app.router);
})
.listen(port, function() {
  console.log("Running server.")
});

app.dynamicHelpers({
  auth: function(req, res) {
    return req.session != null && req.session.fb_token != null;
  }
});


require('./routes')(app);
