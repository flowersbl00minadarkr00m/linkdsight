/**
 * Fully synthetic sample dataset – no real LinkedIn data.
 * Generated to demonstrate all views without importing an export.
 */

export function generateSampleData() {
  const now = new Date('2026-06-28');
  const sampleOwner = 'Demo User';
  const months = [];
  for (let i = 0; i < 36; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  months.reverse();

  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery',
    'Blake', 'Cameron', 'Dakota', 'Emerson', 'Finley', 'Harper', 'Jules', 'Kendall'];
  const lastNames = ['Chen', 'Patel', 'Williams', 'Johnson', 'Kim', 'Garcia', 'Smith', 'Brown',
    'Lee', 'Martinez', 'Anderson', 'Thompson', 'Rivera', 'Wong', 'Gupta', 'Miller'];
  const companies = ['Acme AI Labs', 'Globex Financial Group', 'Initech Risk Advisory', 'Northstar University',
    'Umbrella Community Foundation', 'Stark Resources', 'Wayne Digital', 'Oscorp Assurance',
    'Massive Dynamic Energy', 'Hooli Software', 'Pied Piper Capital', 'Sterling Board Institute'];
  const positions = ['Software Engineer', 'Product Manager', 'Data Scientist', 'Engineering Director',
    'VP Marketing', 'CFO', 'Senior Analyst', 'UX Designer', 'CTO', 'Head of AI'];

  // Generate connections
  const connections = [];
  for (let i = 0; i < 350; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const ci = (i * 7 + 3) % companies.length;
    const pi = (i * 3 + 1) % positions.length;
    const dateIdx = Math.floor((i / 350) * 30) + Math.floor(Math.sin(i * 0.5) * 6) + 3;
    const date = months[Math.min(months.length - 1, Math.abs(dateIdx))];
    connections.push({
      'First Name': fn,
      'Last Name': ln,
      URL: `https://linkedin.com/in/${fn.toLowerCase()}-${ln.toLowerCase()}-${i}`,
      Company: companies[ci],
      Position: positions[pi],
      'Connected On': date ? `${date}-15` : ''
    });
  }

  // Generate messages
  const messages = [];
  for (let i = 0; i < 200; i++) {
    const fromOwner = Math.floor(i / 50) % 2 === 0;
    const ci = (i * 11 + 2) % 50;
    const conn = connections[ci];
    const dateIdx = Math.floor(i / 200 * 28) + Math.floor(Math.sin(i * 1.3) * 4) + 2;
    const date = months[Math.min(months.length - 1, Math.abs(dateIdx))];

    const topics = ['AI adoption strategy for enterprise', 'risk governance framework', 'digital transformation',
      'compliance automation', 'board leadership program', 'community engagement metrics'];
    const subject = topics[i % topics.length];
    const content = `Hi ${conn['First Name']}, following up on our discussion about ${subject.toLowerCase()}. I wanted to share some thoughts on how we can approach this together. The key is balancing innovation with proper governance controls. Let me know your availability for a follow-up conversation. Best regards`;

    messages.push({
      FROM: fromOwner ? sampleOwner : `${conn['First Name']} ${conn['Last Name']}`,
      TO: fromOwner ? `${conn['First Name']} ${conn['Last Name']}` : sampleOwner,
      DATE: date ? `${date}-10` : '',
      SUBJECT: subject,
      CONTENT: content,
      'SENDER PROFILE URL': fromOwner ? '' : conn.URL,
      'RECIPIENT PROFILE URLS': fromOwner ? conn.URL : ''
    });
  }

  // Generate shares
  const shares = [];
  const shareTexts = [
    'Excited to share that our AI governance framework was recognized at the industry summit. Thanks to the incredible team that made this possible.',
    'Just completed a comprehensive risk assessment for digital transformation programs. Key finding: governance maturity is the single biggest predictor of success.',
    'Honored to join the board of the Technology Leadership Foundation, working to increase diversity in tech leadership.',
    'Published a new article on the intersection of AI ethics and corporate governance. Would love to hear your thoughts.',
    'Celebrating 5 years of community engagement programs that have connected over 2,000 professionals with mentorship opportunities.',
    'The future of compliance is automated, but human judgment remains irreplaceable. Here is why both matter.',
    'Reflecting on the importance of building diverse professional networks. My best opportunities came through connections outside my immediate domain.',
    'Completed a certification in AI risk management. Essential knowledge for any governance professional in 2026.',
    'Grateful for the LinkedIn community that makes knowledge sharing possible. Every conversation is a chance to learn.',
    'Data-driven decision making is transforming how boards approach risk oversight. Here is what governance professionals need to know.'
  ];
  for (let i = 0; i < 25; i++) {
    const dateIdx = (i * 3 + 7);
    const date = months[Math.min(months.length - 1, dateIdx)];
    shares.push({
      Date: date ? `${date}-05` : '',
      ShareCommentary: shareTexts[i % shareTexts.length],
      ShareLink: `https://linkedin.com/posts/${i + 1000}`,
      Visibility: 'PUBLIC'
    });
  }

  // Generate comments
  const comments = [];
  for (let i = 0; i < 80; i++) {
    const dateIdx = (i * 2 + 4);
    const date = months[Math.min(months.length - 1, dateIdx)];
    comments.push({
      Date: date ? `${date}-08` : '',
      Message: `Great perspective on ${['AI risk', 'governance', 'leadership', 'digital transformation', 'community'][i % 5]}. Thanks for sharing!`
    });
  }

  // Generate reactions
  const reactions = [];
  for (let i = 0; i < 150; i++) {
    const dateIdx = (i + 2);
    const date = months[Math.min(months.length - 1, dateIdx)];
    reactions.push({
      Date: date ? `${date}-12` : '',
      Type: ['LIKE', 'PRAISE', 'EMPATHY', 'APPRECIATION'][i % 4]
    });
  }

  // Generate invitations
  const invitations = [];
  for (let i = 0; i < 40; i++) {
    const dateIdx = i + 5;
    const date = months[Math.min(months.length - 1, dateIdx)];
    invitations.push({
      'Sent At': date ? `${date}-03` : '',
      Direction: i % 3 === 0 ? 'INCOMING' : 'OUTGOING',
      'To/From': `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`
    });
  }

  // Generate positions
  const positionsData = [
    { company: 'Acme Corp', title: 'VP of Risk & Governance', started: '2024-01', finished: '' },
    { company: 'Globex', title: 'Director of Compliance', started: '2021-06', finished: '2023-12' },
    { company: 'Initech', title: 'Senior Manager, Audit & Assurance', started: '2018-03', finished: '2021-05' },
    { company: 'Umbrella', title: 'Manager, Technology Risk', started: '2014-09', finished: '2018-02' },
    { company: 'Stark Industries', title: 'Senior Consultant', started: '2010-08', finished: '2014-08' },
  ].map(p => ({
    'Company Name': p.company,
    Title: p.title,
    'Started On': p.started,
    'Finished On': p.finished,
    Description: `Led ${p.title.toLowerCase()} initiatives across the organization.`
  }));

  // Generate skills
  const skills = [
    'Risk Management', 'AI Governance', 'Compliance', 'Digital Transformation',
    'Board Leadership', 'Stakeholder Engagement', 'Data Privacy', 'Audit & Assurance',
    'Strategic Planning', 'Community Building'
  ].map(name => ({ Name: name }));

  // Generate certifications
  const certifications = [
    { Name: 'AI Risk Management Professional', Authority: 'AICPA' },
    { Name: 'Certified Information Systems Auditor', Authority: 'ISACA' },
    { Name: 'Board Leadership Fellow', Authority: 'NACD' }
  ];

  // Generate endorsements
  const endorsementsReceived = skills.slice(0, 6).map(s => ({
    'Skill Name': s.Name,
    'Endorser Name': `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
  }));

  // Generate learning
  const learning = [
    { 'Content Title': 'AI Ethics for Executives', 'Content Description': 'Comprehensive framework for ethical AI deployment in regulated industries.' },
    { 'Content Title': 'Digital Risk Governance', 'Content Description': 'Best practices for governing digital transformation risk across the enterprise.' },
    { 'Content Title': 'Inclusive Leadership', 'Content Description': 'Building diverse, equitable and inclusive leadership teams.' },
    { 'Content Title': 'Cybersecurity for Board Members', 'Content Description': 'Essential cybersecurity knowledge for effective board oversight.' }
  ];

  // Generate Profile
  const profile = [{
    'First Name': 'Demo',
    'Last Name': 'User',
    Headline: 'Risk, technology and governance leader helping organizations navigate complex systems',
    'Geo Location': 'Canada',
    Industry: 'Technology'
  }];

  return {
    connections,
    messages,
    shares,
    comments,
    reactions,
    invitations,
    positions: positionsData,
    skills,
    certifications,
    endorsementsReceived,
    learning,
    profile
  };
}

export default { generateSampleData };
