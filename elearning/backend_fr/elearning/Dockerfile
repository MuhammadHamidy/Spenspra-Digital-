# Stage 1: Build
FROM golang:1.25-alpine AS builder

WORKDIR /build

RUN apk add --no-cache git

COPY framework/ ./framework/
COPY libraries/ ./libraries/
COPY elearning/ ./elearning/

WORKDIR /build/elearning

RUN [ -f config/config.json ] || cp config/config.example.json config/config.json
RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags "-X github.com/rapor/rapor-be/elearning/version.Version=docker" \
    -o elearning .

# Stage 2: Dev (for docker-compose)
FROM golang:1.25-alpine AS dev

WORKDIR /app

# Install air and pre-download dependencies so the volume cache is warm on first run
RUN go install github.com/air-verse/air@v1.61.7

# Copy module files first (better Docker layer caching)
COPY framework/go.mod framework/go.sum ./framework/
COPY libraries/go.mod libraries/go.sum ./libraries/
COPY elearning/go.mod elearning/go.sum ./elearning/
COPY go.work go.work.sum* ./

# Pre-download all dependencies into GOPATH/pkg/mod
RUN go work sync && \
    cd elearning && go mod download

WORKDIR /app/elearning
CMD ["air", "-c", ".air.toml"]


# Stage 3: Runtime
FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache ca-certificates postgresql-client tzdata wget

RUN addgroup -g 1000 elearning && adduser -D -u 1000 -G elearning elearning

COPY --from=builder /build/elearning/elearning .
COPY --from=builder /build/elearning/config ./config
COPY --from=builder /build/elearning/migrations ./migrations
COPY --from=builder /build/elearning/seeders ./seeders

RUN chown -R elearning:elearning /app && mkdir -p logs && chown -R elearning:elearning logs

USER elearning

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 -O /dev/null http://127.0.0.1:8080/health/livez || exit 1

ENTRYPOINT ["./elearning"]
CMD ["serve"]
