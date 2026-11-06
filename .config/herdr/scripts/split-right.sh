#!/bin/sh
# Usage: split-right.sh <command>  (opens a right split in the active pane's cwd and runs <command>)
pane=$(herdr pane split --pane "$HERDR_ACTIVE_PANE_ID" --direction right --cwd "$HERDR_ACTIVE_PANE_CWD" --focus \
  | jq -r '.result.pane.pane_id // empty') && [ -n "$pane" ] && herdr pane run "$pane" "$*"
