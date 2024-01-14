#!/bin/bash
pm2 start deploy.config.cjs
code-server --bind-addr 0.0.0.0:8080 --auth none --disable-telemetry --disable-update-check --disable-workspace-trust /app/automations