// src/lib/assessmentQuestions.ts

/**
 * Assessment questions for different assessment types
 * Based on the detailed Google Forms templates provided
 */
export const assessmentQuestions = {
  fjrl: [
    {
      id: 'fjrl_professionalism',
      label: 'Professionalism',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Work habits and ethics align with the standards expected in professional environments.',
        'Punctuality and time management skills ensure timely completion of tasks and adherence to schedules.',
        'Professional appearance and demeanor align with industry norms and organizational expectations.',
        'Awareness of workplace hierarchy and respect for roles and responsibilities is consistently practiced.',
        'Confidentiality and integrity are maintained when dealing with sensitive or organizational information'
      ]
    },
    {
      id: 'fjrl_learning',
      label: 'Learning Skills',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'New tasks and skills are approached with curiosity and a willingness to learn.',
        'Constructive feedback is actively sought and applied to improve performance.',
        'Research and self-learning tools are effectively used to acquire job-specific knowledge.',
        'The ability to analyze and synthesize information supports continuous learning.',
        'Growth opportunities are identified and pursued proactively to align with career goals.'
      ]
    },
    {
      id: 'fjrl_communication',
      label: 'Communication Skills',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Communication is clear, concise, and tailored to the audience and purpose.',
        'Active listening ensures accurate understanding and meaningful responses during conversations.',
        'Written correspondence, including emails and reports, adheres to professional standards.',
        'Presentation skills effectively convey ideas, concepts, or solutions to diverse audiences.',
        'Non-verbal communication, including body language and tone, aligns with the intended message.'
      ]
    },
    {
      id: 'fjrl_thinking',
      label: 'Creative and Critical Thinking',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Problems are analyzed from multiple perspectives to identify effective solutions.',
        'Innovative approaches are explored when addressing challenges or improving processes.',
        'Logical reasoning and evidence-based thinking guide decision-making.',
        'Risks and potential consequences are considered when proposing or implementing solutions.',
        'Opportunities for improvement or innovation are identified and communicated effectively.'
      ]
    },
    {
      id: 'fjrl_teamwork',
      label: 'Teamwork and Collaboration',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Roles and responsibilities within teams are understood and fulfilled effectively.',
        'Collaboration is fostered by actively engaging with team members and valuing diverse perspectives.',
        'Conflicts are resolved constructively to maintain team harmony and productivity.',
        'Contributions to team projects are consistent, reliable, and aligned with shared objectives.',
        'Recognition and appreciation of the strengths and efforts of team members are regularly practiced.'
      ]
    },
    {
      id: 'fjrl_selfmanagement',
      label: 'Self Management',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Daily tasks and responsibilities are organized effectively to ensure productivity.',
        'Stress and challenges are managed constructively without compromising performance.',
        'Initiative is taken to address tasks or responsibilities without waiting for direct instruction.',
        'Personal and professional goals are set and tracked for continuous self-improvement.',
        'Work-life balance is maintained to ensure overall well-being and sustained performance.'
      ]
    },
    {
      id: 'fjrl_selfawareness',
      label: 'Self Awareness and Growth Orientation',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Strengths and areas for improvement are clearly identified and articulated.',
        'Constructive feedback is embraced as an opportunity for personal and professional development.',
        'Career aspirations are aligned with skills, values, and industry opportunities.',
        'Efforts to develop soft skills, such as empathy and emotional intelligence, are consistently made.',
        'A growth mindset drives the pursuit of learning and adaptation in a changing work environment.'
      ]
    }
  ],
  ijrl: [
    {
      id: 'ijrl_alignment',
      label: 'Professional Alignment',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'The job description and responsibilities align with personal career aspirations and long-term goals.',
        'The company\'s mission, vision, and values resonate with personal principles and motivations.',
        'Industry knowledge and understanding of trends support informed decision-making about the role.',
        'The desired role offers opportunities for growth and skill development aligned with future aspirations.',
        'Expectations regarding work culture, job security, and benefits are realistic and well-informed.'
      ]
    },
    {
      id: 'ijrl_skills',
      label: 'Skills and Competency',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'The technical skills needed for the role are well understood and sufficiently developed.',
        'Problem-solving and critical thinking abilities match the requirements of the ideal job.',
        'Soft skills, such as communication and adaptability, align with industry and role expectations.',
        'Transferable skills from previous experiences can be effectively applied to the desired position.',
        'A clear understanding of gaps in current competencies allows for targeted skill-building.'
      ]
    },
    {
      id: 'ijrl_networking',
      label: 'Networking and Professional Presence',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'A professional network has been established to explore opportunities and gather industry insights.',
        'Online profiles, such as LinkedIn, are optimized to showcase relevant skills and achievements.',
        'Participation in professional events and forums demonstrates engagement with the industry.',
        'Effective networking strategies are employed to create meaningful connections.',
        'Communication in professional settings reflects confidence and clarity.'
      ]
    },
    {
      id: 'ijrl_market',
      label: 'Job Market Knowledge',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Current job market trends and in-demand skills in the industry are well-researched and understood.',
        'Knowledge of key employers and their expectations supports targeted job applications.',
        'Awareness of salary ranges, benefits, and negotiation strategies is comprehensive.',
        'The competitive landscape for the ideal role is analyzed to develop a standout application strategy.',
        'Economic and technological changes influencing the industry are accounted for in career planning.'
      ]
    },
    {
      id: 'ijrl_application',
      label: 'Application and Interview Readiness',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Resumes and cover letters are tailored to highlight relevant experiences and achievements.',
        'Application materials are error-free, professional, and aligned with job requirements.',
        'Interview preparation includes understanding the role, company, and potential questions.',
        'Responses during interviews effectively convey competencies, enthusiasm, and cultural fit.',
        'Confidence and composure are maintained during high-pressure interview situations.'
      ]
    },
    {
      id: 'ijrl_emotional',
      label: 'Emotional and Social Intelligence',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Relationships with colleagues and supervisors are managed with empathy and understanding.',
        'Feedback is received constructively and used to improve performance and relationships.',
        'Adaptability is demonstrated in response to changing roles, challenges, and team dynamics.',
        'Emotional resilience and stress management techniques support professional success.',
        'The ability to navigate workplace conflicts promotes a harmonious and productive environment.'
      ]
    },
    {
      id: 'ijrl_growth',
      label: 'Continuous Growth and Self Reflection',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'A proactive approach is taken to identify and pursue learning opportunities.',
        'Strengths and areas for improvement are regularly assessed to guide personal growth.',
        'Long-term goals are set and adjusted based on self-reflection and professional aspirations.',
        'A growth mindset drives the pursuit of knowledge and adaptability in evolving roles.',
        'Motivation to excel in the ideal job is fueled by intrinsic and extrinsic factors.'
      ]
    }
  ],
  cdrl: [
    {
      id: 'cdrl_leadership',
      label: 'Leadership and Management Readiness',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Leadership skills are demonstrated through effective delegation and team empowerment.',
        'Decision-making reflects a balance of analytical reasoning and intuitive judgment.',
        'Conflict resolution is approached constructively, ensuring harmony and productivity.',
        'Strategic thinking and planning align with organizational goals and team capabilities.',
        'Emotional intelligence enables effective communication and trust-building within teams.'
      ]
    },
    {
      id: 'cdrl_skills',
      label: 'Role-Specific Skills and Expertise',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Current skills and expertise are aligned with the responsibilities of the target role.',
        'Continuous upskilling is pursued to remain competitive and meet evolving industry demands.',
        'Advanced knowledge of tools, processes, and systems enhances role-specific effectiveness.',
        'Problem-solving and technical proficiency address complex challenges in the desired role.',
        'A clear understanding of the industry landscape informs decision-making and innovation.'
      ]
    },
    {
      id: 'cdrl_vision',
      label: 'Career Vision and Goal Alignment',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Career goals are clearly defined and align with personal values and professional ambitions.',
        'The desired role contributes to long-term career growth and personal fulfillment.',
        'Career transitions are planned with awareness of potential challenges and opportunities.',
        'Opportunities for meaningful contributions and recognition are identified in the target role.',
        'A balance between professional growth and work-life harmony is prioritized.'
      ]
    },
    {
      id: 'cdrl_networking',
      label: 'Networking and Professional Presence',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Strong professional relationships with colleagues, mentors, and industry peers are established.',
        'Networking efforts contribute to career opportunities and knowledge sharing.',
        'Professional branding, including online presence and achievements, reflects expertise.',
        'Collaboration and partnerships are cultivated to drive mutual growth and success.',
        'Active participation in industry forums and events showcases leadership potential.'
      ]
    },
    {
      id: 'cdrl_emotional',
      label: 'Emotional and Social Intelligence',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Emotional self-regulation ensures resilience in challenging situations.',
        'Empathy and understanding foster collaborative relationships with diverse stakeholders.',
        'Feedback is accepted with humility and used for continuous improvement.',
        'Adaptability to changing roles and environments enhances professional effectiveness.',
        'Strong interpersonal communication skills facilitate conflict resolution and teamwork.'
      ]
    },
    {
      id: 'cdrl_innovation',
      label: 'Innovation and Strategic Thinking',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Innovative ideas and solutions address challenges and drive progress in the organization.',
        'Strategic goals are set and pursued with a focus on measurable outcomes.',
        'A proactive approach is taken to identify and leverage emerging opportunities.',
        'Analytical thinking and creativity combine to solve complex problems effectively.',
        'Contributions to organizational strategies demonstrate forward-thinking and vision.'
      ]
    },
    {
      id: 'cdrl_learning',
      label: 'Continuous Learning and Self Reflection',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'Professional development goals are pursued through formal education and experiential learning.',
        'Strengths and areas for improvement are regularly reviewed for targeted growth.',
        'Curiosity and openness to learning drive adaptability in evolving professional contexts.',
        'Constructive self-reflection informs decisions and shapes career trajectories.',
        'A growth mindset fosters resilience and motivation in the face of challenges.'
      ]
    }
  ],
  ccrl: [
    {
      id: 'ccrl_relevance',
      label: 'Career Relevance and Industry Alignment',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'My professional knowledge and skills are up-to-date with the current industry standards.',
        'I have a clear understanding of the changes and trends in my target industry since my hiatus.',
        'I have identified the skills and certifications required for my desired role.',
        'My previous experience and achievements align with the expectations of my desired job.',
        'I can articulate how my background adds value to the current demands of the industry.'
      ]
    },
    {
      id: 'ccrl_confidence',
      label: 'Confidence and Emotional Readiness',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I feel confident about competing with current professionals for the desired role.',
        'I have strategies to address potential challenges related to my career hiatus.',
        'I am emotionally prepared to manage workplace dynamics and responsibilities.',
        'I view my career break as an opportunity to reflect and grow professionally.',
        'I am adaptable to changes in workplace culture and technological advancements.'
      ]
    },
    {
      id: 'ccrl_networking',
      label: 'Networking and Professional Relationships',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have an active professional network that can support my career comeback.',
        'I have re-established connections with former colleagues, mentors, and industry peers.',
        'I actively engage in industry events, forums, and professional communities.',
        'I can leverage my network to explore job opportunities and gain insights into the job market.',
        'I maintain a professional presence through platforms like LinkedIn to showcase my skills.'
      ]
    },
    {
      id: 'ccrl_skills',
      label: 'Skill Renewal and Lifelong Learning',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have completed relevant training, courses, or certifications to refresh or update my skills.',
        'I am committed to continuous learning to stay relevant in my chosen field.',
        'I seek opportunities to gain hands-on experience and practical exposure to new tools or technologies.',
        'I actively explore resources to bridge any skill gaps identified during my hiatus.',
        'I am open to learning from younger colleagues or mentors who have industry-specific expertise.'
      ]
    },
    {
      id: 'ccrl_balance',
      label: 'Self Management and Work Life Balance',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have strategies in place to manage my time and responsibilities effectively.',
        'I am prepared to create a balance between my personal and professional life.',
        'I am confident in my ability to set boundaries to maintain work-life harmony.',
        'I have resolved any personal challenges that might impact my work performance.',
        'I have a plan to adjust to a regular work schedule and workplace demands.'
      ]
    },
    {
      id: 'ccrl_interview',
      label: 'Interview and Job Search Preparedness',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'My resume and cover letter effectively highlight my skills, experiences, and career goals.',
        'I am confident in articulating the value of my career break during interviews.',
        'I am aware of how to tailor my job applications to specific employers and roles.',
        'I have practiced answering potential interview questions to address gaps in my career timeline.',
        'I am familiar with digital tools and platforms used in modern recruitment processes.'
      ]
    },
    {
      id: 'ccrl_motivation',
      label: 'Motivation and Career Purpose',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have a clear understanding of why I want to return to the workforce and what I seek in my next role.',
        'My career goals are aligned with my personal values and long-term aspirations.',
        'I am motivated to overcome challenges and remain committed to my career comeback.',
        'I find fulfillment in pursuing opportunities that align with my passions and strengths.',
        'I am prepared to embrace feedback and adapt my approach to achieve my career objectives.'
      ]
    }
  ],
  ctrl: [
    {
      id: 'ctrl_clarity',
      label: 'Clarity and Career Goals',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have a clear vision of the type of job and sector I want to transition into.',
        'I understand how my personal values and career aspirations align with my desired new role.',
        'I have identified the key factors (e.g., salary, work-life balance, job satisfaction) influencing my career transition decision.',
        'I have a concrete plan for how this transition aligns with my long-term professional growth.',
        'I can articulate the reasons why I am making this transition and how it benefits my career trajectory.'
      ]
    },
    {
      id: 'ctrl_skills',
      label: 'Transferable Skills and Experience',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I can identify the transferable skills from my current role that are relevant to my desired new position.',
        'I have evidence or examples of how I have successfully applied my skills in varied contexts.',
        'I can effectively communicate how my past achievements add value to the new role or sector.',
        'I understand the gaps between my current expertise and the requirements of my desired position.',
        'I am actively working on acquiring or enhancing skills to meet the expectations of the new role.'
      ]
    },
    {
      id: 'ctrl_adaptability',
      label: 'Adaptability and Learning Agility',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I am open to learning new tools, technologies, and methods required for the new role or sector.',
        'I have demonstrated resilience and flexibility when faced with career challenges or changes in the past.',
        'I view this career transition as an opportunity for personal and professional growth.',
        'I am comfortable stepping out of my comfort zone to adapt to new work environments.',
        'I seek feedback and use it constructively to enhance my performance in new situations.'
      ]
    },
    {
      id: 'ctrl_market',
      label: 'Market and Industry Understanding',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have researched the industry or sector I want to transition into, including its trends and demands.',
        'I am aware of the challenges and opportunities unique to the new sector.',
        'I understand the cultural and operational differences between my current role and the desired sector.',
        'I have identified potential employers or opportunities that align with my career transition goals.',
        'I have a clear understanding of the qualifications and competencies valued in the target industry.'
      ]
    },
    {
      id: 'ctrl_networking',
      label: 'Networking and Relationship Building',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have reached out to professionals in the industry I want to transition into for advice and insights.',
        'I am actively building connections that can help facilitate my career transition.',
        'I participate in industry events, workshops, or online forums relevant to my new career goals.',
        'I have a mentor or guide who is familiar with the sector I am targeting for transition.',
        'I can articulate my career story and transition goals effectively to new professional contacts.'
      ]
    },
    {
      id: 'ctrl_preparedness',
      label: 'Emotional and Mental Preparedness',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I am prepared to face potential setbacks or rejections during my career transition journey.',
        'I manage stress and uncertainty effectively while navigating career changes.',
        'I am confident in my ability to make a positive impression in a new industry or role.',
        'I have strategies to overcome self-doubt and maintain motivation during this process.',
        'I am prepared to invest the necessary time and effort to succeed in my career transition.'
      ]
    },
    {
      id: 'ctrl_interview',
      label: 'Application and Interview Preparedness',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'My resume and cover letter are tailored to highlight my suitability for the new role or sector.',
        'I can clearly explain my reasons for transitioning and how my background aligns with the target job.',
        'I have practiced responding to questions about my career change in a confident and positive manner.',
        'I am familiar with the recruitment processes and expectations in the new sector.',
        'I have prepared examples of how my skills and experiences demonstrate my readiness for the new role.'
      ]
    }
  ],
  rrl: [
    {
      id: 'rrl_financial',
      label: 'Financial Preparedness',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have a clear understanding of my current financial situation and future income sources, including pensions, savings, and investments.',
        'I have calculated my estimated monthly expenses for retirement and created a budget to sustain my lifestyle.',
        'I am aware of potential healthcare and long-term care costs and have prepared financially to manage them.',
        'I have diversified my savings and investments to minimize risks and ensure consistent income during retirement.',
        'I feel confident that my financial resources will support me throughout my retirement years without compromising my standard of living.'
      ]
    },
    {
      id: 'rrl_emotional',
      label: 'Emotional and Mental Preparedness',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have a positive outlook on retirement and see it as an opportunity to explore new interests and activities.',
        'I feel emotionally prepared to let go of my professional identity and embrace a new phase of life.',
        'I have strategies to manage potential feelings of isolation, boredom, or loss of purpose during retirement.',
        'I am comfortable discussing my retirement plans with family and friends and receiving their input or support.',
        'I have prepared for the emotional changes that may come with a reduced role in professional or social settings.'
      ]
    },
    {
      id: 'rrl_health',
      label: 'Physical and Health Preparedness',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have a plan to maintain my physical health through regular exercise, balanced nutrition, and preventive healthcare.',
        'I have consulted with healthcare professionals to ensure I understand and address my health needs for retirement.',
        'I have adequate health insurance or savings to cover unforeseen medical expenses.',
        'I feel physically capable of engaging in activities or hobbies that I look forward to pursuing in retirement.',
        'I regularly monitor and take proactive steps to maintain or improve my overall health.'
      ]
    },
    {
      id: 'rrl_purpose',
      label: 'Purpose and Lifestyle Planning',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have identified hobbies, activities, or causes that I want to explore or engage in during retirement.',
        'I feel confident that I can structure my daily routine to find purpose and joy in my retirement years.',
        'I have a clear plan for how I will stay socially connected and engaged after leaving the workforce.',
        'I have considered how I will balance leisure, personal development, and family responsibilities in retirement.',
        'I am excited about the opportunities retirement offers to pursue new goals and passions.'
      ]
    },
    {
      id: 'rrl_social',
      label: 'Social and Community Engagement',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have a strong support network of family and friends who I can rely on during retirement.',
        'I am comfortable reaching out to new people or joining groups to expand my social circle if needed.',
        'I plan to volunteer, mentor, or participate in community programs to stay connected and active.',
        'I have identified ways to continue contributing to society or sharing my knowledge and skills during retirement.',
        'I value and prioritize maintaining meaningful relationships in my retirement years.'
      ]
    },
    {
      id: 'rrl_income',
      label: 'Gig Work and Supplemental Income',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have explored opportunities for part-time work or freelancing to supplement my retirement income if needed.',
        'I feel confident that I can leverage my skills or expertise to generate additional income post-retirement.',
        'I have considered how gig work might affect my retirement plans, both positively and negatively.',
        'I am aware of how to balance gig work with leisure and family time during retirement.',
        'I am open to adapting to new roles or industries for supplemental income opportunities if required.'
      ]
    },
    {
      id: 'rrl_spiritual',
      label: 'Spiritual and Reflective Readiness',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have considered how my retirement years can be a time for personal growth and self-reflection.',
        'I feel aligned with my personal values and priorities as I transition into this new phase of life.',
        'I regularly practice mindfulness, gratitude, or other techniques to nurture my emotional and spiritual well-being.',
        'I have identified ways to give back or leave a legacy that aligns with my purpose and beliefs.',
        'I feel at peace with my decision to retire and confident about the life I am transitioning into.'
      ]
    }
  ],
  irl: [
    {
      id: 'irl_skills',
      label: 'Core Skills and Knowledge',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I have a clear understanding of the technical requirements and job-specific knowledge for the role.',
        'My problem-solving abilities enable me to address challenges logically and effectively.',
        'I have a strong foundation in industry-related tools, technologies, or methodologies.',
        'I can apply critical thinking to analyze complex situations and develop appropriate solutions.',
        'I consistently seek opportunities to update my skills and stay relevant in my field.'
      ]
    },
    {
      id: 'irl_emotional',
      label: 'Emotional Intelligence',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I understand my strengths and weaknesses and how they impact my professional interactions.',
        'I can regulate my emotions under pressure to maintain focus and professionalism.',
        'I empathize with others\' perspectives and build positive relationships in the workplace.',
        'I handle constructive criticism with an open mind and use it for personal growth.',
        'I demonstrate resilience and adaptability when faced with unexpected challenges or changes.'
      ]
    },
    {
      id: 'irl_social',
      label: 'Social Intelligence',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I can work collaboratively with diverse teams to achieve common goals.',
        'I effectively navigate workplace dynamics and manage conflicts constructively.',
        'I am aware of cultural sensitivities and respect differences in professional environments.',
        'I communicate ideas clearly and persuasively, both verbally and in writing.',
        'I build and maintain professional networks that support my career development.'
      ]
    },
    {
      id: 'irl_competency',
      label: 'Competency and Know-How',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I can independently manage tasks and responsibilities to meet job expectations.',
        'I demonstrate precision and attention to detail in my work outputs.',
        'I can integrate theoretical knowledge into practical scenarios effectively.',
        'I am skilled at optimizing processes to improve efficiency and outcomes.',
        'I continuously evaluate my performance to identify and implement improvements.'
      ]
    },
    {
      id: 'irl_strategic',
      label: 'Strategic Thinking and Goal Setting',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I can set realistic goals and create actionable plans to achieve them.',
        'I prioritize tasks effectively to meet deadlines without compromising quality.',
        'I consider the broader implications of my actions in achieving organizational goals.',
        'I adapt my strategies when unforeseen obstacles or opportunities arise.',
        'I align my career aspirations with the organization\'s vision and mission.'
      ]
    },
    {
      id: 'irl_presentation',
      label: 'Professional Presentation and Preparedness',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'My resume and portfolio effectively showcase my skills, achievements, and experiences.',
        'I articulate my qualifications and career aspirations confidently during interviews.',
        'I demonstrate professional etiquette in all communication, whether written or verbal.',
        'I prepare thoroughly for interviews, including researching the company and role.',
        'My appearance and demeanor consistently reflect a professional standard.'
      ]
    },
    {
      id: 'irl_learning',
      label: 'Continuous Learning and Growth Mindset',
      description: 'Choose 1 statement that resonates with you.',
      options: [
        'I actively seek learning opportunities to enhance my skills and knowledge.',
        'I am open to feedback and view it as a tool for continuous improvement.',
        'I explore new technologies, trends, and methods relevant to my desired field.',
        'I take initiative in pursuing certifications, training, or projects to expand my expertise.',
        'I embrace challenges as opportunities to develop and grow professionally.'
      ]
    }
  ]
};

// Ensure ASSESSMENT_TITLES is exported from this file as well
export const ASSESSMENT_TITLES = {
  fjrl: 'First Job Readiness Level (FJRL)',
  ijrl: 'Ideal Job Readiness Level (IJRL)',
  cdrl: 'Career Development Readiness Level (CDRL)',
  ccrl: 'Career Comeback Readiness Level (CCRL)',
  ctrl: 'Career Transition Readiness Level (CTRL)',
  rrl: 'Retirement Readiness Level (RRL)',
  irl: 'Internship Readiness Level (IRL)'
};