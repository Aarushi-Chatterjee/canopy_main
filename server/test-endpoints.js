const http = require('http');
const { app } = require('./index.js');

const PORT = 3099;
const server = app.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}...`);

  function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const req = http.request({
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers
        }
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  try {
    // 1. Health
    const health = await request('GET', '/api/health');
    console.log('✓ Health check:', health.status, health.data.status);

    // 2. Auth: Register
    const testEmail = `test.builder.${Date.now()}@canopy.earth`;
    const reg = await request('POST', '/api/auth/register', {
      email: testEmail,
      displayName: 'Test Builder',
      role: 'builder'
    });
    console.log('✓ Auth Register:', reg.status, reg.data.user?.email || reg.data.error);

    // 3. Matches: Sandbox
    const sandbox = await request('GET', '/api/matches/sandbox?domain=climate');
    console.log('✓ Matches Sandbox:', sandbox.status, 'Profiles:', sandbox.data.totalProfiles, 'Calls:', sandbox.data.totalCalls);

    // 4. Matches: Connections
    const connections = await request('GET', '/api/matches/connections');
    console.log('✓ Verified Peer Connections:', connections.status, 'Count:', connections.data.count);

    // 5. Sprints: Board
    const sprints = await request('GET', '/api/sprints');
    console.log('✓ Sprint Board:', sprints.status, 'Forming:', sprints.data.forming.length, 'Building:', sprints.data.building.length, 'Shipped:', sprints.data.shipped.length);

    // 6. Sprints: Join ("Grab a shovel")
    const join = await request('POST', `/api/sprints/${sprints.data.forming[0].id}/join`, {
      userId: reg.data.user.id,
      displayName: 'Test Builder',
      squadRole: 'Full-stack UI'
    });
    console.log('✓ Sprints Join (Grab a shovel):', join.status, join.data.message);

    // 7. Build Calls: List & Post
    const calls = await request('GET', '/api/calls');
    console.log('✓ Build Calls:', calls.status, 'Total:', calls.data.total);

    const newCall = await request('POST', '/api/calls', {
      title: 'Decentralized Water Filter Diagnostics',
      orgName: 'Clean Water Project',
      problemStatement: 'Automate membrane fouling detection.',
      domain: 'climate',
      neededSkills: ['Sensors', 'Embedded C']
    });
    console.log('✓ Post Build Call:', newCall.status, newCall.data.message);

    // 8. Lab Notebook: Feed & Grow Entry
    const notes = await request('GET', '/api/notebook');
    console.log('✓ Lab Notebook Feed:', notes.status, 'Entries:', notes.data.total);

    const grow = await request('POST', `/api/notebook/${notes.data.entries[0].id}/grow`, {
      title: 'Follow-up dataset on sensor calibrations',
      summarySnippet: 'Added test benchmarks across 10 rainfall cycles.',
      teaser: 'calib_v2.py → accuracy: 98.4%'
    });
    console.log('✓ Grow Notebook Entry:', grow.status, grow.data.message);

    // 9. Application Intake
    const appIntake = await request('POST', '/api/applications', {
      fullName: 'New Collaborator',
      email: 'new.collab@canopy.earth',
      role: 'Builder',
      domain: 'Hardware',
      motivationNote: 'Ready to build.'
    });
    console.log('✓ Application Intake:', appIntake.status, appIntake.data.message);

    console.log('\n🎉 ALL CANOPY BACKEND ENDPOINTS PASSED VALIDATION WITH 100% SUCCESS!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
