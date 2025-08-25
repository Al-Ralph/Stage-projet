// recommendation-service/src/analyzers/KnowledgeGraphAnalyzer.ts
import { PrismaClient } from '@prisma/client';
import * as neo4j from 'neo4j-driver';
import { Redis } from 'ioredis';

interface SkillNode {
  id: string;
  name: string;
  category: string;
  level: number;
}

interface CourseNode {
  id: string;
  title: string;
  skills: string[];
  prerequisites: string[];
  difficulty: number;
}

interface LearningPath {
  nodes: CourseNode[];
  totalDuration: number;
  skillsCovered: string[];
  difficultyProgression: number[];
}

export class KnowledgeGraphAnalyzer {
  private prisma: PrismaClient;
  private neo4jDriver: neo4j.Driver;
  private redis: Redis;

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    
    // Neo4j connection for graph operations
    this.neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      )
    );
  }

  async buildKnowledgeGraph(): Promise<void> {
    const session = this.neo4jDriver.session();

    try {
      // Clear existing graph
      await session.run('MATCH (n) DETACH DELETE n');

      // Load skills
      const skills = await this.prisma.skill.findMany();
      for (const skill of skills) {
        await session.run(
          'CREATE (s:Skill {id: $id, name: $name, category: $category, level: $level})',
          skill
        );
      }

      // Load courses
      const courses = await this.prisma.course.findMany({
        include: {
          skills: { include: { skill: true } },
          prerequisites: { include: { prerequisite: true } }
        }
      });

      for (const course of courses) {
        // Create course node
        await session.run(
          'CREATE (c:Course {id: $id, title: $title, category: $category, duration: $duration, difficulty: $difficulty})',
          {
            id: course.id,
            title: course.title,
            category: course.category,
            duration: course.duration,
            difficulty: this.difficultyToNumber(course.level)
          }
        );

        // Create relationships to skills
        for (const courseSkill of course.skills) {
          await session.run(
            'MATCH (c:Course {id: $courseId}), (s:Skill {id: $skillId}) ' +
            'CREATE (c)-[:TEACHES {level: $level}]->(s)',
            {
              courseId: course.id,
              skillId: courseSkill.skillId,
              level: courseSkill.level || 1
            }
          );
        }

        // Create prerequisite relationships
        for (const prereq of course.prerequisites) {
          await session.run(
            'MATCH (c1:Course {id: $courseId}), (c2:Course {id: $prereqId}) ' +
            'CREATE (c1)-[:REQUIRES]->(c2)',
            {
              courseId: course.id,
              prereqId: prereq.prerequisiteId
            }
          );
        }
      }

      // Create skill relationships (hierarchical)
      await this.createSkillHierarchy(session);

      console.log('Knowledge graph built successfully');
    } finally {
      await session.close();
    }
  }

  async recommendNextCourses(userId: string, limit: number): Promise<any[]> {
    const session = this.neo4jDriver.session();

    try {
      // Get user's completed courses and current skills
      const userProgress = await this.getUserProgress(userId);
      
      // Find optimal next courses using graph algorithms
      const result = await session.run(
        `
        // Get user's current skills
        MATCH (completed:Course)
        WHERE completed.id IN $completedCourseIds
        WITH collect(completed) as completedCourses
        
        // Find skills learned
        MATCH (completed)-[:TEACHES]->(skill:Skill)
        WHERE completed IN completedCourses
        WITH completedCourses, collect(DISTINCT skill) as learnedSkills
        
        // Find next courses that:
        // 1. Have prerequisites satisfied
        // 2. Teach new skills or advance existing ones
        // 3. Match difficulty progression
        MATCH (next:Course)
        WHERE NOT next.id IN $completedCourseIds
        AND ALL(prereq IN [(next)-[:REQUIRES]->(p:Course) | p] WHERE prereq IN completedCourses OR size([(next)-[:REQUIRES]->(p:Course) | p]) = 0)
        
        // Calculate relevance score
        WITH next, learnedSkills,
             size([(next)-[:TEACHES]->(s:Skill) WHERE s IN learnedSkills | s]) as skillOverlap,
             size([(next)-[:TEACHES]->(s:Skill) WHERE NOT s IN learnedSkills | s]) as newSkills,
             abs(next.difficulty - $currentLevel) as difficultyGap
        
        // Score based on skill progression and difficulty match
        WITH next, 
             (skillOverlap * 0.3 + newSkills * 0.5) as skillScore,
             CASE 
               WHEN difficultyGap = 0 THEN 1.0
               WHEN difficultyGap = 1 THEN 0.8
               WHEN difficultyGap = 2 THEN 0.5
               ELSE 0.2
             END as difficultyScore
        
        RETURN next, (skillScore * difficultyScore) as score
        ORDER BY score DESC
        LIMIT $limit
        `,
        {
          completedCourseIds: userProgress.completedCourseIds,
          currentLevel: userProgress.currentLevel,
          limit: limit
        }
      );

      const recommendations = result.records.map(record => ({
        ...record.get('next').properties,
        score: record.get('score'),
        reason: 'knowledge-progression'
      }));

      // Enhance with learning paths
      const enhancedRecommendations = await Promise.all(
        recommendations.map(async (rec) => {
          const learningPath = await this.generateLearningPath(
            userId,
            rec.id,
            userProgress
          );
          
          return {
            ...rec,
            learningPath: learningPath,
            estimatedCompletion: this.estimateCompletionTime(learningPath)
          };
        })
      );

      return enhancedRecommendations;
    } finally {
      await session.close();
    }
  }

  async generateLearningPath(
    userId: string,
    targetCourseId: string,
    userProgress: any
  ): Promise<LearningPath> {
    const session = this.neo4jDriver.session();

    try {
      // Find shortest path from user's current position to target course
      const result = await session.run(
        `
        MATCH (target:Course {id: $targetCourseId})
        
        // Get prerequisites path
        MATCH path = (target)-[:REQUIRES*0..5]->(prereq:Course)
        WHERE NOT prereq.id IN $completedCourseIds
        
        // Return all courses in learning path
        WITH target, collect(DISTINCT prereq) as prerequisites
        RETURN target, prerequisites
        `,
        {
          targetCourseId,
          completedCourseIds: userProgress.completedCourseIds
        }
      );

      if (result.records.length === 0) {
        return { nodes: [], totalDuration: 0, skillsCovered: [], difficultyProgression: [] };
      }

      const record = result.records[0];
      const target = record.get('target').properties;
      const prerequisites = record.get('prerequisites').map(p => p.properties);

      // Order prerequisites by difficulty
      const orderedPath = this.orderCoursesByDifficulty([...prerequisites, target]);

      // Get skills covered
      const skillsCovered = await this.getSkillsForCourses(
        orderedPath.map(c => c.id)
      );

      return {
        nodes: orderedPath,
        totalDuration: orderedPath.reduce((sum, c) => sum + c.duration, 0),
        skillsCovered: Array.from(new Set(skillsCovered)),
        difficultyProgression: orderedPath.map(c => c.difficulty)
      };
    } finally {
      await session.close();
    }
  }

  async findSkillGaps(userId: string): Promise<any> {
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true }
    });

    const session = this.neo4jDriver.session();

    try {
      // Find related skills user doesn't have
      const result = await session.run(
        `
        MATCH (userSkill:Skill)
        WHERE userSkill.id IN $userSkillIds
        
        // Find related skills through courses
        MATCH (userSkill)<-[:TEACHES]-(course:Course)-[:TEACHES]->(relatedSkill:Skill)
        WHERE NOT relatedSkill.id IN $userSkillIds
        
        // Find skill hierarchies
        OPTIONAL MATCH (relatedSkill)-[:BUILDS_ON]->(prerequisite:Skill)
        
        WITH relatedSkill, 
             count(DISTINCT course) as courseCount,
             collect(DISTINCT prerequisite) as prerequisites
        
        RETURN relatedSkill, courseCount, prerequisites
        ORDER BY courseCount DESC
        `,
        {
          userSkillIds: userSkills.map(us => us.skillId)
        }
      );

      const gaps = result.records.map(record => {
        const skill = record.get('relatedSkill').properties;
        const prerequisites = record.get('prerequisites').map(p => p.properties);
        
        return {
          skill,
          importance: record.get('courseCount'),
          prerequisites,
          userHasPrerequisites: prerequisites.every(p => 
            userSkills.some(us => us.skillId === p.id)
          )
        };
      });

      return {
        identifiedGaps: gaps.filter(g => g.userHasPrerequisites),
        futureGaps: gaps.filter(g => !g.userHasPrerequisites),
        recommendations: await this.getCoursesForSkillGaps(
          gaps.slice(0, 5).map(g => g.skill.id)
        )
      };
    } finally {
      await session.close();
    }
  }

  async analyzeCareerPath(userId: string, targetRole: string): Promise<any> {
    // Analyze required skills for target role
    const roleSkills = await this.getRoleSkills(targetRole);
    const userSkills = await this.getUserSkills(userId);

    const session = this.neo4jDriver.session();

    try {
      // Find optimal path to acquire missing skills
      const result = await session.run(
        `
        // Missing skills
        MATCH (targetSkill:Skill)
        WHERE targetSkill.id IN $missingSkillIds
        
        // Find courses that teach these skills
        MATCH (course:Course)-[:TEACHES]->(targetSkill)
        
        // Check prerequisites
        OPTIONAL MATCH (course)-[:REQUIRES]->(prereq:Course)
        
        WITH course, 
             collect(DISTINCT targetSkill) as skillsTaught,
             collect(DISTINCT prereq) as prerequisites
        
        // Calculate efficiency (skills per course)
        WITH course, skillsTaught, prerequisites,
             size(skillsTaught) as skillCount,
             size([p IN prerequisites WHERE p.id IN $completedCourseIds]) as satisfiedPrereqs,
             size(prerequisites) as totalPrereqs
        
        WHERE totalPrereqs = 0 OR satisfiedPrereqs = totalPrereqs
        
        RETURN course, skillsTaught, skillCount
        ORDER BY skillCount DESC
        `,
        {
          missingSkillIds: roleSkills.filter(rs => 
            !userSkills.some(us => us.skillId === rs.id)
          ).map(s => s.id),
          completedCourseIds: await this.getUserCompletedCourses(userId)
        }
      );

      const pathCourses = result.records.map(record => ({
        course: record.get('course').properties,
        skillsTaught: record.get('skillsTaught').map(s => s.properties),
        efficiency: record.get('skillCount')
      }));

      // Generate optimal learning sequence
      const optimalPath = this.optimizeLearningSequence(pathCourses, roleSkills);

      return {
        targetRole,
        currentSkills: userSkills.length,
        requiredSkills: roleSkills.length,
        skillGap: roleSkills.length - userSkills.length,
        estimatedDuration: optimalPath.reduce((sum, p) => sum + p.course.duration, 0),
        learningPath: optimalPath,
        milestones: this.generateMilestones(optimalPath, roleSkills)
      };
    } finally {
      await session.close();
    }
  }

  // Helper methods
  private async createSkillHierarchy(session: neo4j.Session): Promise<void> {
    // Create skill relationships based on complexity and prerequisites
    const skillHierarchy = [
      { from: 'javascript-advanced', to: 'javascript-basics' },
      { from: 'react', to: 'javascript-basics' },
      { from: 'nodejs', to: 'javascript-basics' },
      { from: 'typescript', to: 'javascript-advanced' },
      { from: 'nextjs', to: 'react' },
      // Add more relationships as needed
    ];

    for (const relation of skillHierarchy) {
      await session.run(
        `
        MATCH (s1:Skill {name: $from}), (s2:Skill {name: $to})
        CREATE (s1)-[:BUILDS_ON]->(s2)
        `,
        relation
      );
    }
  }

  private async getUserProgress(userId: string): Promise<any> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, completedAt: { not: null } },
      include: { course: true }
    });

    const userProfile = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    return {
      completedCourseIds: enrollments.map(e => e.courseId),
      currentLevel: userProfile?.profile?.level || 1,
      completedCourses: enrollments.map(e => e.course)
    };
  }

  private async getSkillsForCourses(courseIds: string[]): Promise<string[]> {
    const courseSkills = await this.prisma.courseSkill.findMany({
      where: { courseId: { in: courseIds } },
      include: { skill: true }
    });

    return courseSkills.map(cs => cs.skill.name);
  }

  private orderCoursesByDifficulty(courses: any[]): any[] {
    return courses.sort((a, b) => a.difficulty - b.difficulty);
  }

  private difficultyToNumber(level: string): number {
    const mapping = {
      'BEGINNER': 1,
      'INTERMEDIATE': 2,
      'ADVANCED': 3,
      'EXPERT': 4
    };
    return mapping[level] || 2;
  }

  private estimateCompletionTime(learningPath: LearningPath): Date {
    const totalHours = learningPath.totalDuration / 60;
    const hoursPerDay = 2; // Assume 2 hours of study per day
    const daysNeeded = Math.ceil(totalHours / hoursPerDay);
    
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysNeeded);
    
    return completionDate;
  }

  private async getUserSkills(userId: string): Promise<any[]> {
    return await this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true }
    });
  }

  private async getRoleSkills(role: string): Promise<any[]> {
    // This would typically come from a role-skills mapping table
    const roleSkillMapping = {
      'frontend-developer': ['html', 'css', 'javascript', 'react', 'typescript'],
      'backend-developer': ['nodejs', 'databases', 'api-design', 'microservices'],
      'fullstack-developer': ['html', 'css', 'javascript', 'react', 'nodejs', 'databases'],
      'data-scientist': ['python', 'statistics', 'machine-learning', 'data-analysis'],
      // Add more roles
    };

    const skillNames = roleSkillMapping[role] || [];
    
    return await this.prisma.skill.findMany({
      where: { name: { in: skillNames } }
    });
  }

  private async getUserCompletedCourses(userId: string): Promise<string[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, completedAt: { not: null } },
      select: { courseId: true }
    });

    return enrollments.map(e => e.courseId);
  }

  private async getCoursesForSkillGaps(skillIds: string[]): Promise<any[]> {
    return await this.prisma.course.findMany({
      where: {
        skills: {
          some: {
            skillId: { in: skillIds }
          }
        },
        isPublished: true
      },
      include: {
        skills: {
          include: { skill: true }
        }
      },
      take: 10
    });
  }

  private optimizeLearningSequence(
    pathCourses: any[],
    targetSkills: any[]
  ): any[] {
    // Greedy algorithm to minimize total courses while covering all skills
    const remainingSkills = new Set(targetSkills.map(s => s.id));
    const selectedCourses = [];

    while (remainingSkills.size > 0) {
      // Find course that covers most remaining skills
      let bestCourse = null;
      let maxCoverage = 0;

      for (const pc of pathCourses) {
        const coverage = pc.skillsTaught.filter(s => 
          remainingSkills.has(s.id)
        ).length;

        if (coverage > maxCoverage) {
          maxCoverage = coverage;
          bestCourse = pc;
        }
      }

      if (!bestCourse) break;

      selectedCourses.push(bestCourse);
      bestCourse.skillsTaught.forEach(s => remainingSkills.delete(s.id));
      pathCourses = pathCourses.filter(pc => pc !== bestCourse);
    }

    return selectedCourses;
  }

  private generateMilestones(path: any[], targetSkills: any[]): any[] {
    const milestones = [];
    const totalSkills = targetSkills.length;
    let acquiredSkills = 0;

    for (let i = 0; i < path.length; i++) {
      acquiredSkills += path[i].skillsTaught.length;
      const progress = (acquiredSkills / totalSkills) * 100;

      if (progress >= 25 && milestones.length === 0) {
        milestones.push({
          name: 'Foundation Complete',
          afterCourse: i + 1,
          progress: 25
        });
      } else if (progress >= 50 && milestones.length === 1) {
        milestones.push({
          name: 'Intermediate Level',
          afterCourse: i + 1,
          progress: 50
        });
      } else if (progress >= 75 && milestones.length === 2) {
        milestones.push({
          name: 'Advanced Practitioner',
          afterCourse: i + 1,
          progress: 75
        });
      }
    }

    milestones.push({
      name: 'Career Ready',
      afterCourse: path.length,
      progress: 100
    });

    return milestones;
  }

  async close(): Promise<void> {
    await this.neo4jDriver.close();
    await this.prisma.$disconnect();
  }
}