import assert from 'assert';
import { config } from '../config/config';
import { runWithGeneratedContext, getRequestId, getCorrelationId } from '../logging/correlation';
import { BaseApplicationError, ValidationError } from '../errors/applicationErrors';
import { errorMiddleware } from '../middlewares/error.middleware';

async function runHardeningTests() {
  console.log('🚀 Running Production Hardening Tests...');

  // 1. Centralized Configuration Tests
  try {
    assert.strictEqual(typeof config.port, 'number');
    assert.strictEqual(typeof config.mongoUri, 'string');
    assert.ok(config.maxUploadSize > 0);
    console.log('✅ Configuration Validation: PASSED');
  } catch (err: any) {
    console.error('❌ Configuration Validation failed:', err.message);
  }

  // 2. Request Correlation AsyncLocalStorage Context Tests
  try {
    await runWithGeneratedContext('test-req-id-123', 'test-corr-id-456', async () => {
      assert.strictEqual(getRequestId(), 'test-req-id-123');
      assert.strictEqual(getCorrelationId(), 'test-corr-id-456');
    });
    console.log('✅ Request Correlation context propagation: PASSED');
  } catch (err: any) {
    console.error('❌ Request Correlation context propagation failed:', err.message);
  }

  // 3. Custom Error Hierarchies Tests
  try {
    const vErr = new ValidationError('Invalid request field', { field: 'name' });
    assert.strictEqual(vErr.statusCode, 400);
    assert.strictEqual(vErr.message, 'Invalid request field');
    assert.deepStrictEqual(vErr.details, { field: 'name' });
    assert.ok(vErr instanceof BaseApplicationError);
    console.log('✅ Custom Error Hierarchies: PASSED');
  } catch (err: any) {
    console.error('❌ Custom Error Hierarchies failed:', err.message);
  }

  // 4. Global Error Middleware Response Mapping Tests
  try {
    const mockRequest = {} as any;
    let responseStatus = 0;
    let responseJson: any = null;
    const mockResponse = {
      status: (code: number) => {
        responseStatus = code;
        return mockResponse;
      },
      json: (data: any) => {
        responseJson = data;
        return mockResponse;
      },
    } as any;

    const mockNext = () => { };

    const testErr = new ValidationError('Bad validation');
    errorMiddleware(testErr, mockRequest, mockResponse, mockNext);

    assert.strictEqual(responseStatus, 400);
    assert.strictEqual(responseJson.error.type, 'ValidationError');
    assert.strictEqual(responseJson.error.message, 'Bad validation');
    console.log('✅ Global Error Middleware: PASSED');
  } catch (err: any) {
    console.error('❌ Global Error Middleware failed:', err.message);
  }

  console.log('🎉 All Hardening Tests Completed!');
}

runHardeningTests().catch((err) => {
  console.error('Fatal testing error:', err);
  process.exit(1);
});
