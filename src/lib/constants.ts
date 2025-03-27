// src/lib/constants.ts

export const ASSESSMENT_TYPES = {
    FJRL: 'fjrl',
    IJRL: 'ijrl',
    CDRL: 'cdrl',
    CCRL: 'ccrl',
    CTRL: 'ctrl',
    RRL: 'rrl',
    IRL: 'irl',
  };
  
  export const ASSESSMENT_TITLES = {
    [ASSESSMENT_TYPES.FJRL]: 'First Job Readiness Level',
    [ASSESSMENT_TYPES.IJRL]: 'Ideal Job Readiness Level',
    [ASSESSMENT_TYPES.CDRL]: 'Career Development Readiness Level',
    [ASSESSMENT_TYPES.CCRL]: 'Career Comeback Readiness Level',
    [ASSESSMENT_TYPES.CTRL]: 'Career Transition Readiness Level',
    [ASSESSMENT_TYPES.RRL]: 'Retirement Readiness Level',
    [ASSESSMENT_TYPES.IRL]: 'Internship Readiness Level',
  };
  
  export const ASSESSMENT_DESCRIPTIONS = {
    [ASSESSMENT_TYPES.FJRL]: "The First Job Readiness Level (FJRL) evaluates a fresh graduate's preparedness for their first job. It assesses key competencies, self-awareness, and readiness for professional environments.",
    [ASSESSMENT_TYPES.IJRL]: "The Ideal Job Readiness Level (IJRL) evaluates a job seeker's preparedness to secure and succeed in their desired role. It helps individuals with minimal or some experience understand their current level of readiness.",
    [ASSESSMENT_TYPES.CDRL]: "The Career Development Readiness Level (CDRL) assesses an individual's preparedness for career advancement or growth within their current field.",
    [ASSESSMENT_TYPES.CCRL]: "The Career Comeback Readiness Level (CCRL) evaluates an individual's preparedness to return to the workforce or transition into a new role after a hiatus.",
    [ASSESSMENT_TYPES.CTRL]: "The Career Transition Readiness Level (CTRL) evaluates an individual's preparedness to make a significant career change, whether to a new industry, role, or work environment.",
    [ASSESSMENT_TYPES.RRL]: "The Retirement Readiness Level (RRL) assesses an individual's preparedness for retirement, focusing on their financial stability, emotional and mental readiness, future planning, and overall well-being.",
    [ASSESSMENT_TYPES.IRL]: "The Internship Readiness Level (IRL) assesses an individual's preparedness for entering the professional world through internships, focusing on their skills, adaptability, work ethic, and alignment with career goals.",
  };
  
  export const ASSESSMENT_PRICES = {
    [ASSESSMENT_TYPES.FJRL]: 49.00,
    [ASSESSMENT_TYPES.IJRL]: 49.00,
    [ASSESSMENT_TYPES.CDRL]: 49.00,
    [ASSESSMENT_TYPES.CCRL]: 49.00,
    [ASSESSMENT_TYPES.CTRL]: 49.00,
    [ASSESSMENT_TYPES.RRL]: 49.00,
    [ASSESSMENT_TYPES.IRL]: 49.00,
  };