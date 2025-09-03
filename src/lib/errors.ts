// Error handling utilities
import { logger } from './logger';

export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly recoverable: boolean;

  constructor(
    code: string,
    message: string,
    userMessage: string,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.recoverable = recoverable;
  }
}

export const ErrorCodes = {
  AUTHENTICATION_FAILED: 'AUTH_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATABASE_ERROR: 'DB_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_REQUEST: 'INVALID_REQUEST',
  REQUEST_ALREADY_EXISTS: 'REQUEST_ALREADY_EXISTS',
  USER_BLOCKED: 'USER_BLOCKED',
  ALREADY_CONNECTED: 'ALREADY_CONNECTED',
  RATE_LIMITED: 'RATE_LIMITED',
  DAILY_WORD_LIMIT_EXCEEDED: 'DAILY_WORD_LIMIT_EXCEEDED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export const createUserFriendlyError = (error: any): AppError => {
  logger.error('Creating user-friendly error', { originalError: error });

  // Handle known Supabase errors
  if (error?.message?.includes('Invalid login credentials')) {
    return new AppError(
      ErrorCodes.AUTHENTICATION_FAILED,
      'Invalid login credentials',
      'The email or password you entered is incorrect. Please try again.',
      true
    );
  }

  if (error?.message?.includes('Email not confirmed')) {
    return new AppError(
      ErrorCodes.AUTHENTICATION_FAILED,
      'Email not confirmed',
      'Please check your email and click the verification link before signing in.',
      true
    );
  }

  if (error?.message?.includes('User already registered')) {
    return new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'User already registered',
      'An account with this email already exists. Please sign in instead.',
      true
    );
  }

  if (error?.message?.includes('Network request failed')) {
    return new AppError(
      ErrorCodes.NETWORK_ERROR,
      'Network request failed',
      'Please check your internet connection and try again.',
      true
    );
  }

  if (error?.message?.includes('JWT expired')) {
    return new AppError(
      ErrorCodes.AUTHENTICATION_FAILED,
      'JWT expired',
      'Your session has expired. Please sign in again.',
      true
    );
  }

  if (error?.message?.includes('duplicate key value')) {
    return new AppError(
      ErrorCodes.VALIDATION_ERROR,
      'Duplicate entry',
      'This item already exists. Please try something different.',
      true
    );
  }

  // Handle daily word limit errors
  if (error?.code === ErrorCodes.DAILY_WORD_LIMIT_EXCEEDED) {
    return new AppError(
      ErrorCodes.DAILY_WORD_LIMIT_EXCEEDED,
      'Daily word limit exceeded',
      'You have already sent your word for today. Come back tomorrow to send another word!',
      true
    );
  }

  // Handle generic errors
  if (error instanceof AppError) {
    return error;
  }

  // Default error
  return new AppError(
    ErrorCodes.UNKNOWN_ERROR,
    error?.message || 'Unknown error occurred',
    'Something went wrong. Please try again later.',
    true
  );
};

export const handleAsyncError = async <T>(
  asyncFn: () => Promise<T>,
  context: string
): Promise<T> => {
  try {
    return await asyncFn();
  } catch (error) {
    const appError = createUserFriendlyError(error);
    logger.error(`Error in ${context}`, { error: appError, originalError: error });
    throw appError;
  }
};

export const isRecoverableError = (error: any): boolean => {
  if (error instanceof AppError) {
    return error.recoverable;
  }
  
  // Network errors are usually recoverable
  if (error?.message?.includes('Network request failed')) {
    return true;
  }
  
  // Authentication errors are usually recoverable
  if (error?.message?.includes('Invalid login credentials')) {
    return true;
  }
  
  // Default to recoverable
  return true;
};
