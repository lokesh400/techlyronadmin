function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user && req.user.role === 'Admin') return next();
  req.flash('error_msg', 'Admin access required');
  res.redirect('/');
}

function normalizeUsername(value) {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.toLowerCase().endsWith('@techlyron.tech')) return trimmed;
  return `${trimmed}@techlyron.tech`;
}

function isGmailAddress(value) {
  if (!value) return false;
  return value.toLowerCase().endsWith('@gmail.com');
}

module.exports = {
  ensureAdmin,
  normalizeUsername,
  isGmailAddress
};
