# Ayu Dark Theme (for zsh-syntax-highlighting)
#
# Source this file in ~/.zshrc before activating zsh-syntax-highlighting.
#
# Ayu Dark semantic colors from https://github.com/ayu-theme/ayu-colors
#   fg       #ECE8DB
#   comment  #5A6673
#   keyword  #FF8F40
#   func     #FFB454
#   entity   #59C2FF
#   string   #AAD94C
#   operator #F29668
#   constant #D2A6FF
#   markup   #F07178
ZSH_HIGHLIGHT_HIGHLIGHTERS=(main cursor)
typeset -gA ZSH_HIGHLIGHT_STYLES

# Main highlighter styling: https://github.com/zsh-users/zsh-syntax-highlighting/blob/master/docs/highlighters/main.md
#
## General
### Diffs
### Markup
## Classes
## Comments
ZSH_HIGHLIGHT_STYLES[comment]='fg=#5A6673'
## Constants
## Entitites
## Functions/methods
ZSH_HIGHLIGHT_STYLES[alias]='fg=#FFB454'
ZSH_HIGHLIGHT_STYLES[suffix-alias]='fg=#FFB454'
ZSH_HIGHLIGHT_STYLES[global-alias]='fg=#FFB454'
ZSH_HIGHLIGHT_STYLES[function]='fg=#FFB454'
ZSH_HIGHLIGHT_STYLES[command]='fg=#FFB454'
ZSH_HIGHLIGHT_STYLES[precommand]='fg=#FFB454'
ZSH_HIGHLIGHT_STYLES[autodirectory]='fg=#59C2FF'
ZSH_HIGHLIGHT_STYLES[single-hyphen-option]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[double-hyphen-option]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[back-quoted-argument]='fg=#D2A6FF'
## Keywords
## Built ins
ZSH_HIGHLIGHT_STYLES[builtin]='fg=#FFB454'
ZSH_HIGHLIGHT_STYLES[reserved-word]='fg=#FF8F40'
ZSH_HIGHLIGHT_STYLES[hashed-command]='fg=#FFB454'
## Punctuation
ZSH_HIGHLIGHT_STYLES[commandseparator]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[command-substitution-delimiter]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[command-substitution-delimiter-unquoted]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[process-substitution-delimiter]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[back-quoted-argument-delimiter]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[back-double-quoted-argument]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[back-dollar-quoted-argument]='fg=#F29668'
## Serializable / Configuration Languages
## Storage
## Strings
ZSH_HIGHLIGHT_STYLES[command-substitution-quoted]='fg=#AAD94C'
ZSH_HIGHLIGHT_STYLES[command-substitution-delimiter-quoted]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[single-quoted-argument]='fg=#AAD94C'
ZSH_HIGHLIGHT_STYLES[single-quoted-argument-unclosed]='fg=#F07178'
ZSH_HIGHLIGHT_STYLES[double-quoted-argument]='fg=#AAD94C'
ZSH_HIGHLIGHT_STYLES[double-quoted-argument-unclosed]='fg=#F07178'
ZSH_HIGHLIGHT_STYLES[rc-quote]='fg=#AAD94C'
## Variables
ZSH_HIGHLIGHT_STYLES[dollar-quoted-argument]='fg=#AAD94C'
ZSH_HIGHLIGHT_STYLES[dollar-quoted-argument-unclosed]='fg=#F07178'
ZSH_HIGHLIGHT_STYLES[dollar-double-quoted-argument]='fg=#59C2FF'
ZSH_HIGHLIGHT_STYLES[assign]='fg=#59C2FF'
ZSH_HIGHLIGHT_STYLES[named-fd]='fg=#59C2FF'
ZSH_HIGHLIGHT_STYLES[numeric-fd]='fg=#59C2FF'
## No category relevant in spec
ZSH_HIGHLIGHT_STYLES[unknown-token]='fg=#F07178'
ZSH_HIGHLIGHT_STYLES[path]='fg=#59C2FF'
ZSH_HIGHLIGHT_STYLES[path_pathseparator]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[path_prefix]='fg=#59C2FF'
ZSH_HIGHLIGHT_STYLES[path_prefix_pathseparator]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[globbing]='fg=#D2A6FF'
ZSH_HIGHLIGHT_STYLES[history-expansion]='fg=#D2A6FF'
#ZSH_HIGHLIGHT_STYLES[command-substitution]='fg=?'
#ZSH_HIGHLIGHT_STYLES[command-substitution-unquoted]='fg=?'
#ZSH_HIGHLIGHT_STYLES[process-substitution]='fg=?'
#ZSH_HIGHLIGHT_STYLES[arithmetic-expansion]='fg=?'
ZSH_HIGHLIGHT_STYLES[back-quoted-argument-unclosed]='fg=#F07178'
ZSH_HIGHLIGHT_STYLES[redirection]='fg=#F29668'
ZSH_HIGHLIGHT_STYLES[arg0]='fg=#ECE8DB'
ZSH_HIGHLIGHT_STYLES[default]='fg=#ECE8DB'
ZSH_HIGHLIGHT_STYLES[cursor]='fg=#ECE8DB'
