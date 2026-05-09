import mongoose from "mongoose";

// Queries fail immediately when there's no active connection instead of queuing
mongoose.set("bufferCommands", false);

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL || "", {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    });
    console.log("Connected to Database");
  } catch (error) {
    console.error("Error connecting to Database:", error);
    throw error;
  }
};
