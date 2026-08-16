import { ZodError } from "zod";

// ----------------------------------------------------------------------
// Memora Backend -- validate.middleware
// Generic Zod-backed request validator. Usage in a route file:
//
//   import { validate } from "../middleware/validate.middleware.js";
//   import { loginSchema } from "../validators/auth.validator.js";
//   router.post("/login", validate(loginSchema), authController.login);
//
// On success, req.body/query/params is REPLACED with the parsed output
// -- meaning defaults and type coercion (e.g. "20" -> 20 for a numeric
// query param) from the schema actually take effect downstream, not
// just get validated and discarded. On failure, throws a ZodError which
// errorHandler.middleware.js already knows how to format into a 400
// with per-field messages -- this file doesn't format errors itself.
// ----------------------------------------------------------------------

/**
 * @param {import('zod').ZodSchema} schema
 * @param {"body" | "query" | "params"} [source="body"]
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(err); // errorHandler.middleware.js formats ZodError specifically
      }
      next(err);
    }
  };
}

/**
 * Validates multiple parts of the request at once, e.g. both params and
 * body on a PATCH /commitments/:id route. Each schema is optional --
 * only the parts you pass a schema for are checked/replaced.
 *
 * @param {{ body?: import('zod').ZodSchema, query?: import('zod').ZodSchema, params?: import('zod').ZodSchema }} schemas
 */
export function validateRequest(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export default { validate, validateRequest };