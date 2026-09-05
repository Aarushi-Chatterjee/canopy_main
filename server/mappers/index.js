const buildCallMapper = require('./build-call');
const applicationMapper = require('./application');
const matchMapper = require('./match');
const sprintMapper = require('./sprint');
const notebookMapper = require('./notebook');
const profileMapper = require('./profile');
const userMapper = require('./user');
const moderationMapper = require('./moderation');

module.exports = {
  buildCall: buildCallMapper,
  application: applicationMapper,
  match: matchMapper,
  sprint: sprintMapper,
  notebook: notebookMapper,
  profile: profileMapper,
  user: userMapper,
  moderation: moderationMapper
};
