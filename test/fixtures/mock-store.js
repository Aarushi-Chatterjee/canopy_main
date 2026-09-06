/**
 * Canopy Developer & Test Fixtures
 * Isolated test dataset for automated unit and integration tests.
 * NEVER used in production.
 */

const TEST_FIXTURES = {
  users: [
    {
      id: 'usr_test_builder',
      email: 'builder.test@canopy.local',
      role: 'builder',
      displayName: 'Test Builder',
      isVerified: true,
      createdAt: '2026-08-01T09:00:00Z'
    },
    {
      id: 'usr_test_holder',
      email: 'holder.test@canopy.local',
      role: 'problem_holder',
      displayName: 'Test Problem Holder',
      isVerified: true,
      createdAt: '2026-07-25T14:30:00Z'
    }
  ],
  profiles: [
    {
      userId: 'usr_test_builder',
      displayName: 'Test Builder',
      headline: 'Embedded Firmware Specialist',
      bio: 'Test bio for developer assertions.',
      primaryDomain: 'hardware',
      skillTags: ['Hardware', 'Embedded C'],
      avatarUrl: '/avatars/avatar-builders.png',
      hoursPerWeek: 15,
      proofOfWork: []
    }
  ],
  build_calls: [
    {
      id: 'call_test_fixture',
      creatorId: 'usr_test_holder',
      title: 'Test Sensor Challenge',
      orgName: 'Test Laboratory',
      problemStatement: 'Test statement for automated verification.',
      domain: 'climate',
      targetDeliverable: 'Working test firmware.',
      pilotBudget: 'Test budget',
      neededSkills: ['Hardware', 'C'],
      status: 'open',
      createdAt: '2026-08-20T10:00:00Z'
    }
  ],
  sprints: [
    {
      id: 'sp_test',
      buildCallId: 'call_test_fixture',
      title: 'Test Sprint Cycle',
      description: 'Test description.',
      domain: 'climate',
      stage: 'building',
      teamCapacity: 3,
      members: [
        { userId: 'usr_test_builder', squadRole: 'Engineer', displayName: 'Test Builder', avatarSeed: 't1' }
      ],
      skillTags: ['Hardware'],
      startDate: '2026-08-25',
      endDate: '2026-09-08',
      daysTotal: 14,
      daysLeft: 7,
      progressPct: 50,
      statusHint: 'testing'
    }
  ],
  notebook_entries: [
    {
      id: 'entry_test',
      authorId: 'usr_test_builder',
      authorName: 'Test Builder',
      sprintId: 'sp_test',
      title: 'Test Lab Note Entry',
      domain: 'climate',
      entryType: 'post-mortem',
      summarySnippet: 'Testing summary snippet.',
      bodyMarkdown: 'Test markdown content.',
      tags: ['Test'],
      createdAt: '2026-09-02T10:00:00Z',
      branches: []
    }
  ]
};

module.exports = { TEST_FIXTURES };
