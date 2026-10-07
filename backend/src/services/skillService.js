'use strict';

const { Op } = require('sequelize');
const { Skill, StudentSkill, StudentProfile } = require('../models');

// Curated default skills with categories
const DEFAULT_SKILLS = [
  // Programming Languages
  { name: 'Java', category: 'Programming', isPopular: true },
  { name: 'Python', category: 'Programming', isPopular: true },
  { name: 'C', category: 'Programming', isPopular: false },
  { name: 'C++', category: 'Programming', isPopular: true },
  { name: 'JavaScript', category: 'Programming', isPopular: true },
  { name: 'TypeScript', category: 'Programming', isPopular: true },
  { name: 'Go', category: 'Programming', isPopular: false },
  { name: 'Rust', category: 'Programming', isPopular: true },

  // Web Development
  { name: 'React', category: 'Web Development', isPopular: true },
  { name: 'Node.js', category: 'Web Development', isPopular: true },
  { name: 'HTML & CSS', category: 'Web Development', isPopular: true },
  { name: 'Next.js', category: 'Web Development', isPopular: true },
  { name: 'Express.js', category: 'Web Development', isPopular: true },
  { name: 'Spring Boot', category: 'Web Development', isPopular: true },
  { name: 'Tailwind CSS', category: 'Web Development', isPopular: true },
  { name: 'Vue.js', category: 'Web Development', isPopular: false },

  // AI & Machine Learning
  { name: 'Machine Learning', category: 'AI/ML', isPopular: true },
  { name: 'Deep Learning', category: 'AI/ML', isPopular: true },
  { name: 'Generative AI', category: 'AI/ML', isPopular: true },
  { name: 'NLP', category: 'AI/ML', isPopular: true },
  { name: 'Computer Vision', category: 'AI/ML', isPopular: true },
  { name: 'PyTorch', category: 'AI/ML', isPopular: true },
  { name: 'TensorFlow', category: 'AI/ML', isPopular: false },

  // Data & Cloud
  { name: 'SQL', category: 'Data & Cloud', isPopular: true },
  { name: 'MongoDB', category: 'Data & Cloud', isPopular: true },
  { name: 'PostgreSQL', category: 'Data & Cloud', isPopular: true },
  { name: 'Docker', category: 'Data & Cloud', isPopular: true },
  { name: 'Kubernetes', category: 'Data & Cloud', isPopular: false },
  { name: 'AWS Cloud', category: 'Data & Cloud', isPopular: true },
  { name: 'DevOps', category: 'Data & Cloud', isPopular: true },
  { name: 'Data Science', category: 'Data & Cloud', isPopular: true },

  // Mobile & Systems
  { name: 'Android (Kotlin)', category: 'Mobile & Systems', isPopular: true },
  { name: 'Flutter', category: 'Mobile & Systems', isPopular: true },
  { name: 'React Native', category: 'Mobile & Systems', isPopular: false },
  { name: 'Embedded Systems', category: 'Mobile & Systems', isPopular: true },
  { name: 'IoT (Arduino/ESP32)', category: 'Mobile & Systems', isPopular: true },
  { name: 'Linux System Admin', category: 'Mobile & Systems', isPopular: true },

  // Design & Creative
  { name: 'UI/UX Design', category: 'Design', isPopular: true },
  { name: 'Graphic Design', category: 'Design', isPopular: true },
  { name: 'Figma', category: 'Design', isPopular: true },
  { name: 'Video Editing', category: 'Design', isPopular: false },
  { name: 'Photography', category: 'Design', isPopular: false },

  // Soft Skills & Leadership
  { name: 'Public Speaking', category: 'Soft Skills', isPopular: true },
  { name: 'Technical Writing', category: 'Soft Skills', isPopular: true },
  { name: 'Leadership', category: 'Soft Skills', isPopular: true },
  { name: 'Product Management', category: 'Soft Skills', isPopular: false },
];

/**
 * Bootstrap default skill catalog into the database
 */
const seedDefaultSkills = async () => {
  try {
    for (const item of DEFAULT_SKILLS) {
      await Skill.findOrCreate({
        where: { name: item.name },
        defaults: item,
      });
    }
  } catch (err) {
    console.error('Error bootstrapping skills catalog:', err.message);
  }
};

/**
 * Get skills with optional category or query search
 */
const getSkills = async ({ category, query, popularOnly }) => {
  const where = {};
  if (category && category !== 'all') {
    where.category = category;
  }
  if (popularOnly) {
    where.isPopular = true;
  }
  if (query) {
    where.name = { [Op.like]: `%${query}%` };
  }

  return Skill.findAll({
    where,
    order: [['category', 'ASC'], ['name', 'ASC']],
  });
};

/**
 * Find or create a skill by name
 */
const findOrCreateSkill = async (name, category = 'General') => {
  const cleanName = name.trim();
  const [skill] = await Skill.findOrCreate({
    where: { name: cleanName },
    defaults: { name: cleanName, category },
  });
  return skill;
};

/**
 * Sync StudentProfile JSON arrays (skillsKnown / skillsWanted) with relational StudentSkill rows
 */
const syncProfileSkillArrays = async (studentProfileId) => {
  const studentSkills = await StudentSkill.findAll({
    where: { studentProfileId },
    include: [{ model: Skill, as: 'skill', attributes: ['name'] }],
  });

  const known = studentSkills
    .filter((s) => s.skillType === 'known')
    .map((s) => s.skill.name);

  const wanted = studentSkills
    .filter((s) => s.skillType === 'wanted')
    .map((s) => s.skill.name);

  await StudentProfile.update(
    { skillsKnown: known, skillsWanted: wanted },
    { where: { id: studentProfileId } }
  );
};

/**
 * Add a skill to student's profile
 */
const addStudentSkill = async (studentProfileId, { skillName, skillType = 'known', proficiency = 'intermediate', canTeach = true, category = 'General' }) => {
  if (!skillName || !skillName.trim()) {
    throw new Error('Skill name is required.');
  }

  const validTypes = ['known', 'wanted'];
  if (!validTypes.includes(skillType)) {
    throw new Error(`Invalid skill type: ${skillType}. Must be 'known' or 'wanted'.`);
  }

  const validProficiency = ['beginner', 'intermediate', 'advanced'];
  if (!validProficiency.includes(proficiency.toLowerCase())) {
    throw new Error(`Invalid proficiency: ${proficiency}. Must be beginner, intermediate, or advanced.`);
  }

  const skill = await findOrCreateSkill(skillName.trim(), category);

  // Check if student already has this skill with this type
  const existing = await StudentSkill.findOne({
    where: {
      studentProfileId,
      skillId: skill.id,
      skillType,
    },
  });

  if (existing) {
    // Update existing proficiency and teaching willingness
    await existing.update({
      proficiency: proficiency.toLowerCase(),
      canTeach: skillType === 'known' ? !!canTeach : false,
    });
    await syncProfileSkillArrays(studentProfileId);
    return { studentSkill: existing, skill, isNew: false };
  }

  const created = await StudentSkill.create({
    studentProfileId,
    skillId: skill.id,
    skillType,
    proficiency: proficiency.toLowerCase(),
    canTeach: skillType === 'known' ? !!canTeach : false,
  });

  await syncProfileSkillArrays(studentProfileId);
  return { studentSkill: created, skill, isNew: true };
};

/**
 * Remove a skill from student profile
 */
const removeStudentSkill = async (studentProfileId, studentSkillId) => {
  const record = await StudentSkill.findOne({
    where: { id: studentSkillId, studentProfileId },
  });

  if (!record) {
    throw new Error('Student skill record not found.');
  }

  await record.destroy();
  await syncProfileSkillArrays(studentProfileId);
  return { success: true };
};

/**
 * Get all skills for a student profile
 */
const getStudentSkills = async (studentProfileId) => {
  const skills = await StudentSkill.findAll({
    where: { studentProfileId },
    include: [{ model: Skill, as: 'skill' }],
    order: [['skillType', 'ASC'], ['proficiency', 'DESC']],
  });

  return {
    known: skills.filter((s) => s.skillType === 'known'),
    wanted: skills.filter((s) => s.skillType === 'wanted'),
  };
};

module.exports = {
  seedDefaultSkills,
  getSkills,
  findOrCreateSkill,
  addStudentSkill,
  removeStudentSkill,
  getStudentSkills,
  syncProfileSkillArrays,
};
