$(".modal .close").live('click', function() {
	$(".modal").fadeOut();
});

$(".status.accepted span").click(function() {
	$(this).parent().parent().find(".modal").fadeIn();
});