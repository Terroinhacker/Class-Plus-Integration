export const globalErrorhandler = (error, req, resp, next) => {
    const status = error?.status ? error.status : "Failed"
    const message = error?.message;
    const stack = error?.stack;
    const statusCode = error?.statusCode ? error.statusCode : 500;
    console.log("Error catched in global Error handler")
    console.log({ status, message, stack })
    resp.status(statusCode).send({ status, message, stack });
};

export const notFound = (req, resp, next) => {
    const error = new Error(`Cannot find the route for ${req.originalUrl} at the server`);
    // Set the status code to 404
    error.statusCode = 404;
    next(error);
};
