import catchAsync from "./catchAsync";
import AppError from "./appError";
import ApiFeatures from "./apiFeatures";
import { isValidObjectId, Model } from "mongoose";

// Delete document
export const deleteOne = (Model: Model<any>) =>
  catchAsync(async (req, res, next) => {
    // Get model name
    const modelName = Model.modelName;

    // Get id
    const id = req.params.id;

    // Find and delete document
    const doc = await Model.findByIdAndDelete(id);

    // Return error if document doesnt exist
    if (!doc)
      return next(
        new AppError(`No ${modelName.toLowerCase()} found with that name.`, 404)
      );

    // Send response
    res.status(204).json({
      status: "success",
      data: null,
    });
  });

// Create document
export const createOne = (Model: Model<any>) =>
  catchAsync(async (req, res, _next) => {
    // Get model name
    const modelName = Model.modelName;

    // New document
    const newDoc = new Model(req.body);

    // Save document
    await newDoc.save();

    // Send response
    res.status(201).json({
      status: "success",
      message: `${modelName} created successfully`,
      data: newDoc,
    });
  });

// Find document
export const findOne = (Model: Model<any>, field?: string) =>
  catchAsync(async (req, res, next) => {
    // Get model name
    const modelName = Model.modelName;

    // Get id
    const id = req.params.id;

    let doc;

    // Find document
    if (isValidObjectId(id)) {
      doc = await Model.findById(id);
    } else {
      if (field) doc = await Model.findOne({ [field]: id });
    }

    // Return error if document doesnt exist
    if (!doc)
      return next(
        new AppError(`No ${modelName.toLowerCase()} found with that ID`, 404)
      );

    // Send response
    res.status(200).json({
      status: "success",
      data: doc,
    });
  });

// Update document
export const updateOne = (Model: Model<any>) =>
  catchAsync(async (req, res, next) => {
    // Get model name
    const modelName = Model.modelName;

    // Get id
    const id = req.params.id;

    // Fetch document
    const doc = await Model.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    // Check if document exists
    if (!doc)
      return next(new AppError(`No ${modelName} found with that ID`, 404));

    // Send response
    res.status(200).json({
      status: "success",
      message: `${modelName} updated successfully`,
      data: doc,
    });
  });

// Find all documents
export const findAll = (Model: Model<any>, searchField?: string) =>
  catchAsync(async (req, res, _next) => {
    // Construct query
    const features = new ApiFeatures(Model, req.query, searchField)
      .search()
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // Execute query
    const docs = await features.query;

    // Send response
    res.status(200).json({
      status: "success",
      length: docs.length,
      data: docs,
    });
  });
