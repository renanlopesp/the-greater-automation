FROM ghcr.io/openclaw/openclaw:latest

# Security: run gateway in loopback-only mode.
# Listens on 127.0.0.1:18789 inside the container ONLY.
# No Fly services expose this port — WebUI is NOT accessible externally.
# The gateway must run because `agent --local` still depends on it
# for internal coordination (session management, model routing).
# All external interaction happens through Fly exec.
ENTRYPOINT []
CMD ["node", "/app/openclaw.mjs", "gateway", "--allow-unconfigured", "--port", "18789", "--bind", "loopback"]
