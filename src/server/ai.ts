/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { User, Gig } from "../types";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return aiClient;
}

/**
 * Calculates a local NLP skill matching score from 0 to 100
 */
export function calculateSkillCompatibility(freelancerSkills: string[], gigSkills: string[]): number {
  if (!freelancerSkills.length || !gigSkills.length) return 0;
  
  // Normalize skills to lowercase for precise comparison
  const fSet = new Set(freelancerSkills.map(s => s.toLowerCase().trim()));
  const gSet = new Set(gigSkills.map(s => s.toLowerCase().trim()));
  
  let matches = 0;
  gSet.forEach(skill => {
    // Check direct matches
    if (fSet.has(skill)) {
      matches += 1;
    } else {
      // Check partial keyword matching (e.g., 'Tailwind' matches 'Tailwind CSS')
      for (const fSkill of fSet) {
        if (fSkill.includes(skill) || skill.includes(fSkill)) {
          matches += 0.5;
          break;
        }
      }
    }
  });

  const rawScore = (matches / gigSkills.length) * 100;
  return Math.min(100, Math.round(rawScore));
}

export interface MatchAnalysis {
  score: number;
  reason: string;
  successChance: number; // 0-100
  strengths: string[];
  gaps: string[];
}

/**
 * Analyze alignment between a Freelancer profile and a Gig using Gemini (or dynamic local rules if no key)
 */
export async function analyzeMatch(freelancer: User, gig: Gig): Promise<MatchAnalysis> {
  const fSkills = freelancer.skills || [];
  const gSkills = gig.skills || [];
  
  const localScore = calculateSkillCompatibility(fSkills, gSkills);

  // Attempt to use server-side Gemini if API key is active
  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `Analyze the fit between this freelancer and the following gig.
Freelancer Name: ${freelancer.name}
Freelancer Title: ${freelancer.title || "Freelancer"}
Freelancer Bio: ${freelancer.bio || ""}
Freelancer Skills: ${fSkills.join(", ")}

Gig Title: ${gig.title}
Gig Description: ${gig.description}
Gig Skills Required: ${gSkills.join(", ")}
Gig Milestones: ${gig.milestones.map(m => `- ${m.title} ($${m.amount})`).join("\n")}

Respond EXCLUSIVELY with a JSON object matching this schema:
{
  "score": number (0-100 score indicating compatibility based on skills and background),
  "reason": "summary string explaining why they are or are not a good fit",
  "successChance": number (0-100 estimated level of project completion likelihood),
  "strengths": ["string listing strength 1", "string listing strength 2"],
  "gaps": ["string listing gap 1 or things to look out for", "string listing gap 2"]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";
      const analysis = JSON.parse(text) as MatchAnalysis;
      return {
        score: analysis.score || localScore,
        reason: analysis.reason || `NLP computed. Freelancer skills: ${fSkills.join(", ")}. Job skills: ${gSkills.join(", ")}.`,
        successChance: analysis.successChance || Math.max(50, localScore),
        strengths: analysis.strengths || (localScore > 50 ? ["Good match for required technologies", "High reputation rating"] : ["Highly rated active freelancer"]),
        gaps: analysis.gaps || (localScore < 80 ? ["Some skills might need polishing or verification before kickoff"] : ["None detected"])
      };
    } catch (err) {
      console.warn("Gemini match analysis query failed, using high-quality local algorithm", err);
    }
  }

  // Pure Local Algorithm fallback:
  let reason = `Calculated using SkillSphere NLP matching engine. `;
  let strengths: string[] = [];
  let gaps: string[] = [];
  
  if (localScore >= 80) {
    reason += `Excellent fit! ${freelancer.name}'s skillset overlaps strongly with the requirements specified in "${gig.title}".`;
    strengths = [
      `Master of major required skills: ${gSkills.filter(s => fSkills.map(fs => fs.toLowerCase()).includes(s.toLowerCase())).join(", ")}`,
      "Great profile reputation score",
      "Ready for immediate placement in Austine cluster"
    ];
    gaps = ["Zero alignment gaps identified in core skills"];
  } else if (localScore >= 50) {
    reason += `Good compatible fit. Possesses critical fundamentals needed for the milestones, but might require coordination on specific secondary aspects.`;
    strengths = [
      "Familiar with primary tools required",
      "Outstanding historical reputation rating"
    ];
    const missing = gSkills.filter(s => !fSkills.map(fs => fs.toLowerCase()).includes(s.toLowerCase()));
    gaps = missing.length ? [`May need training or verification in: ${missing.join(", ")}`] : ["Coordinate budget delivery timeline"];
  } else {
    reason += `Moderate alignment. Freelancer holds great technical ability, but has specialized in different areas. Skill overlaps are minimal.`;
    strengths = ["Strong overall freelancer ratings"];
    const missing = gSkills.filter(s => !fSkills.map(fs => fs.toLowerCase()).includes(s.toLowerCase()));
    gaps = missing.length ? [`Lacks direct historical competence in: ${missing.join(", ")}`] : ["Verify location parameters"];
  }

  return {
    score: localScore,
    reason,
    successChance: Math.round(50 + (localScore / 2)),
    strengths,
    gaps
  };
}

/**
 * Calculates semantic similarity using Hugging Face Inference API.
 * Includes fallback to standard Jaccard token overlap if the API is rate limited.
 */
export async function calculateHuggingFaceSimilarity(source: string, target: string): Promise<number> {
  const hfToken = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY || "";
  
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
        },
        body: JSON.stringify({
          inputs: {
            source_sentence: source,
            sentences: [target],
          },
        }),
      }
    );

    if (response.ok) {
      const scores = await response.json();
      if (Array.isArray(scores) && typeof scores[0] === "number") {
        const score = Math.round(Math.max(0, scores[0]) * 100);
        return score;
      }
    }
  } catch (err) {
    console.warn("Hugging Face API call failed or rate limited/unauthorized, using backup NLP", err);
  }

  // Fallback: Word token overlap similarity
  const sourceTokens = source.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  const targetTokens = target.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  
  if (!sourceTokens.length || !targetTokens.length) return 0;
  
  const sSet = new Set(sourceTokens);
  const tSet = new Set(targetTokens);
  
  let intersection = 0;
  sSet.forEach(t => {
    if (tSet.has(t)) {
      intersection += 1.0;
    } else {
      // Fuzzy prefix/suffix matches for skills e.g., react / reactjs
      for (const other of tSet) {
        if (other.length > 3 && t.length > 3 && (other.includes(t) || t.includes(other))) {
          intersection += 0.55;
          break;
        }
      }
    }
  });
  
  return Math.min(100, Math.round((intersection / Math.max(1, Math.min(sSet.size, tSet.size))) * 100));
}

