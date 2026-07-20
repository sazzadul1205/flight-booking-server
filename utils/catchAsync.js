// utils/catchAsync.js
const catchAsync = (controller) => (req, res, next) =>
  controller(req, res, next).catch(next);

module.exports = catchAsync;
