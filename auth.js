function exigerAuthAdmin(req, res, next) {
  if (req.session && req.session.estAdmin) {
    return next();
  }
  return res.redirect("/admin/login");
}

module.exports = { exigerAuthAdmin };
