# Azure OpenAI Setup for Thread Summaries

This guide explains how to configure Azure OpenAI for automatic thread summary generation.

## Required Environment Variables

Add the following variables to your `.env` file:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://velroi-agents.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

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
   - Model: `gpt-4o` (recommended - faster, more capable, and cost-effective)
   - Alternative: `gpt-4` or `gpt-3.5-turbo` for budget-conscious deployments
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
| `AZURE_OPENAI_ENDPOINT` | ✅ | Your Azure OpenAI resource endpoint | `https://myresource.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | ✅ | API key from Azure Portal | `abc123def456...` |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | ✅ | Name of your model deployment | `gpt-4o` |
| `AZURE_OPENAI_MAX_TOKENS` | ❌ | Max tokens for summary (default: 150) | `200` |
| `AZURE_OPENAI_TEMPERATURE` | ❌ | Creativity level (default: 0.3) | `0.5` |

## How It Works

1. **Automatic Detection**: When users view comment threads with 3+ comments, a summary section appears
2. **Smart Caching**: Summaries are cached and only regenerated when:
   - 3+ new comments are added
   - 24+ hours have passed since last update
3. **On-Demand Generation**: Users can manually trigger summary generation
4. **GPT-4o Optimization**: Uses advanced reasoning for better technical discussion summaries
5. **Graceful Fallback**: If Azure OpenAI is not configured, the feature is disabled

## Why GPT-4o?

- **Faster**: 2x faster inference than GPT-4
- **Better Reasoning**: Superior understanding of technical discussions
- **Cost Effective**: 50% cheaper than GPT-4 for similar quality
- **Latest Features**: Most up-to-date model capabilities

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

### "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"
This error means you're getting an HTML response instead of JSON. Common causes:
- **Wrong endpoint format**: Use `https://your-resource.openai.azure.com` (without trailing slash)
- **Invalid endpoint**: Double-check your resource name in Azure Portal
- **Wrong API version**: The service uses API version `2024-12-01-preview`
- **Network issues**: Check if you can access the endpoint in a browser

### "Azure OpenAI deployment 'gpt-4o' not found"
- Verify your deployment name in Azure OpenAI Studio
- Ensure the deployment is in "Succeeded" state
- Check that `AZURE_OPENAI_DEPLOYMENT_NAME` matches exactly

### "Azure OpenAI authentication failed"
- Verify your API key from Azure Portal > Keys and Endpoint
- Try regenerating the API key if needed
- Ensure no extra spaces in the environment variable

### "Cannot reach Azure OpenAI endpoint"
- Check your internet connection
- Verify the endpoint URL is correct
- Some corporate firewalls may block Azure OpenAI

### Rate Limiting
- Azure OpenAI has rate limits based on your pricing tier
- Check Azure Portal for quota usage
- Consider implementing user-level rate limiting for high-traffic scenarios

### Debug Steps
1. **Test the connection directly**: Visit `/api/debug/azure-openai` (requires login) to test your Azure OpenAI setup
2. Check server logs for detailed error messages
3. Verify all environment variables are loaded in your server console
4. Test endpoint connectivity: `curl https://velroi-agents.openai.azure.com/`
5. Check Azure OpenAI Studio for deployment status

### Debug Endpoint
We've added a debug endpoint at `/api/debug/azure-openai` that will:
- Test your Azure OpenAI credentials
- Verify environment variables
- Attempt a simple summary generation
- Return detailed error information if something fails

## Customization

You can customize the summary generation by modifying:
- `shipits/server/services/azureOpenAI.ts` - AI prompts and parameters
- `shipits/client/src/components/ThreadSummary.tsx` - UI appearance
- `shipits/server/models/ThreadSummary.ts` - Caching behavior