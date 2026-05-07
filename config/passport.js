const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const users = require('../data/users');

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || 'test-client-id',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || 'test-client-secret',
  callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
}, (accessToken, refreshToken, profile, done) => {
  let user = users.getUserByGithubId(profile.id);
  
  if (!user) {
    user = users.createUser({
      githubId: profile.id,
      username: profile.username,
      displayName: profile.displayName || profile.username,
      avatarUrl: profile.photos[0]?.value || ''
    });
  }
  
  return done(null, user);
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.getUserById(id);
  done(null, user);
});