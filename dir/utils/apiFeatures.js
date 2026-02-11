"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ApiFeatures {
    constructor(Model, queryString, searchField) {
        this.query = Model.find({});
        this.queryString = queryString;
        if (searchField)
            this.searchField = searchField;
    }
    search() {
        // Check for search query
        if (this.queryString.search && this.searchField) {
            const search = this.queryString.search;
            // Add Search to query
            this.query = this.query.find({
                [this.searchField]: { $regex: search, $options: "i" },
            });
        }
        return this;
    }
    filter() {
        // Clone the query parameters to avoid mutating the original object
        const queryObj = { ...this.queryString };
        // Fields that should not be used for filtering
        const excludedFields = ["page", "sort", "limit", "fields", "search"];
        // Remove excluded fields from the query object
        excludedFields.forEach((el) => delete queryObj[el]);
        // Convert operators (gte, gt, lt, lte) to MongoDB's $ syntax
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`);
        // Apply the filter to the query
        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }
    sort() {
        if (this.queryString.sort) {
            // Convert comma-separated sort fields to space-separated for Mongoose
            const sortBy = this.queryString.sort.split(",").join(" ");
            this.query = this.query.sort(sortBy);
        }
        else {
            // Default sort: newest first
            this.query = this.query.sort("-createdAt");
        }
        return this;
    }
    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(",").join(" ");
            this.query = this.query.select(fields);
        }
        else {
            // Exclude __v by default
            this.query = this.query.select("-__v");
        }
        return this;
    }
    paginate() {
        // Current page number
        const page = Number(this.queryString.page) || 1;
        // Items per page
        const limit = Number(this.queryString.limit) || 100;
        // How many results to skip
        const skip = (page - 1) * limit;
        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}
exports.default = ApiFeatures;
