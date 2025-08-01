import { 
  users, projects, projectUpdates, projectComments, projectFaqs, projectBackers,
  type User, type InsertUser, type Project, type InsertProject,
  type ProjectUpdate, type InsertProjectUpdate,
  type ProjectComment, type InsertProjectComment,
  type ProjectFaq, type InsertProjectFaq,
  type ProjectBacker, type InsertProjectBacker
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Project operations
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(insertProject: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  
  // Project updates
  getProjectUpdates(projectId: string): Promise<ProjectUpdate[]>;
  createProjectUpdate(insertUpdate: InsertProjectUpdate): Promise<ProjectUpdate>;
  
  // Project comments
  getProjectComments(projectId: string): Promise<(ProjectComment & { user: User })[]>;
  createProjectComment(insertComment: InsertProjectComment): Promise<ProjectComment>;
  
  // Project FAQs
  getProjectFaqs(projectId: string): Promise<ProjectFaq[]>;
  createProjectFaq(insertFaq: InsertProjectFaq): Promise<ProjectFaq>;
  
  // Project backers
  getProjectBackers(projectId: string): Promise<(ProjectBacker & { user: User })[]>;
  createProjectBacker(insertBacker: InsertProjectBacker): Promise<ProjectBacker>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Project operations
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  // Project updates
  async getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
    return await db
      .select()
      .from(projectUpdates)
      .where(eq(projectUpdates.projectId, projectId))
      .orderBy(desc(projectUpdates.createdAt));
  }

  async createProjectUpdate(insertUpdate: InsertProjectUpdate): Promise<ProjectUpdate> {
    const [update] = await db
      .insert(projectUpdates)
      .values(insertUpdate)
      .returning();
    return update;
  }

  // Project comments
  async getProjectComments(projectId: string): Promise<(ProjectComment & { user: User })[]> {
    return await db
      .select({
        id: projectComments.id,
        projectId: projectComments.projectId,
        userId: projectComments.userId,
        content: projectComments.content,
        createdAt: projectComments.createdAt,
        user: users
      })
      .from(projectComments)
      .innerJoin(users, eq(projectComments.userId, users.id))
      .where(eq(projectComments.projectId, projectId))
      .orderBy(asc(projectComments.createdAt));
  }

  async createProjectComment(insertComment: InsertProjectComment): Promise<ProjectComment> {
    const [comment] = await db
      .insert(projectComments)
      .values(insertComment)
      .returning();
    return comment;
  }

  // Project FAQs
  async getProjectFaqs(projectId: string): Promise<ProjectFaq[]> {
    return await db
      .select()
      .from(projectFaqs)
      .where(eq(projectFaqs.projectId, projectId))
      .orderBy(asc(projectFaqs.createdAt));
  }

  async createProjectFaq(insertFaq: InsertProjectFaq): Promise<ProjectFaq> {
    const [faq] = await db
      .insert(projectFaqs)
      .values(insertFaq)
      .returning();
    return faq;
  }

  // Project backers
  async getProjectBackers(projectId: string): Promise<(ProjectBacker & { user: User })[]> {
    return await db
      .select({
        id: projectBackers.id,
        projectId: projectBackers.projectId,
        userId: projectBackers.userId,
        amount: projectBackers.amount,
        createdAt: projectBackers.createdAt,
        user: users
      })
      .from(projectBackers)
      .innerJoin(users, eq(projectBackers.userId, users.id))
      .where(eq(projectBackers.projectId, projectId))
      .orderBy(desc(projectBackers.createdAt));
  }

  async createProjectBacker(insertBacker: InsertProjectBacker): Promise<ProjectBacker> {
    const [backer] = await db
      .insert(projectBackers)
      .values(insertBacker)
      .returning();
    return backer;
  }
}

export const storage = new DatabaseStorage();
