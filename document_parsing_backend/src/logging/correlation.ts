import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

export interface CorrelationContext {
  requestId: string;
  correlationId: string;
}

export const correlationLocalStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Gets the current request ID from the context, if set.
 */
export function getRequestId(): string | undefined {
  return correlationLocalStorage.getStore()?.requestId;
}

/**
 * Gets the current correlation ID from the context, if set.
 */
export function getCorrelationId(): string | undefined {
  return correlationLocalStorage.getStore()?.correlationId;
}

/**
 * Runs a callback within a correlation context.
 */
export function runWithContext<T>(
  context: CorrelationContext,
  callback: () => T
): T {
  return correlationLocalStorage.run(context, callback);
}

/**
 * Run inside context, generating new IDs if they are not provided.
 */
export function runWithGeneratedContext<T>(
  customRequestId?: string,
  customCorrelationId?: string,
  callback?: () => T
): T {
  const requestId = customRequestId || uuidv4();
  const correlationId = customCorrelationId || requestId;
  const context: CorrelationContext = { requestId, correlationId };

  if (callback) {
    return correlationLocalStorage.run(context, callback);
  }
  
  // Return the context if no callback is supplied
  return correlationLocalStorage.run(context, () => {
    return context as any;
  });
}
