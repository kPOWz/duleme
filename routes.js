module.exports = function(app) {

	var $ = require('seq');
	var redis = require('redis-url').connect('redis://bweber36:67920d08b0d7f9d1d73257352cfd7a88@fish.redistogo.com:9011/');

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
			owner: req.session.fb_id,
			challenger: req.body.challenger,
			desc: req.body.desc,
			date: new Date(endDate[0], (+endDate[1] - 1), endDate[2], endTime[0], endTime[1], 0, 0),
			accept: false
		}

		var id = new Date().getTime();
		$().seq(function() {
			saveData('duel:' + id, duel, this);
		})
		.seq(function() {
			var top = this;
			var FacebookClient = require("facebook-client").FacebookClient;
			var facebook_client = new FacebookClient(
			    "246956725404450", // configure like your fb app page states
			    "a603f39d66596641f529662ef62ea5a2", // configure like your fb app page states
			    {
			        "timeout": 10000 // modify the global timeout for facebook calls (Default: 10000)
			    }
			);

			facebook_client.getSessionByAccessToken(req.session.fb_token)(function(facebook_session) {
				var message = {
				    message: req.session.first_name + ' has challenged you to a duel!',
				    name: 'DuelMe!',
				    link: 'http://duelmeapp.herokuapp.com/duel/' + id + '/accept',
				    description: req.body.desc
				}

		      facebook_session.graphCall('/' + req.body.challenger + '/feed/', message, 'post')(function(result) {
		      	console.log(result);
		      	top(false, result);
		      });
	  		});
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
		var id = req.params.id;

		$().seq(function() {
			getData('duel:' + id, this);
		})
		.seq(function(data) {
			req.session.accept_duel = id;
			return res.render('duelaccept.ejs', data);
		});
	});

	app.get('/duel/:id/accepted', function(req, res){
		var id = req.params.id;

		$().seq(function() {
			getData('duel:' + id, this);
		})
		.seq(function(data) {
			if(data.challenger != req.session.fb_id)
				return res.render('error.ejs', { error: 'You are not allowed to accept this duel!' });

			data.accept = true;
			saveData('duel:' + id, data, this);
		})
		.seq(function() {
			return res.redirect('/duel/' + id);
		});
	});

	app.post('/duel/:id/vote', function(req, res){
		var id = req.params.id;
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

	          if(req.session.accept_duel != null)
	          	return res.redirect('/duel/' + req.session.accept_duel + '/accepted');
	          return res.redirect('/duel/create');
	      });
  		});
	})

	var saveData = function(id, data, fn) {

	    redis.set(id, JSON.stringify(data), fn);
	};

	var getData = function(id, fn) {

		redis.get(id, function(err, data) {
			return fn(err, JSON.parse(data.toString()));
	    });
	}

	var uniqueStr = function S4() {
   		return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	}
	
	
	
	// Templates
	app.get('/templates/accept', function(req, res){
		return res.render('accept.ejs');
	});
	app.get('/templates/waiting', function(req, res){
		return res.render('waiting.ejs');
	});
	app.get('/templates/initial', function(req, res){
		return res.render('initial.ejs');
	});
	app.get('/templates/picked', function(req, res){
		return res.render('picked.ejs');
	});

};