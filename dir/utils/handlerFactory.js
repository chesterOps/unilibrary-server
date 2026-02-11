"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAll = exports.updateOne = exports.findOne = exports.createOne = exports.deleteOne = void 0;
const catchAsync_1 = __importDefault(require("./catchAsync"));
const appError_1 = __importDefault(require("./appError"));
const apiFeatures_1 = __importDefault(require("./apiFeatures"));
const mongoose_1 = require("mongoose");
// Delete document
const deleteOne = (Model) => (0, catchAsync_1.default)(async (req, res, next) => {
    // Get model name
    const modelName = Model.modelName;
    // Get id
    const id = req.params.id;
    // Find and delete document
    const doc = await Model.findByIdAndDelete(id);
    // Return error if document doesnt exist
    if (!doc)
        return next(new appError_1.default(`No ${modelName.toLowerCase()} found with that name.`, 404));
    // Send response
    res.status(204).json({
        status: "success",
        data: null,
    });
});
exports.deleteOne = deleteOne;
// Create document
const createOne = (Model) => (0, catchAsync_1.default)(async (req, res, _next) => {
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
exports.createOne = createOne;
// Find document
const findOne = (Model, field) => (0, catchAsync_1.default)(async (req, res, next) => {
    // Get model name
    const modelName = Model.modelName;
    // Get id
    const id = req.params.id;
    let doc;
    // Find document
    if ((0, mongoose_1.isValidObjectId)(id)) {
        doc = await Model.findById(id);
    }
    else {
        if (field)
            doc = await Model.findOne({ [field]: id });
    }
    // Return error if document doesnt exist
    if (!doc)
        return next(new appError_1.default(`No ${modelName.toLowerCase()} found with that ID`, 404));
    // Send response
    res.status(200).json({
        status: "success",
        data: doc,
    });
});
exports.findOne = findOne;
// Update document
const updateOne = (Model) => (0, catchAsync_1.default)(async (req, res, next) => {
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
        return next(new appError_1.default(`No ${modelName} found with that ID`, 404));
    // Send response
    res.status(200).json({
        status: "success",
        message: `${modelName} updated successfully`,
        data: doc,
    });
});
exports.updateOne = updateOne;
// Find all documents
const findAll = (Model, searchField) => (0, catchAsync_1.default)(async (req, res, _next) => {
    // Construct query
    const features = new apiFeatures_1.default(Model, req.query, searchField)
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
exports.findAll = findAll;
