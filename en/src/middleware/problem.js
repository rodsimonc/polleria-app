// JSON block + REST API block: standardized errors with Problem Details (RFC 7807).
// All API error responses use this format and the content-type
// application/problem+json.

export class ProblemError extends Error {
  constructor({ status, title, detail, type = 'about:blank', extensions = {} }) {
    super(detail || title);
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.type = type;
    this.extensions = extensions;
  }
}

export function sendProblem(res, { status, title, detail, type = 'about:blank', instance, extensions = {} }) {
  res
    .status(status)
    .type('application/problem+json')
    .json({
      type,
      title,
      status,
      detail,
      instance,
      ...extensions,
    });
}

// Final error-handling middleware.
export function errorHandler(err, req, res, _next) {
  if (err instanceof ProblemError) {
    return sendProblem(res, {
      status: err.status,
      title: err.title,
      detail: err.detail,
      type: err.type,
      instance: req.originalUrl,
      extensions: err.extensions,
    });
  }

  // Fallback: uncontrolled error.
  console.error(err);
  return sendProblem(res, {
    status: 500,
    title: 'Internal Server Error',
    detail: 'An unexpected error occurred on the server.',
    instance: req.originalUrl,
  });
}

// Handler for routes that are not found.
export function notFoundHandler(req, res) {
  sendProblem(res, {
    status: 404,
    title: 'Not Found',
    detail: `The resource ${req.originalUrl} does not exist.`,
    instance: req.originalUrl,
  });
}
