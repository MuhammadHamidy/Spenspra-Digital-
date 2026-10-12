# Stage 1: Build
# Build context harus folder rapor-BE (bukan rapor saja)
FROM golang:1.25-alpine AS builder

WORKDIR /build

RUN apk add --no-cache git

COPY framework/ ./framework/
COPY libraries/ ./libraries/
COPY rapor/ ./rapor/

WORKDIR /build/rapor

RUN [ -f config/config.json ] || cp config/config.example.json config/config.json
RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags "-X github.com/rapor/rapor-be/rapor/version.Version=docker" \
    -o rapor .

# Stage 2: Dev (for docker-compose)
FROM golang:1.25-alpine AS dev

WORKDIR /app

# Install air and pre-download dependencies so the volume cache is warm on first run
RUN go install github.com/air-verse/air@v1.61.7

# Copy module files first (better Docker layer caching)
COPY framework/go.mod framework/go.sum ./framework/
COPY libraries/go.mod libraries/go.sum ./libraries/
COPY rapor/go.mod rapor/go.sum ./rapor/
COPY go.work go.work.sum* ./

# Pre-download all dependencies into GOPATH/pkg/mod
RUN go work sync && \
    cd rapor && go mod download

WORKDIR /app/rapor
CMD ["air", "-c", ".air.toml"]


# Stage 3: Runtime
FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache ca-certificates postgresql-client tzdata wget

RUN addgroup -g 1000 rapor && adduser -D -u 1000 -G rapor rapor

COPY --from=builder /build/rapor/rapor .
COPY --from=builder /build/rapor/config ./config
COPY --from=builder /build/rapor/migrations ./migrations
COPY --from=builder /build/rapor/seeders ./seeders

RUN chown -R rapor:rapor /app && mkdir -p logs && chown -R rapor:rapor logs

USER rapor

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 -O /dev/null http://127.0.0.1:8080/health/livez || exit 1

ENTRYPOINT ["./rapor"]
CMD ["serve"]
