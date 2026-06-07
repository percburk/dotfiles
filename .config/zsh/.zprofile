typeset -U path PATH

path=(
  "$HOME/.local/bin"
  "$BUN_INSTALL/bin"
  "/opt/homebrew/opt/python@3/libexec/bin"
  $path
)

export PATH
