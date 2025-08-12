const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const suggestions = [
    // Professional suggestions (mid level)
    { superpowerCode: 'A', jobTitle: 'Project Manager', shortDescription: 'Lead cross-functional teams and deliver complex projects', level: 'mid' },
    { superpowerCode: 'A', jobTitle: 'Operations Director', shortDescription: 'Oversee business operations and optimize processes', level: 'mid' },
    { superpowerCode: 'B', jobTitle: 'Data Analyst', shortDescription: 'Transform data into actionable business insights', level: 'mid' },
    { superpowerCode: 'B', jobTitle: 'Business Intelligence Manager', shortDescription: 'Drive strategic decisions through data analysis', level: 'mid' },
    { superpowerCode: 'C', jobTitle: 'Marketing Manager', shortDescription: 'Develop and execute marketing strategies', level: 'mid' },
    { superpowerCode: 'C', jobTitle: 'Client Relations Manager', shortDescription: 'Build and maintain strong client relationships', level: 'mid' },
    { superpowerCode: 'D', jobTitle: 'Product Manager', shortDescription: 'Innovate and launch new products', level: 'mid' },
    { superpowerCode: 'D', jobTitle: 'UX Designer', shortDescription: 'Create user-centered digital experiences', level: 'mid' },
    { superpowerCode: 'E', jobTitle: 'Team Lead', shortDescription: 'Guide and develop team members', level: 'mid' },
    { superpowerCode: 'E', jobTitle: 'Training Manager', shortDescription: 'Design and deliver employee development programs', level: 'mid' },

    // Graduate suggestions (entry level)
    { superpowerCode: 'A', jobTitle: 'Junior Project Coordinator', shortDescription: 'Support project management activities and learn the ropes', level: 'entry' },
    { superpowerCode: 'A', jobTitle: 'Operations Assistant', shortDescription: 'Assist in daily business operations and process improvement', level: 'entry' },
    { superpowerCode: 'B', jobTitle: 'Data Analyst Trainee', shortDescription: 'Start your journey in data analysis and business intelligence', level: 'entry' },
    { superpowerCode: 'B', jobTitle: 'Market Research Assistant', shortDescription: 'Analyze market trends and consumer behavior', level: 'entry' },
    { superpowerCode: 'C', jobTitle: 'Marketing Assistant', shortDescription: 'Learn digital marketing and brand communication', level: 'entry' },
    { superpowerCode: 'C', jobTitle: 'Customer Success Associate', shortDescription: 'Help customers succeed and build relationships', level: 'entry' },
    { superpowerCode: 'D', jobTitle: 'Junior Product Designer', shortDescription: 'Create innovative solutions and user experiences', level: 'entry' },
    { superpowerCode: 'D', jobTitle: 'Content Creator', shortDescription: 'Develop creative content for digital platforms', level: 'entry' },
    { superpowerCode: 'E', jobTitle: 'HR Assistant', shortDescription: 'Support talent acquisition and employee development', level: 'entry' },
    { superpowerCode: 'E', jobTitle: 'Teaching Assistant', shortDescription: 'Help others learn and grow in educational settings', level: 'entry' },
  ];

  for (const suggestion of suggestions) {
    await prisma.careerSuggestion.create({
      data: suggestion,
    });
  }

  console.log('Career suggestions seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });