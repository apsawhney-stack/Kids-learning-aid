import { Subject } from '../types/chat';

export interface SubjectCurriculum {
  title: string;
  icon: string;
  color: string;
  topics: Array<{
    name: string;
    description: string;
    teachingStrategy: string;
  }>;
}

export const CURRICULUM_DATA: Record<Subject, SubjectCurriculum> = {
  math: {
    title: 'Math',
    icon: '📐',
    color: '#3B82F6', // Blue
    topics: [
      {
        name: 'Ratios & Proportions',
        description: 'Part-to-part, part-to-whole ratios, unit rates, equivalent ratios.',
        teachingStrategy: 'Use Tape Diagrams and double number lines. Compare quantities using Minecraft crafting recipes or sports stats.'
      },
      {
        name: 'Negative Numbers & Integers',
        description: 'Absolute value, opposites, coordinate planes, adding/subtracting on a number line.',
        teachingStrategy: 'Use a visual horizontal number line. Explain negative signs as direction/owing debt.'
      },
      {
        name: 'Fractions & Decimals',
        description: 'Dividing fractions by fractions, converting decimals to percents.',
        teachingStrategy: 'Use visual fraction bars and reciprocal models ("How many 1/4s fit into 1/2?").'
      },
      {
        name: 'Algebraic Expressions & One-Step Equations',
        description: 'Variables, coefficients, evaluating expressions ($3x + 5$), solving $x + a = b$.',
        teachingStrategy: 'Use balance scale analogy: whatever you do to one side of the equal sign, you must do to the other.'
      },
      {
        name: 'Geometry & Surface Area',
        description: 'Area of triangles/quadrilaterals, surface area nets, volume of rectangular prisms.',
        teachingStrategy: 'Unfold 3D shapes into 2D nets like unfolding a Minecraft cube.'
      },
      {
        name: 'Statistics & Measures of Center',
        description: 'Mean, median, mode, range, interquartile range (IQR), box plots.',
        teachingStrategy: 'Use basketball scoring averages or gamer leaderboard data.'
      }
    ]
  },
  english: {
    title: 'English (ELA)',
    icon: '📖',
    color: '#10B981', // Emerald
    topics: [
      {
        name: 'Reading Comprehension & Themes',
        description: 'Determining central idea/theme and how it is conveyed through particular details.',
        teachingStrategy: 'Distinguish plot (what happens) from theme (the life lesson/universal message).'
      },
      {
        name: 'CER Framework (Claim, Evidence, Reasoning)',
        description: 'Stating a clear claim, quoting textual evidence, and explaining reasoning.',
        teachingStrategy: 'Use the Detective model: Claim is the suspect, Evidence is the clue, Reasoning is explaining how the clue proves guilt.'
      },
      {
        name: 'Vocabulary in Context',
        description: 'Using Greek/Latin roots, prefixes, suffixes, and context clues.',
        teachingStrategy: 'Break word down like a compound puzzle.'
      },
      {
        name: 'Point of View & Perspective',
        description: '1st person vs 3rd person limited/omniscient and author purpose.',
        teachingStrategy: 'Compare to video game camera angles (1st-person shooter vs 3rd-person over-the-shoulder).'
      }
    ]
  },
  science: {
    title: 'Science',
    icon: '🔬',
    color: '#8B5CF6', // Purple
    topics: [
      {
        name: 'Scientific Method & Variables',
        description: 'Formulating testable hypotheses; identifying independent, dependent, and controlled variables.',
        teachingStrategy: 'Use the Balance Scale visual: Independent is the ONE thing I change, Dependent is the data that reacts.'
      },
      {
        name: 'Earth Systems & Weather',
        description: 'Water cycle, rock cycle, plate tectonics, atmospheric patterns.',
        teachingStrategy: 'Trace energy cycles with flowchart steps.'
      },
      {
        name: 'Cells & Living Systems',
        description: 'Cell structure (plant vs animal organelles), human body systems working together.',
        teachingStrategy: 'Compare cell organelles to a bustling city (Mitochondria = Power plant, Nucleus = City Hall).'
      },
      {
        name: 'Ecosystems & Energy Flow',
        description: 'Producers, consumers, decomposers, food webs, and energy pyramids (10% rule).',
        teachingStrategy: 'Trace energy like XP or resource collection in Minecraft ecosystems.'
      }
    ]
  },
  history: {
    title: 'History / Social Studies',
    icon: '🏛️',
    color: '#F59E0B', // Amber
    topics: [
      {
        name: 'Ancient Civilizations',
        description: 'Mesopotamia, Ancient Egypt, Greece, Rome, Indus Valley, Ancient China.',
        teachingStrategy: 'Connect geography (rivers like Nile/Tigris) to civilization survival (farming, trade).'
      },
      {
        name: 'Primary vs. Secondary Sources',
        description: 'Evaluating reliability, bias, artifacts, letters vs modern textbooks.',
        teachingStrategy: 'Use the Crime Scene Eyewitness vs News Reporter analogy.'
      },
      {
        name: 'Cause & Effect in History',
        description: 'Analyzing what triggered wars, migrations, revolutions, or cultural golden ages.',
        teachingStrategy: 'Use domino-effect causal chains.'
      },
      {
        name: 'Civics & Early Governments',
        description: 'Monarchy, Oligarchy, Direct Democracy (Athens), Republic (Rome).',
        teachingStrategy: 'Compare government types to different team decision-making rules in sports or gaming clans.'
      }
    ]
  }
};
