#!/usr/bin/env bash
# Keep the production preview server alive on ports 12000 and 12001.
#
# The sandbox can restart or reap the process; a bare background launch does not
# survive that. This loop relaunches each server whenever it exits so the public
# URLs stay reachable for the playtest window. Port 12000 backs work-1, port
# 12001 backs work-2.
set -u

cd /workspace/project

LOG=/workspace/project/preview.log
VITE=/workspace/project/node_modules/.bin/vite

echo "[$(date -Is)] supervisor starting" >>"$LOG"

run_port() {
  local port=$1
  while true; do
    echo "[$(date -Is)] launching vite preview on :$port" >>"$LOG"
    "$VITE" preview --host 0.0.0.0 --port "$port" --strictPort >>"$LOG" 2>&1 &
    local vpid=$!

    # A hung server still accepts TCP, so wait for a real HTTP response.
    local up=0
    for _ in $(seq 1 40); do
      if curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:$port/"; then up=1; break; fi
      sleep 1
    done
    [ "$up" = 0 ] && echo "[$(date -Is)] :$port never answered after launch" >>"$LOG"

    while kill -0 "$vpid" 2>/dev/null; do
      sleep 30
      if ! curl -fsS -o /dev/null --max-time 10 "http://127.0.0.1:$port/"; then
        echo "[$(date -Is)] :$port failed health check; recycling" >>"$LOG"
        kill "$vpid" 2>/dev/null
        sleep 2
        kill -9 "$vpid" 2>/dev/null
        break
      fi
    done

    wait "$vpid" 2>/dev/null
    echo "[$(date -Is)] :$port exited with $?; restarting in 3s" >>"$LOG"
    sleep 3
  done
}

run_port 12000 &
run_port 12001 &
wait
