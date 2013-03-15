
/*
 * GET home page.
 */

module.exports = function(req, res){
  console.log(res.locals.session);
  res.render('index', { title: 'Express' });
};
