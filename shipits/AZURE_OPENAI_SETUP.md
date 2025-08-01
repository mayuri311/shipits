# Azure OpenAI Setup for Thread Summaries

This guide explains how to configure Azure OpenAI for automatic thread summary generation.

## Required Environment Variables

Add the following variables to your `.env` file:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Optional: Custom configuration
AZURE_OPENAI_MAX_TOKENS=150
AZURE_OPENAI_TEMPERATURE=0.3
```

## Getting Your Azure OpenAI Credentials

### 1. Create Azure OpenAI Resource
1. Go to the [Azure Portal](https://portal.azure.com)
2. Search for "Azure OpenAI" and create a new resource
3. Choose your subscription, resource group, and region
4. Select the pricing tier (Standard is recommended)

### 2. Deploy a Model
1. Go to Azure OpenAI Studio
2. Navigate to "Deployments"
3. Create a new deployment with:
   - Model: `gpt-4` or `gpt-3.5-turbo`
   - Deployment name: (remember this for `AZURE_OPENAI_DEPLOYMENT_NAME`)

### 3. Get Your Credentials
1. In Azure Portal, go to your OpenAI resource
2. In the sidebar, click "Keys and Endpoint"
3. Copy:
   - **Endpoint**: Your `AZURE_OPENAI_ENDPOINT`
   - **Key 1**: Your `AZURE_OPENAI_API_KEY`

## Environment Variable Details

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AZURE_OPENAI_ENDPOINT` | ✅ | Your Azure OpenAI resource endpoint | `https://myresource.openai.azure.com/` |
| `AZURE_OPENAI_API_KEY` | ✅ | API key from Azure Portal | `abc123def456...` |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | ✅ | Name of your model deployment | `gpt-4` |
| `AZURE_OPENAI_MAX_TOKENS` | ❌ | Max tokens for summary (default: 150) | `200` |
| `AZURE_OPENAI_TEMPERATURE` | ❌ | Creativity level (default: 0.3) | `0.5` |

## How It Works

1. **Automatic Detection**: When users view comment threads with 3+ comments, a summary section appears
2. **Smart Caching**: Summaries are cached and only regenerated when:
   - 3+ new comments are added
   - 24+ hours have passed since last update
3. **On-Demand Generation**: Users can manually trigger summary generation
4. **Graceful Fallback**: If Azure OpenAI is not configured, the feature is disabled

## Testing the Setup

1. Restart your server after adding environment variables
2. Navigate to a project with several comments
3. You should see an "AI Summary" section at the top of comments
4. Click "Generate Summary" to test the integration

## Troubleshooting

### "AI summary service is not configured"
- Check that all required environment variables are set
- Verify your Azure OpenAI endpoint URL format
- Ensure your API key is correct

### "Failed to generate summary"
- Check your Azure OpenAI deployment is active
- Verify the deployment name matches your environment variable
- Check Azure OpenAI Studio for any service issues

### Rate Limiting
- Azure OpenAI has rate limits based on your pricing tier
- Consider implementing user-level rate limiting for high-traffic scenarios

## Customization

You can customize the summary generation by modifying:
- `shipits/server/services/azureOpenAI.ts` - AI prompts and parameters
- `shipits/client/src/components/ThreadSummary.tsx` - UI appearance
- `shipits/server/models/ThreadSummary.ts` - Caching behavior