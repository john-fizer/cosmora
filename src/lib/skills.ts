import fs from "fs";
import path from "path";

const SKILLS_DIR = path.join(process.cwd(), "skills");

export interface Skill {
  name: string;
  path: string;
  content: string;
}

// Load a single skill file
export function loadSkill(relativePath: string): Skill | null {
  const fullPath = path.join(SKILLS_DIR, relativePath);
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    const name = path.basename(relativePath, ".md");
    return { name, path: relativePath, content };
  } catch {
    return null;
  }
}

// Load all skills in a directory
export function loadSkillDir(dir: string): Skill[] {
  const dirPath = path.join(SKILLS_DIR, dir);
  try {
    return fs
      .readdirSync(dirPath)
      .filter(f => f.endsWith(".md"))
      .map(f => loadSkill(path.join(dir, f)))
      .filter(Boolean) as Skill[];
  } catch {
    return [];
  }
}

// Keyword → skill file mappings
const SKILL_ROUTES: Array<{ keywords: RegExp; skills: string[] }> = [
  {
    keywords: /rising|ascendant|asc|chart ruler|first house|appearance|identity/i,
    skills: ["natal/ascendant.md", "natal/sect.md"],
  },
  {
    keywords: /sect|day chart|night chart|luminary|benefic|malefic/i,
    skills: ["natal/sect.md"],
  },
  {
    keywords: /dignity|domicile|exaltation|detriment|fall|peregrine|strength|weak/i,
    skills: ["traditional/essential-dignity.md"],
  },
  {
    keywords: /house\s*\d|angular|succedent|cadent|placement|in the/i,
    skills: ["natal/planets-in-houses.md"],
  },
  {
    keywords: /profection|lord of the year|year|annual|activated house/i,
    skills: ["timing/annual-profections.md"],
  },
  {
    keywords: /transit|saturn transit|jupiter transit|pluto|uranus|neptune/i,
    skills: ["timing/transits.md"],
  },
  {
    keywords: /zodiacal releasing|lot of fortune|lot of spirit|releasing|loosing of the bond|LB/i,
    skills: ["timing/zodiacal-releasing.md", "money/lot-of-fortune.md"],
  },
  {
    keywords: /career|job|work|vocation|mc|midheaven|profession|calling|spirit/i,
    skills: ["career/lot-of-spirit.md"],
  },
  {
    keywords: /money|finance|income|wealth|resources|second house|eighth house|fortune|debt/i,
    skills: ["money/lot-of-fortune.md"],
  },
  {
    keywords: /relationship|partner|love|marriage|7th|synastry|venus|attraction|romance/i,
    skills: ["relationship/synastry.md"],
  },
  {
    keywords: /this year|current period|right now|timing|what.*happening|chapter|phase/i,
    skills: [
      "timing/annual-profections.md",
      "timing/transits.md",
    ],
  },
  {
    keywords: /natal chart|birth chart|overview|reading|full chart|whole chart|interpret/i,
    skills: [
      "natal/ascendant.md",
      "natal/sect.md",
      "natal/planets-in-houses.md",
      "traditional/essential-dignity.md",
    ],
  },
];

// Always include these core skills
const ALWAYS_LOAD = ["natal/sect.md", "traditional/essential-dignity.md"];

export function selectSkills(userMessage: string): Skill[] {
  const matched = new Set<string>(ALWAYS_LOAD);

  for (const route of SKILL_ROUTES) {
    if (route.keywords.test(userMessage)) {
      for (const s of route.skills) matched.add(s);
    }
  }

  // Cap at 5 skills to keep context focused
  const skillPaths = Array.from(matched).slice(0, 5);
  return skillPaths.map(p => loadSkill(p)).filter(Boolean) as Skill[];
}

export function formatSkillsForPrompt(skills: Skill[]): string {
  if (skills.length === 0) return "";
  return [
    "--- ASTROLOGY SKILL LIBRARY (follow these rules when interpreting) ---",
    ...skills.map(s => `### ${s.name.toUpperCase()}\n${s.content}`),
    "--- END SKILL LIBRARY ---",
  ].join("\n\n");
}
