---
name: Agent
description: Use when building real-time voice or video AI agents, integrating with 30+ AI providers (LLMs, STT, TTS, vision models), deploying to production with Docker/Kubernetes, adding function calling and RAG, or testing agent behavior.
metadata:
    mintlify-proj: agent
    version: "1.0"
---

# Vision Agents Skill

## Product Summary

Vision Agents is a Python framework for building real-time voice and video AI agents with pluggable providers. It orchestrates LLMs, speech-to-text, text-to-speech, vision models, and external tools into low-latency conversational applications. The framework is provider-agnostic—swap Gemini for OpenAI, Deepgram for ElevenLabs, or any combination in one line. Deploy locally, as HTTP servers, or to Kubernetes with built-in metrics and session management.

**Key files and commands:**
- Core class: `Agent` (orchestrates all components)
- Factory pattern: `create_agent()` + `join_call()` + `Runner` for server mode
- CLI: `uv run agent.py run` (console) or `uv run agent.py serve` (HTTP server)
- Config: Environment variables for API keys (auto-loaded from `.env`)
- Integrations: 30+ plugins under `vision_agents.plugins` (gemini, openai, deepgram, elevenlabs, etc.)
- Primary docs: https://visionagents.ai

## When to Use

Reach for Vision Agents when:

- **Building voice agents**: Real-time conversation with custom STT/LLM/TTS pipelines or realtime models (Gemini Live, OpenAI Realtime)
- **Building video agents**: Real-time video analysis with VLMs, computer vision processors (YOLO), or realtime video streaming
- **Integrating tools**: Adding function calling, MCP servers, or RAG to agents
- **Deploying to production**: Running agents as HTTP servers, scaling horizontally with Redis, or orchestrating with Kubernetes
- **Testing agent behavior**: Verifying tool calls, responses, and intents without audio/video infrastructure
- **Connecting to phone networks**: Integrating with Twilio for inbound/outbound calls
- **Monitoring agents**: Collecting metrics, latency, token usage, and errors with OpenTelemetry

Do not use for: Static chatbots, batch processing, or applications that don't require real-time audio/video.

## Quick Reference

### Agent Constructor Parameters

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `edge` | EdgeTransport | Yes | Stream, Local, or Tencent transport |
| `llm` | LLM \| AudioLLM \| VideoLLM \| Realtime | Yes | Language model (text, audio, video, or realtime) |
| `agent_user` | User | Yes | Agent identity (name, id) |
| `instructions` | str | No | System prompt (supports `@file.md` for loading from files) |
| `stt` | STT | No | Speech-to-text (disabled in realtime mode) |
| `tts` | TTS | No | Text-to-speech (disabled in realtime mode) |
| `turn_detection` | TurnDetector | No | Silence/completion detection (auto-disabled if STT has built-in) |
| `processors` | List[Processor] | No | Video/audio processors (YOLO, Roboflow, etc.) |
| `avatar` | Avatar | No | Lip-synced visual character |
| `mcp_servers` | List[MCPServer] | No | External tool servers (GitHub, etc.) |
| `multi_speaker_filter` | AudioFilter | No | Defaults to FirstSpeakerWinsFilter |

### Core Methods

| Method | Purpose |
|--------|---------|
| `agent.join(call)` | Async context manager to join a call |
| `agent.simple_response(text, interrupt=False)` | Send text to LLM, speak response via TTS |
| `agent.say(text, interrupt=False)` | Speak text directly, bypass LLM |
| `agent.finish()` | Wait for call to end gracefully |
| `agent.create_call(call_type, call_id)` | Create a call object |
| `agent.close()` | Clean up resources |
| `@agent.llm.register_function()` | Register a tool for the LLM to call |
| `@agent.events.subscribe` | Subscribe to agent events |

### Runner & HTTP Server

| Command | Purpose |
|---------|---------|
| `uv run agent.py run` | Console mode (single agent, browser demo) |
| `uv run agent.py serve --host 0.0.0.0 --port 8000` | HTTP server mode (production) |

**HTTP Endpoints:**
- `POST /calls/{call_id}/sessions` — Start agent session
- `DELETE /calls/{call_id}/sessions/{session_id}` — Close session
- `GET /calls/{call_id}/sessions/{session_id}/metrics` — Real-time metrics
- `GET /health` — Liveness check
- `GET /ready` — Readiness check

### Provider Swapping

```python
# LLM
llm = gemini.LLM("gemini-3-flash-preview")
llm = openai.LLM(model="gpt-5.4")
llm = anthropic.LLM(model="claude-opus")

# STT
stt = deepgram.STT(eager_turn_detection=True)
stt = elevenlabs.STT()
stt = fish.STT()

# TTS
tts = elevenlabs.TTS()
tts = cartesia.TTS()
tts = kokoro.TTS()  # Local, no API key

# Realtime (speech-to-speech)
llm = gemini.Realtime()
llm = openai.Realtime()
llm = qwen.Realtime()
```

## Decision Guidance

### When to Use Realtime vs Custom Pipeline

| Aspect | Realtime Models | Custom Pipeline |
|--------|-----------------|-----------------|
| **Setup** | Simplest (one LLM plugin) | More config (STT + LLM + TTS) |
| **Latency** | Lowest (~100ms) | Higher (~300-500ms) |
| **Control** | Limited (built-in STT/TTS) | Full (swap any component) |
| **Cost** | Varies by provider | Potentially cheaper (mix free tiers) |
| **Use case** | Speed-critical, simple agents | Complex tools, specific providers |
| **Example** | `gemini.Realtime()` | `deepgram.STT()` + `gemini.LLM()` + `elevenlabs.TTS()` |

### When to Use Gemini File Search vs TurboPuffer for RAG

| Aspect | Gemini File Search | TurboPuffer |
|--------|-------------------|------------|
| **Setup** | Simple (auto-chunking) | More setup (configurable) |
| **Search** | Managed | Hybrid (vector + BM25) |
| **Control** | Less | Full |
| **Cost** | Included with Gemini | Separate service |
| **Best for** | Prototypes, quick setup | Production, custom needs |

### When to Use Local vs HTTP Server Deployment

| Aspect | Local (Console) | HTTP Server |
|--------|-----------------|------------|
| **Use case** | Development, testing | Production, multiple sessions |
| **Sessions** | Single agent | Multiple agents on demand |
| **Scaling** | None | Horizontal with Redis |
| **Health checks** | Manual | Built-in `/health`, `/ready` |
| **Metrics** | Logs | `/metrics` endpoint |

## Workflow

### 1. Build a Basic Voice Agent

1. **Initialize project**: `uv init --python 3.12 my-agent && cd my-agent && uv add "vision-agents[getstream,gemini]" python-dotenv`
2. **Add API keys** to `.env`: `STREAM_API_KEY`, `STREAM_API_SECRET`, `GOOGLE_API_KEY`
3. **Create `main.py`** with `create_agent()` and `join_call()` functions
4. **Run**: `uv run main.py run` (opens browser demo)
5. **Test**: Talk to the agent in the browser

### 2. Add Function Calling

1. **Register a function** on the LLM:
   ```python
   @llm.register_function(description="Get weather for a location")
   async def get_weather(location: str) -> dict:
       return {"temp": "22C", "condition": "Sunny"}
   ```
2. **Agent calls it automatically** when relevant to the conversation
3. **Test** with `vision_agents.testing.TestSession` (no audio/video needed)

### 3. Deploy to Production

1. **Run locally as HTTP server**: `uv run agent.py serve`
2. **Containerize**: Create `Dockerfile` with `FROM python:3.12` and `uv run agent.py serve`
3. **Scale horizontally**: Add `SessionRegistry` with Redis in `AgentLauncher`
4. **Orchestrate**: Use Kubernetes with Helm chart (see Deploy example)
5. **Monitor**: Export metrics to Prometheus via OpenTelemetry

### 4. Add Video Processing

1. **Install processor**: `uv add "vision-agents[ultralytics]"`
2. **Create processor**: `ultralytics.YOLOPoseProcessor(model_path="yolo26n-pose.pt")`
3. **Add to agent**: `processors=[yolo_processor]`
4. **Use realtime LLM**: `llm=gemini.Realtime(fps=3)` to stream video frames

### 5. Test Agent Behavior

1. **Import testing module**: `from vision_agents.testing import TestSession, LLMJudge`
2. **Create test**: Use `async with TestSession(llm=llm, instructions="...")` to send text
3. **Assert tool calls**: `response.assert_function_called("tool_name", arguments={...})`
4. **Judge responses**: Use `LLMJudge` to evaluate intent fulfillment
5. **Run**: `uv run pytest tests/ -m integration`

## Common Gotchas

- **Realtime mode disables STT/TTS**: If you pass `llm=gemini.Realtime()`, the `stt` and `tts` parameters are ignored. Don't configure both.
- **Turn detection conflicts**: If your STT plugin has built-in turn detection (Deepgram, ElevenLabs), passing a separate `turn_detection` plugin is ignored. Check the plugin docs.
- **Async functions only**: `@llm.register_function()` requires async functions. Sync functions raise `ValueError`.
- **Agent joins once**: Call `agent.join(call)` only once per agent instance. After the call ends, the agent closes itself.
- **Missing API keys**: Vision Agents auto-loads from `.env`. If a key is missing, the plugin fails at runtime, not import time. Test early.
- **Session limits**: Set `max_concurrent_sessions` and `max_session_duration_seconds` in `AgentLauncher` to prevent runaway costs.
- **Video override for testing**: Use `--video-track-override=/path/to/video.mp4` to test video processing without a live camera.
- **Events are fire-and-forget**: Event handlers run concurrently and don't block the agent. Errors in handlers are caught and re-emitted as `ExceptionEvent`.
- **Realtime models don't support function calling the same way**: Some realtime models (e.g., OpenAI Realtime) have limited tool support. Check provider docs.
- **Multi-speaker audio**: By default, `FirstSpeakerWinsFilter` locks onto the first speaker and drops others. Configure `multi_speaker_filter` to change behavior.

## Verification Checklist

Before submitting agent code:

- [ ] **API keys set**: All required keys in `.env` (test with `echo $GOOGLE_API_KEY`)
- [ ] **Agent runs locally**: `uv run agent.py run` opens browser demo without errors
- [ ] **Functions are async**: All `@llm.register_function()` decorated functions are `async def`
- [ ] **Instructions are clear**: System prompt is concise and specific to the agent's role
- [ ] **Turn detection configured**: If using custom pipeline, verify STT has `eager_turn_detection=True` or add `turn_detection` plugin
- [ ] **Realtime mode correct**: If using realtime LLM, no separate `stt`/`tts` are passed
- [ ] **Tests pass**: `uv run pytest tests/ -m integration` (if tests exist)
- [ ] **Metrics enabled**: For production, verify `broadcast_metrics=True` or OpenTelemetry exporter configured
- [ ] **Session limits set**: For HTTP server, configure `max_concurrent_sessions` and `max_session_duration_seconds`
- [ ] **Health checks work**: `curl http://localhost:8000/health` returns 200 (for server mode)
- [ ] **No blocking calls**: Event handlers are async and don't call `time.sleep()` or blocking I/O
- [ ] **Error handling**: Agent gracefully handles missing tools, API errors, and network timeouts

## Resources

**Comprehensive navigation:** https://visionagents.ai/llms.txt

**Critical documentation pages:**
1. [Quickstart](https://visionagents.ai/introduction/quickstart) — Build your first agent in 5 minutes
2. [Voice Agents](https://visionagents.ai/introduction/voice-agents) — Custom STT/LLM/TTS pipelines and realtime models
3. [Built-in HTTP Server](https://visionagents.ai/guides/http-server) — Deploy agents as production services
4. [MCP and Function Calling](https://visionagents.ai/guides/mcp-tool-calling) — Add tools and external services
5. [Testing Agents](https://visionagents.ai/guides/testing) — Verify behavior without audio/video
6. [Integrations](https://visionagents.ai/integrations/introduction-to-integrations) — Browse 30+ AI providers
7. [Deployment Overview](https://visionagents.ai/guides/deploying-overview) — Path from local to Kubernetes

---

> For additional documentation and navigation, see: https://visionagents.ai/llms.txt