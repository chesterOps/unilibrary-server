"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = catchAsync;
function catchAsync(fn) {
    return (req, res, next) => {
        // Call the async function and catch any errors
        fn(req, res, next).catch(next); // Forward error to Express error handler
    };
}
