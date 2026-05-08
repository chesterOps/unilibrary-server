import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import User from "../models/user.model";
import Material from "../models/material.model";
import SearchLog from "../models/searchLog.model";
import ViewHistory from "../models/viewHistory.model";

const DEFAULT_PASSWORD = "Password123!";

type SeedUser = {
  name: string;
  email: string;
  role: "student" | "lecturer" | "admin";
  department: string;
  level?: 100 | 200 | 300 | 400 | 500;
  approved: boolean;
  createdAt: string;
  courses: string[];
};

type SeedMaterial = {
  legacyId?: string;
  title: string;
  courseCode: string;
  department: string;
  type: string;
  level: number;
  uploaderEmail: string;
  academicSession: string;
  tags: string[];
  description: string;
  approved: boolean;
  downloadCount: number;
  createdAt: string;
  fileName: string;
};

const users: SeedUser[] = [
  {
    name: "Faculty Archive",
    email: "archive@uni.edu",
    role: "admin",
    department: "General Studies",
    approved: true,
    createdAt: "2026-01-01T09:00:00.000Z",
    courses: ["GST 102", "GST 101"],
  },
  {
    name: "Alice Johnson",
    email: "alice@uni.edu",
    role: "student",
    department: "Computer Science",
    level: 300,
    approved: true,
    createdAt: "2026-01-10T09:00:00.000Z",
    courses: ["CSC 301", "CSC 302", "CSC 401"],
  },
  {
    name: "Dr. Ibrahim Musa",
    email: "ibrahim@uni.edu",
    role: "lecturer",
    department: "Computer Science",
    approved: true,
    createdAt: "2026-01-05T09:00:00.000Z",
    courses: ["CSC 302", "CSC 401"],
  },
  {
    name: "Bob Smith",
    email: "bob@uni.edu",
    role: "student",
    department: "Economics",
    level: 200,
    approved: false,
    createdAt: "2026-02-14T09:00:00.000Z",
    courses: ["ECO 201", "ECO 202"],
  },
  {
    name: "Amina Yusuf",
    email: "amina@uni.edu",
    role: "student",
    department: "Mathematics",
    level: 400,
    approved: true,
    createdAt: "2026-02-20T09:00:00.000Z",
    courses: ["MTH 201", "MTH 401"],
  },
  {
    name: "Dr. Grace Obi",
    email: "grace@uni.edu",
    role: "lecturer",
    department: "Physics",
    approved: false,
    createdAt: "2026-03-01T09:00:00.000Z",
    courses: ["PHY 201", "PHY 301"],
  },
];

const materials: SeedMaterial[] = [
  {
    legacyId: "doc-1",
    title: "CSC 401 Machine Learning Lecture Notes",
    courseCode: "CSC 401",
    department: "Computer Science",
    type: "Lecture Note",
    level: 400,
    uploaderEmail: "ibrahim@uni.edu",
    academicSession: "2025",
    tags: ["machine learning", "ai", "lecture notes"],
    description:
      "Week-by-week lecture notes covering supervised learning, model evaluation, and neural networks.",
    approved: true,
    downloadCount: 234,
    createdAt: "2026-01-12T09:00:00.000Z",
    fileName: "csc-401-machine-learning-lecture-notes.pdf",
  },
  {
    legacyId: "doc-2",
    title: "GST 102 Past Questions and Answers",
    courseCode: "GST 102",
    department: "General Studies",
    type: "Past Question",
    level: 100,
    uploaderEmail: "archive@uni.edu",
    academicSession: "2024",
    tags: ["past question", "gst", "revision"],
    description:
      "Curated past questions for first-year students preparing for general studies examinations.",
    approved: true,
    downloadCount: 187,
    createdAt: "2026-02-02T09:00:00.000Z",
    fileName: "gst-102-past-questions-and-answers.pdf",
  },
  {
    legacyId: "doc-3",
    title: "MTH 201 Linear Algebra Revision Pack",
    courseCode: "MTH 201",
    department: "Mathematics",
    type: "Study Guide",
    level: 200,
    uploaderEmail: "amina@uni.edu",
    academicSession: "2025",
    tags: ["linear algebra", "mathematics", "revision"],
    description:
      "Student-friendly summary sheets with worked examples on matrices, eigenvalues, and vector spaces.",
    approved: true,
    downloadCount: 156,
    createdAt: "2026-02-18T09:00:00.000Z",
    fileName: "mth-201-linear-algebra-revision-pack.pdf",
  },
  {
    title: "CSC 302 Operating Systems Revision Notes",
    courseCode: "CSC 302",
    department: "Computer Science",
    type: "Revision Note",
    level: 300,
    uploaderEmail: "ibrahim@uni.edu",
    academicSession: "2025",
    tags: ["operating systems", "revision", "csc"],
    description: "Revision notes covering processes, memory management, and file systems.",
    approved: false,
    downloadCount: 0,
    createdAt: "2026-04-02T09:00:00.000Z",
    fileName: "csc-302-operating-systems-revision-notes.pdf",
  },
  {
    title: "PHY 201 Electromagnetism Practical Guide",
    courseCode: "PHY 201",
    department: "Physics",
    type: "Practical Guide",
    level: 200,
    uploaderEmail: "grace@uni.edu",
    academicSession: "2025",
    tags: ["physics", "electromagnetism", "practical"],
    description: "Practical guide for electromagnetism lab work and measurement techniques.",
    approved: false,
    downloadCount: 0,
    createdAt: "2026-04-04T09:00:00.000Z",
    fileName: "phy-201-electromagnetism-practical-guide.pdf",
  },
];

async function upsertUser(user: SeedUser, hashedPassword: string) {
  const doc = await User.findOneAndUpdate(
    { email: user.email },
    {
      $set: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        department: user.department,
        level: user.level,
        approved: user.approved,
        courses: user.courses,
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).select("+password");

  if (!doc) {
    throw new Error(`Failed to upsert user ${user.email}`);
  }

  await User.collection.updateOne(
    { _id: doc._id as mongoose.Types.ObjectId },
    {
      $set: {
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.createdAt),
      },
    },
  );

  return doc;
}

async function upsertMaterial(material: SeedMaterial, uploaderId: mongoose.Types.ObjectId) {
  const identifier = material.legacyId
    ? { legacyId: material.legacyId }
    : { title: material.title, courseCode: material.courseCode };

  const doc = await Material.findOneAndUpdate(
    identifier,
    {
      $set: {
        legacyId: material.legacyId,
        title: material.title,
        courseCode: material.courseCode,
        department: material.department,
        type: material.type,
        description: material.description,
        level: material.level,
        academicSession: material.academicSession,
        fileUrl: `https://example.com/materials/${material.fileName}`,
        fileName: material.fileName,
        fileType: "pdf",
        uploadedBy: uploaderId,
        tags: material.tags,
        approved: material.approved,
        downloadCount: material.downloadCount,
        viewCount: Math.max(0, Math.floor(material.downloadCount / 3)),
        embedding: [],
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  if (!doc) {
    throw new Error(`Failed to upsert material ${material.title}`);
  }

  await Material.collection.updateOne(
    { _id: doc._id as mongoose.Types.ObjectId },
    {
      $set: {
        createdAt: new Date(material.createdAt),
        updatedAt: new Date(material.createdAt),
      },
    },
  );

  return doc;
}

async function seedViewHistory(userMap: Map<string, any>, materialMap: Map<string, any>) {
  await ViewHistory.deleteMany({
    userId: { $in: [userMap.get("alice@uni.edu")._id, userMap.get("amina@uni.edu")._id] },
  });

  await ViewHistory.insertMany([
    {
      userId: userMap.get("alice@uni.edu")._id,
      materialId: materialMap.get("doc-1")._id,
      viewedAt: new Date("2026-05-07T11:00:00.000Z"),
    },
    {
      userId: userMap.get("alice@uni.edu")._id,
      materialId: materialMap.get("doc-2")._id,
      viewedAt: new Date("2026-05-06T11:00:00.000Z"),
    },
    {
      userId: userMap.get("amina@uni.edu")._id,
      materialId: materialMap.get("doc-3")._id,
      viewedAt: new Date("2026-05-08T08:30:00.000Z"),
    },
  ]);
}

async function seedSearchLogs(userMap: Map<string, any>) {
  await SearchLog.deleteMany({
    query: {
      $in: [
        "machine learning",
        "gst",
        "past question",
        "linear algebra",
        "csc",
        "operating systems",
      ],
    },
  });

  await SearchLog.insertMany([
    {
      userId: userMap.get("alice@uni.edu")._id,
      query: "machine learning",
      resultsReturned: 1,
      createdAt: new Date("2026-05-08T08:00:00.000Z"),
      updatedAt: new Date("2026-05-08T08:00:00.000Z"),
    },
    {
      userId: userMap.get("alice@uni.edu")._id,
      query: "csc",
      resultsReturned: 2,
      createdAt: new Date("2026-05-08T09:00:00.000Z"),
      updatedAt: new Date("2026-05-08T09:00:00.000Z"),
    },
    {
      userId: userMap.get("amina@uni.edu")._id,
      query: "linear algebra",
      resultsReturned: 1,
      createdAt: new Date("2026-05-07T10:00:00.000Z"),
      updatedAt: new Date("2026-05-07T10:00:00.000Z"),
    },
    {
      userId: userMap.get("archive@uni.edu")._id,
      query: "gst",
      resultsReturned: 1,
      createdAt: new Date("2026-05-06T12:00:00.000Z"),
      updatedAt: new Date("2026-05-06T12:00:00.000Z"),
    },
    {
      userId: userMap.get("archive@uni.edu")._id,
      query: "past question",
      resultsReturned: 1,
      createdAt: new Date("2026-05-05T12:00:00.000Z"),
      updatedAt: new Date("2026-05-05T12:00:00.000Z"),
    },
    {
      userId: userMap.get("ibrahim@uni.edu")._id,
      query: "operating systems",
      resultsReturned: 1,
      createdAt: new Date("2026-05-04T15:00:00.000Z"),
      updatedAt: new Date("2026-05-04T15:00:00.000Z"),
    },
  ]);
}

async function main() {
  await connectDB();

  const shouldReset = process.argv.includes("--reset");
  if (shouldReset) {
    console.log("Resetting seeded collections...");
    await Promise.all([
      SearchLog.deleteMany({}),
      ViewHistory.deleteMany({}),
      Material.deleteMany({}),
      User.deleteMany({ email: { $in: users.map((user) => user.email) } }),
    ]);
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  const userMap = new Map<string, any>();

  for (const user of users) {
    const doc = await upsertUser(user, hashedPassword);
    userMap.set(user.email, doc);
  }

  const materialMap = new Map<string, any>();
  for (const material of materials) {
    const uploader = userMap.get(material.uploaderEmail);
    const doc = await upsertMaterial(material, uploader._id);
    if (material.legacyId) materialMap.set(material.legacyId, doc);
  }

  await seedViewHistory(userMap, materialMap);
  await seedSearchLogs(userMap);

  console.log("Seed completed successfully.");
  console.log(`Default password for seeded users: ${DEFAULT_PASSWORD}`);
  console.log("Admin login: archive@uni.edu");
  console.log("Approved student login: alice@uni.edu");
  console.log("Pending student login: bob@uni.edu");
  console.log("Lecturer login: ibrahim@uni.edu");
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
