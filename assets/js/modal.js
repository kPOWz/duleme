$(".modal .close").live('click', function() {
	$(".modal").fadeOut();
});

$(".status.accepted span").click(function() {
	$(".modal").fadeIn();
});

