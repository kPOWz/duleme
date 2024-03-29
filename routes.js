module.exports = function(app) {

	var $ = require('seq');
	var redis = require('redis-url').connect('redis://bweber36:67920d08b0d7f9d1d73257352cfd7a88@fish.redistogo.com:9011/');

	var FacebookClient = require("facebook-client").FacebookClient;
	var facebook_client = new FacebookClient(
	    "246956725404450", // configure like your fb app page states
	    "a603f39d66596641f529662ef62ea5a2", // configure like your fb app page states
	    {
	        "timeout": 10000 // modify the global timeout for facebook calls (Default: 10000)
	    }
	);

	var Pusher = require('node-pusher');

	var pusher = new Pusher({
	  appId: '21674',
	  key: '78011045678593d481df',
	  secret: '7945442b6d6b9eba5d36'
	});

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

		var challenger_name;
		for(var i=0; i < req.session.facebook_friends.length; i++) {
			if(req.session.facebook_friends[i].id == req.body.challenger)
				challenger_name = req.session.facebook_friends[i].name;
		}

		var id = new Date().getTime();
		var duel = {
			duel_id: id,
			owner: req.session.fb_id,
			owner_name: req.session.first_name,
			challenger: req.body.challenger,
			challenger_name: challenger_name,
			desc: req.body.desc,
			date: new Date(endDate[0], (+endDate[1] - 1), endDate[2], endTime[0], endTime[1], 0, 0).getTime(),
			accept: false,
			votes: new Array()
		}

		$().seq(function() {
			saveData('duel:' + id, duel, this);
		})
		.seq(function() {
			var top = this;

			facebook_client.getSessionByAccessToken(req.session.fb_token)(function(facebook_session) {
				var message = {
				    message: req.session.first_name + ' has challenged you to a duel!',
				    name: 'DuelMe!',
				    link: 'http://duelmeapp.herokuapp.com/duel/' + id + '/accept',
				    description: req.body.desc
				}

		      facebook_session.graphCall('/' + req.body.challenger + '/feed/', message, 'post')(function(result) {
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
			if(!data.votes) { data.votes = {}; }

			var vote = data.votes[req.session.fb_id];
			var owner_total = 0;
			var challenger_total = 0;
			for(i in data.votes)
			{
				if(data.votes[i] == data.owner) {
					owner_total++;
				}
				else {
					challenger_total++;
				}
			}

			return res.render('modal.ejs', { vote: vote, owner_total: owner_total, challenger_total: challenger_total, data: data });
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

		$()
		.seq(function() {
			getData('duel:' + id, this);
		})
		.seq('data', function(data) {
			if(data.challenger != req.session.fb_id)
				return res.render('error.ejs', { error: 'You are not allowed to accept this duel!' });

			data.accept = true;
			saveData('duel:' + id, data, this);
		})
		.seq(function() {
			var data = this.vars.data;
			var top = this;

			facebook_client.getSessionByAccessToken(req.session.fb_token)(function(facebook_session) {
				var message = {
				    message: 'The dual is on between ' + data.owner_name + ' and ' + data.challenger_name + '!',
				    name: 'DuelMe!',
				    link: 'http://duelmeapp.herokuapp.com/duel/' + id,
				    description: req.body.desc
				}

		      facebook_session.graphCall('/' + data.owner + '/feed/', message, 'post')(function(result) {
		      	top(false, result);
		      });
	  		});
		})
		.seq(function() {
			var data = this.vars.data;
			var top = this;

			facebook_client.getSessionByAccessToken(req.session.fb_token)(function(facebook_session) {
				var message = {
				    message: 'The dual is on between ' + data.owner_name + ' and ' + data.challenger_name + '!',
				    name: 'DuelMe!',
				    link: 'http://duelmeapp.herokuapp.com/duel/' + id,
				    description: req.body.desc
				}

		      facebook_session.graphCall('/' + data.challenger + '/feed/', message, 'post')(function(result) {
		      	top(false, result);
		      });
	  		});
		})
		.seq(function() {
			return res.redirect('/duel/' + id);
		});
	});

	app.get('/duel/:id/vote', function(req, res){
		var id = req.params.id;
		var vote = req.query['vote'];

		req.session.vote_duel = id
		req.session.vote_candidate = vote;

		if(req.session.fb_token == null) {
			return res.redirect('/auth/facebook');
		} else {
			$()
				.seq('data', function() {
					getData('duel:' + id, this);
				})
				.seq(function() {
					var data = this.vars.data;

					if(!data.votes || ((data.votes instanceof Array) == true)) { data.votes = {}; }

					data.votes[req.session.fb_id] = vote;

					saveData('duel:' + id, data, this);
				})
				.seq(function() {
					var top = this;
					var data = this.vars.data;
					var channel = id;
					var event = 'message';
					var data = {
					  is_owner: vote == data.owner
					};
					
					var socket_id = '1302.1083607';
console.log('push');
					pusher.trigger(channel, 'message', data, socket_id, function(err, request, response) {
console.log('pushed');
						top.ok();
					});
				})
				.seq(function() {
					return res.redirect('/duel/' + id);
				});
		}
	});

	app.get('/cache', function(req, res){

		facebook_client.getSessionByAccessToken(req.session.fb_token)(function(facebook_session) {
	      facebook_session.graphCall("/me/friends", 'GET')(function(result) {

			  req.session.facebook_friends = result.data;

	          if(req.session.accept_duel != null)
	          {
	          	var id = req.session.accept_duel;
	          	req.session.accept_duel = null;
	          	return res.redirect('/duel/' + id + '/accepted');
	          }
	          else if(req.session.vote_duel != null && req.session.vote_candidate != null)
	          {
	          	return res.redirect('/duel/' + req.session.vote_duel + '/vote?vote=' + req.session.vote_candidate);
	          }
	          return res.redirect('/duel/create');
	      });
  		});
	})

	var saveData = function(id, data, fn) {
		var redis = require('redis-url').connect('redis://bweber36:67920d08b0d7f9d1d73257352cfd7a88@fish.redistogo.com:9011/');

		$()
			.seq(function() {
			    redis.set(id, JSON.stringify(data), this);
			})
			.seq(function(data) {
				redis.quit();

				if(fn) return fn(false, data);
			})
	};

	var getData = function(id, fn) {
		var redis = require('redis-url').connect('redis://bweber36:67920d08b0d7f9d1d73257352cfd7a88@fish.redistogo.com:9011/');

		$()
			.seq(function() {
			   redis.get(id, this);
			})
			.seq(function(data) {
				redis.quit();
				var out = (data ? JSON.parse(data) : {});

				return fn(false, out);
			});
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
	app.get('/templates/modal', function(req, res){
		return res.render('modal.ejs');
	});
	app.get('/templates/winner', function(req, res){
		return res.render('winner.ejs');
	});

};