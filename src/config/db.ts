import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URL || "", {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log("Connected to Database");
  } catch (error) {
    // Error
    console.error("Error connecting to Database:", error);
    throw error;
  }
};
