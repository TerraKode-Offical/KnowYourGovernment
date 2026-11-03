# ═══════════════════════════════════════════════════════════════════════════
# Caddy with the Cloudflare DNS provider (for Let's Encrypt DNS-01)
# ═══════════════════════════════════════════════════════════════════════════
FROM caddy:2-builder AS builder

RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Health check against the Caddy admin endpoint (localhost:2019 inside the
# container). Satisfies Trivy DS-0026 (finding H-4).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:2019/config/ || exit 1
