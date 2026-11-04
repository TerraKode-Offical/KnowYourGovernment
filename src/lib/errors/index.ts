// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Error Class Hierarchy
//
// Production-grade error handling for KnowYourGov.
// Every user-facing message is manually written.
// NO raw third-party error messages ever reach the client.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export { getFallbackMessage } from "./fallback-messages";

export interface ErrorContext {
  [key: string]: unknown;
}

export interface ErrorJSON {
  success: false;
  message: string;
  code: string;
  context?: ErrorContext;
}

export interface LogObject {
  level: "error" | "warn";
  timestamp: string;
  requestId: string;
  route: string;
  statusCode: number;
  publicCode: string;
  userMessage: string;
  errorClass: string;
  originalMessage: string;
  stack?: string;
  safeContext?: ErrorContext;
  sensitiveContext?: Record<string, unknown>;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AppError â€” Abstract Base Class
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly publicCode: string;
  readonly userMessage: string;
  readonly context?: ErrorContext;
  readonly isOperational: boolean;
  readonly requestId?: string;

  constructor(
    userMessage: string,
    options?: {
      context?: ErrorContext;
      isOperational?: boolean;
      requestId?: string;
      cause?: Error;
    }
  ) {
    super(userMessage);
    this.name = this.constructor.name;
    this.userMessage = userMessage;
    this.context = options?.context;
    // isOperational defaults to true for <500 unless explicitly overridden.
    // Subclasses set statusCode, so we can't read it here; they pass
    // isOperational explicitly when needed.
    this.isOperational = options?.isOperational ?? true;
    this.requestId = options?.requestId;

    // Preserve cause manually since ES2017 target doesn't support Error(cause)
    if (options?.cause) {
      (this as Error & { cause?: Error }).cause = options.cause;
    }

    // Ensure prototype chain is correct for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Safe JSON for CLIENT responses.
   * NEVER includes stack traces, internal details, or raw error messages.
   */
  toJSON(): ErrorJSON {
    const result: ErrorJSON = {
      success: false,
      message: this.userMessage,
      code: this.publicCode,
    };
    if (this.context && Object.keys(this.context).length > 0) {
      result.context = this.context;
    }
    return result;
  }

  /**
   * FULL internal details for SERVER-SIDE logging only.
   * Contains stack traces, original messages, and sensitive metadata.
   * This NEVER leaves the server.
   */
  toLogObject(route: string, requestId: string): LogObject {
    return {
      level: this.statusCode >= 500 ? "error" : "warn",
      timestamp: new Date().toISOString(),
      requestId,
      route,
      statusCode: this.statusCode,
      publicCode: this.publicCode,
      userMessage: this.userMessage,
      errorClass: this.name,
      originalMessage: this.message,
      stack: this.stack,
      safeContext: this.context,
    };
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Domain-Specific Error Classes
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly publicCode = "NOT_FOUND";

  constructor(
    message = "Sorry, but we can't find that anywhere on this site.",
    options?: {
      context?: ErrorContext;
      requestId?: string;
    }
  ) {
    super(message, { ...options, isOperational: true });
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly publicCode = "INVALID_REQUEST";

  constructor(
    message = "The request could not be processed. Please check your input and try again.",
    options?: {
      context?: ErrorContext;
      requestId?: string;
    }
  ) {
    super(message, { ...options, isOperational: true });
  }
}

export class ExternalAPIError extends AppError {
  readonly statusCode = 502;
  readonly publicCode = "DATA_SOURCE_UNAVAILABLE";

  constructor(
    message = "We're having trouble connecting to our data source. Please try again later.",
    options?: {
      context?: ErrorContext;
      requestId?: string;
    }
  ) {
    super(message, { ...options, isOperational: true });
  }
}

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly publicCode = "RATE_LIMIT_EXCEEDED";

  constructor(
    message = "Too many requests. Please slow down.",
    options?: {
      context?: ErrorContext;
      requestId?: string;
      retryAfter?: number;
    }
  ) {
    super(message, {
      ...options,
      context: {
        ...options?.context,
        ...(options?.retryAfter ? { retryAfter: options.retryAfter } : {}),
      },
      isOperational: true,
    });
  }
}

export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly publicCode = "DATABASE_ERROR";

  constructor(
    message = "We're experiencing a technical issue. Please try again later.",
    options?: {
      context?: ErrorContext;
      requestId?: string;
    }
  ) {
    super(message, { ...options, isOperational: false });
  }
}

export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly publicCode = "UNAUTHORIZED";

  constructor(
    message = "Sorry, but you aren't authorized to be here.",
    options?: {
      context?: ErrorContext;
      requestId?: string;
    }
  ) {
    super(message, { ...options, isOperational: true });
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly publicCode = "FORBIDDEN";

  constructor(
    message = "Sorry, but that action isn't allowed.",
    options?: {
      context?: ErrorContext;
      requestId?: string;
    }
  ) {
    super(message, { ...options, isOperational: true });
  }
}

export class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly publicCode = "SERVICE_UNAVAILABLE";

  constructor(
    message = "This feature is temporarily unavailable. Please try again later.",
    options?: {
      context?: ErrorContext;
      requestId?: string;
    }
  ) {
    super(message, { ...options, isOperational: true });
  }
}

export class AIProcessingError extends AppError {
  readonly statusCode = 500;
  readonly publicCode = "AI_ANALYSIS_FAILED";

  constructor(
    message = "We're having trouble analyzing this content. Please try again later.",
    options?: {
      context?: ErrorContext;
      requestId?: string;
    }
  ) {
    super(message, { ...options, isOperational: false });
  }
}

export class ServerError extends AppError {
  readonly statusCode = 500;
  readonly publicCode = "INTERNAL_ERROR";

  constructor(
    message = "Something went wrong on our end. Please try again later.",
    options?: {
      context?: ErrorContext;
      requestId?: string;
    }
  ) {
    super(message, { ...options, isOperational: false });
  }
}
