exports.show = function(req, res){
    var config = req.global_config;
    res.render("about", {"author":config.author, "contact":config.contact, "icon":config.icon});
    return;
};
