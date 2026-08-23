# dotfiles cheatsheet

## tmux

prefix: `ctrl-b`

- `prefix ?`: show tmux keybindings
- `prefix h/j/k/l`: move panes left, down, up, right
- `prefix |`: split horizontally in the current directory
- `prefix -`: split vertically in the current directory
- `prefix shift+h/j/k/l`: resize panes left, down, up, right
- `prefix r`: reload tmux config
- `prefix c`: create a window in the current directory
- `prefix shift+s`: shell popup
- `prefix g`: git status and delta diff popup
- `prefix shift+m`: recent git log popup
- `prefix shift+f`: pick a file with fd and fzf, then open nvim
- `prefix /`: show this cheatsheet

## popup exits

- `delta`: `q`
- `less`: `q`
- `fzf`: `esc` or `ctrl-c`
- popup shell: `ctrl-d` or `exit`

## bash aliases

- `ll`: long list
- `la`: hidden files
- `l`: compact list
- `gs`: git status
- `gl`: git log
- `..`: parent directory
- `cl`: cd to argument, then list files
- `gd`: git diff for argument
- `alert`: desktop notification for the previous long running command

## bash functions

- `v file:line`: open file at line in neovim
- `v ...`: pass arguments to nvim
- `tproj`: attach or create the tmux code and verify workspace for this repo

## discovery commands

```sh
grep -ne '^bind|^alias|^[[:alpha:]_][[:alnum:]_]*\(\)' \
  ~/dotfiles/tmux/.tmux.conf ~/dotfiles/bash/.bashrc
```

- `tmux list-keys`: show active tmux keybindings
- `alias`: show shell aliases in the current shell
- `declare -f`: show shell functions loaded in the current shell
