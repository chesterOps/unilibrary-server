import mongoose from "mongoose";

// Queries fail immediately when there's no active connection instead of queuing
mongoose.set("bufferCommands", false);

export const connectDB = async () => {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error(
      "MONGO_URL environment variable is not set. " +
      "Go to Render Dashboard → unilibrary-server → Environment and add MONGO_URL."
    );
  }

  try {
    await mongoose.connect(mongoUrl, {
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
