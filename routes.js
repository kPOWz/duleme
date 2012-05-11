module.exports = function(app) {

	var $ = require('seq');
	var redis = require("redis"),
		client = redis.createClient()

	app.get('/', function(req, res) {
		if(req.session != null && req.session.fb_token != null)
			return res.redirect('/duel/create');
		return res.render('index.ejs');
	});

	app.get('/signout', function(req, res){
		req.session.destroy();
		delete req.session;
		return res.redirect('/');
	});

	app.get('/duel/create', function(req, res) {
		var data = { 
			friends: req.session.facebook_friends,
			fb_username: req.session.fb_username,
			first_name: req.session.first_name
		};
		return res.render('duelcreate.ejs', data);
	});

	app.post('/duel/create', function(req, res) {
		console.log(req.body);
		var endDate = req.body.end_date.split("-");
		var endTime = req.body.end_time.split(":")

		var duel = {
			challenger: req.body.challenger,
			desc: req.body.desc,
			date: new Date(endDate[0], (+endDate[1] - 1), endDate[2], endTime[0], endTime[1], 0, 0)
		}

		var id = new Date().getTime();
		$().seq(function() {
			saveData('duel:' + id, duel, this);
		})
		.seq(function() {
			return res.redirect('/duel/' + id);
		});
	});

	app.get('/duel/:id', function(req, res){
		var id = req.params.id;

		$().seq(function() {
			getData('duel:' + id, this);
		})
		.seq(function(data) {
			return res.send(data);
		});
	});

	app.get('/duel/:id/accept', function(req, res){
		var duelId = req.params.id;
	});

	app.post('/duel/:id/accept', function(req, res){
		var duelId = req.params.id;
	});

	app.post('/duel/:id/vote', function(req, res){
		var duelId = req.params.id;
	});

	app.get('/cache', function(req, res){
		var FacebookClient = require("facebook-client").FacebookClient;
		var facebook_client = new FacebookClient(
		    "246956725404450", // configure like your fb app page states
		    "a603f39d66596641f529662ef62ea5a2", // configure like your fb app page states
		    {
		        "timeout": 10000 // modify the global timeout for facebook calls (Default: 10000)
		    }
		);

		facebook_client.getSessionByAccessToken(req.session.fb_token)(function(facebook_session) {
	      facebook_session.graphCall("/me/friends", 'GET')(function(result) {
	          req.session.facebook_friends = result.data;
	          return res.redirect('/duel/create');
	      });
  		});
	})

	var saveData = function(id, data, fn) {

	    client.set(id, JSON.stringify(data), fn);
	};

	var getData = function(id, fn) {

		client.get(id, function(err, data) {
			return fn(err, JSON.parse(data.toString()));
	    });
	}
};