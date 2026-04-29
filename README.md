# NextFlow - Visual Workflow Builder

A modern, real-time workflow builder for creating and executing visual node-based pipelines. Build complex data processing workflows with an intuitive drag-and-drop interface, execute tasks in parallel, and integrate with AI models seamlessly.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-blue?logo=tailwindcss)

## Features

### 🔐 User Authentication & Storage
- **Clerk Authentication**: Secure user sign-up/sign-in with email and OAuth (Google, GitHub, etc.)
- **Multi-Tenancy**: User data isolation with automatic user ID tracking
- **Persistent Storage**: Save and load workflows from Neon PostgreSQL
- **Public Sample Workflow**: Demo accessible without authentication
- **Run History**: Permanent execution history per user

### 🎨 Visual Node Editor
- **6 Node Types**: Text, Image, LLM, Video Upload, Image Crop, Frame Extract
- **Drag & Drop Canvas**: Intuitive React Flow-based interface with smooth animations
- **Real-time Visual Feedback**: Glowing running state indicators, node status colors
- **Collapsible Sidebar**: Toggle between expanded and compact modes

### ⚡ Advanced Execution
- **Parallel Execution**: Independent branches run concurrently using Kahn's algorithm
- **Per-Node Execution**: Right-click nodes to run individually
- **Error Handling**: Detailed error messages with automatic state recovery
- **Run History**: Persistent history with localStorage-backed run tracking

### 🤖 AI & Media Processing
- **Google Generative AI Integration**: LLM nodes use Gemini 2.0-flash for intelligent responses
- **Video Frame Extraction**: FFmpeg-powered frame extraction with Transloadit fallback
- **Image Processing**: Crop nodes for image manipulation
- **Media Upload**: Seamless Transloadit integration for file uploads

### 🔄 Serverless-Ready
- **Trigger.dev Integration**: Distributed task execution for scalable workflows
- **Transloadit Fallback**: Automatic fallback for FFmpeg operations in serverless environments (Vercel)
- **Environment-Agnostic**: Works locally and in production with proper configuration

### 📊 State Management
- **Zustand Store**: Efficient, reactive state management
- **Persistence**: Workflow history saved to localStorage (with hydration guards)
- **Real-time Updates**: Instant feedback on node execution and data flow

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- API Keys for:
  - `GEMINI_API_KEY` (Google Generative AI)
  - `TRANSLOADIT_KEY` & `TRANSLOADIT_SECRET` (media uploads)
  - `TRIGGER_API_KEY` (optional, for distributed execution)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd NextFlow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your API keys
```

### Development

```bash
# Start the development server
npm run dev

# Open http://localhost:3000/workflow
```

### Production Build & Deployment

```bash
# Run pre-deployment checks (validates TypeScript, build, hydration, env vars)
npm run pre-deploy

# Build for production
npm run build

# Start production server locally
npm start

# Deploy to Vercel (or your preferred platform)
git push origin main
```

## Project Structure

```
NextFlow/
├── app/
│   ├── api/
│   │   ├── extract-frame/      # FFmpeg frame extraction endpoint
│   │   ├── run-workflow/       # Trigger.dev workflow orchestration
│   │   ├── upload/             # Transloadit media uploads
│   │   └── runs/               # Run history API
│   ├── workflow/               # Main canvas page
│   ├── layout.tsx              # Root layout with React Flow styles
│   └── page.tsx                # Home landing page
├── components/
│   ├── nodes/                  # 6 node type components
│   │   ├── TextNode.tsx
│   │   ├── ImageNode.tsx
│   │   ├── LLMNode.tsx
│   │   ├── UploadVideoNode.tsx
│   │   ├── CropImageNode.tsx
│   │   └── ExtractFrameNode.tsx
│   ├── HistoryPanel.tsx        # Run history sidebar
│   ├── LoadSampleWorkflowButton.tsx
│   └── NewWorkflowButton.tsx
├── lib/
│   ├── frame-extraction.ts     # FFmpeg/Transloadit frame extraction logic
│   ├── workflow-execution.ts   # Topological sort, parallel batching
│   ├── gemini.ts               # LLM prompt execution
│   ├── transloadit.ts          # Media upload helpers
│   ├── trigger.ts              # Trigger.dev SDK setup
│   └── upload-media.ts         # File handling
├── store/
│   └── useWorkflowStore.ts     # Zustand workflow state
├── trigger/
│   ├── run-llm.ts              # Trigger task for LLM execution
│   └── execute-node.ts         # Trigger task for node execution
├── types/
│   └── *.d.ts                  # Type declarations for external packages
├── scripts/
│   └── pre-deploy-check.js     # Automated validation before deployment
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── DEPLOYMENT.md               # Detailed deployment guide
```

## Node Types

### Text Node
Input and output plain text. Useful for passing messages and data between nodes.

### Image Node
Load images from URLs. Serves as input for crop and LLM analysis nodes.

### LLM Node
Send text prompts to Google Generative AI (Gemini). Supports image attachments for vision tasks.

### Video Upload Node
Upload video files via Transloadit. Output URLs for frame extraction.

### Crop Image Node
Crop images with pixel-based coordinates. Useful for preprocessing before LLM analysis.

### Frame Extract Node
Extract a single frame from a video at a specified timestamp (seconds or percentage). **Note**: Requires FFmpeg (local) or Transloadit (serverless fallback).

## API Endpoints

### POST `/api/extract-frame`
Extract a frame from a video URL.

```bash
curl -X POST http://localhost:3000/api/extract-frame \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://example.com/video.mp4",
    "timestamp": 5,
    "timestampMode": "seconds"
  }'
```

**Response:**
```json
{
  "frameImageUrl": "https://...",
  "timestampSeconds": 5
}
```

### POST `/api/run-workflow`
Execute a complete workflow with parallel node batching.

```bash
curl -X POST http://localhost:3000/api/run-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "edges": [...]
  }'
```

### POST `/api/upload`
Upload media files via Transloadit.

### GET `/api/runs`
Fetch workflow run history.

## Key Technologies

| Library | Purpose |
|---------|---------|
| **Next.js 14** | React framework with API routes and SSR |
| **React 18** | Component library |
| **React Flow** | Node-based canvas editor |
| **Zustand** | State management |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Clerk** | User authentication and session management |
| **Neon PostgreSQL** | Serverless PostgreSQL for persistent data storage |
| **Trigger.dev** | Distributed task orchestration |
| **Google Generative AI** | LLM integration (Gemini) |
| **Transloadit** | Media processing & uploads |
| **FFmpeg** | Local video frame extraction |

## Configuration

### Environment Variables

```env
# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@ep-*.neon.tech/db?sslmode=require

# LLM (Google Generative AI)
GEMINI_API_KEY=your_google_api_key

# Media Upload (Transloadit)
TRANSLOADIT_KEY=your_transloadit_key
TRANSLOADIT_SECRET=your_transloadit_secret

# Distributed Execution (Trigger.dev)
TRIGGER_API_KEY=your_trigger_dev_key
```

**📚 For Complete Environment Setup**: See [ENV_VARIABLES.md](ENV_VARIABLES.md) for detailed instructions on getting all required API keys.

**📚 For Clerk & Database Setup**: See [SETUP_GUIDE.md](SETUP_GUIDE.md) for step-by-step configuration.

### FFmpeg on Serverless

**Issue**: Vercel and similar serverless platforms don't reliably bundle native FFmpeg binaries.

**Solution**: The extract-frame endpoint automatically falls back to Transloadit if local FFmpeg is unavailable. Ensure `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET` are configured.

**Alternative**: Deploy a dedicated FFmpeg worker (Docker on Cloud Run, Render, or EC2) and set an environment variable pointing to it (see `DEPLOYMENT.md`).

## Development

### Adding a New Node Type

1. **Create component** in `components/nodes/YourNode.tsx`:
```tsx
'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useWorkflowStore, type YourNodeData } from '../../store/useWorkflowStore';

export default function YourNode({ data, id }: NodeProps) {
  // Component code
}
```

2. **Register in store** (`store/useWorkflowStore.ts`):
```tsx
type WorkflowNodeType = '...' | 'yourNode';
```

3. **Add to nodeTypes** in `app/workflow/page.tsx`:
```tsx
const nodeTypes: NodeTypes = {
  // ...
  yourNode: YourNode,
};
```

4. **Implement in execution logic** (`lib/workflow-execution.ts` or `trigger/execute-node.ts`).

### Running Tests

```bash
npm run lint          # Run ESLint
npm run type-check    # Run TypeScript checks (via next build)
npm run pre-deploy    # Full pre-deployment validation
```

### Debugging

Enable verbose logging in node execution by checking browser console and server logs. Run `npm run dev` and open DevTools (F12).

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect Vercel to your repository
3. Add environment variables in Vercel dashboard
4. Vercel auto-deploys on push

**Checklist**:
- ✅ TypeScript strict mode enabled
- ✅ Build passes locally: `npm run build`
- ✅ All env vars set in Vercel dashboard
- ✅ Test extract-frame fallback works (uses Transloadit if FFmpeg unavailable)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guide, troubleshooting, and alternative hosting options.

### Docker (Self-Hosted with FFmpeg)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY .next ./
EXPOSE 3000
CMD ["npm", "start"]
```

Include `ffmpeg` and `ffprobe` binaries in the container for local extraction.

## Performance Tips

1. **Limit node count**: Large workflows (100+ nodes) may slow down the canvas. Use workflow composition instead.
2. **Batch parallel nodes**: Independent node chains execute concurrently; sequential dependencies are preserved.
3. **Transloadit timeouts**: Video processing via Transloadit may take 30–60s. Increase timeout if processing large files.
4. **Local vs. serverless**: FFmpeg locally is faster but requires infrastructure; Transloadit is slower but serverless-friendly.

## Troubleshooting

### "ffmpeg executable not found"
- **Dev**: Install FFmpeg globally or set `FFMPEG_PATH` env var
- **Vercel**: Automatically falls back to Transloadit (ensure env vars set)

### "localStorage is not defined"
- This is a hydration error. Check that components wrap localStorage calls in `useEffect` with `typeof window !== 'undefined'` guards. (Fixed in `HistoryPanel.tsx`)

### "Transloadit assembly failed"
- Check that `TRANSLOADIT_KEY` and `TRANSLOADIT_SECRET` are correct
- Verify Transloadit plan supports `/http/import` and `/video/thumbnail` robots

### Workflow doesn't execute
- Check browser console for JavaScript errors
- Verify all API keys are set
- Run `npm run pre-deploy` locally to catch issues before deploying

## Roadmap

### ✅ Implemented (Latest Update)
- 🔐 **Clerk Authentication**: User authentication with email/OAuth (Google, GitHub, etc.)
- 🗄️ **PostgreSQL Database (Neon)**: Persistent workflow storage, user management, execution logs
- 💾 **Cloud Workflow Storage**: Save, load, and manage workflows per user
- 🔒 **Multi-Tenancy**: User data isolation with Clerk user IDs

**See Also**:
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - What's been implemented and what's next
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Complete Clerk & Neon setup instructions
- [CLERK_UI_GUIDE.md](CLERK_UI_GUIDE.md) - Integrating Clerk UI components
- [ENV_VARIABLES.md](ENV_VARIABLES.md) - All required API keys and how to get them

### Coming Soon (Future Sprints)
- 🔗 **Workflow Sharing**: Share workflows with team members and manage permissions
- 📈 **Advanced Analytics**: Execution metrics, performance insights, audit logs
- 🔄 **Workflow Versioning**: Version control for workflows with rollback capability
- 📦 **Workflow Templates**: Pre-built templates and marketplace
- ⚙️ **Advanced Scheduling**: Cron-based workflow triggers and scheduled execution

These features will enable advanced collaboration, analytics, and workflow automation.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Support

For issues, questions, or feature requests, please open an issue on GitHub or contact the maintainers.

---

**Version**: 1.0.0  
**Last Updated**: April 28, 2026  
**Next.js**: 14.2.25  
**React**: 18.3.1
