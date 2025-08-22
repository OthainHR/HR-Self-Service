# OpenAI Configuration Guide

## Streaming Issues and Organization Verification

### Problem
If you encounter this error:
```
Error code: 400 - {'error': {'message': 'Your organization must be verified to stream this model. Please go to: https://platform.openai.com/settings/organization/general and click on Verify Organization. If you just verified, it can take up to 15 minutes for access to propagate.', 'type': 'invalid_request_error', 'param': 'stream', 'code': 'unsupported_value'}}
```

### Solutions

#### Option 1: Disable Streaming (Immediate Fix)
Add this to your `.env` file:
```bash
DISABLE_STREAMING=true
```

This will make the system use non-streaming mode, which doesn't require organization verification.

#### Option 2: Verify Your Organization
1. Go to [OpenAI Organization Settings](https://platform.openai.com/settings/organization/general)
2. Click "Verify Organization"
3. Follow the verification process
4. Wait up to 15 minutes for access to propagate

#### Option 3: Automatic Fallback
The system automatically detects streaming errors and falls back to non-streaming mode when possible.

### Environment Variables

```bash
# Disable streaming (recommended for unverified organizations)
DISABLE_STREAMING=true

# Use mock embeddings for testing (no OpenAI credits needed)
USE_MOCK_EMBEDDINGS=true

# Your OpenAI API key
OPENAI_API_KEY=your_api_key_here
```

### Model Compatibility

The system now uses `gpt-4o-mini` by default, which has better compatibility with streaming and is more cost-effective.

### Testing

To test if streaming is working:
1. Set `DISABLE_STREAMING=false` (or remove the variable)
2. Try a chat request
3. If you get the verification error, set `DISABLE_STREAMING=true`

### Performance Impact

- **With streaming**: Responses appear word-by-word in real-time
- **Without streaming**: Responses appear all at once after completion

Both modes provide the same final result, just with different user experience.
