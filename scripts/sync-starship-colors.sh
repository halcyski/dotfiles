#!/usr/bin/env bash
KITTY_THEME="$HOME/.config/kitty/current-theme.conf"
STARSHIP_CONFIG="$HOME/.config/starship.toml"

# run install.sh @ ~/dotfiles/ 
[[ -f "$KITTY_THEME" ]] || exit 0
[[ -f "$STARSHIP_CONFIG" ]] || exit 0 

get_color() {
    local name="$1"
    awk -v name="$name" '$1 == name { print $2; exit }' "$KITTY_THEME"
}

declare -A COLORS=(
	[red]=color9
	[green]=color10
	[yellow]=color11
	[blue]=color12
	[purple]=color13
	[cyan]=color14
	[white]=color15
)

for color in "${!COLORS[@]}"; do
	kitty_color="${COLORS[$color]}"
	value="$(get_color "$kitty_color")"
	
	# evil non symlink following command
	sed --follow-symlinks -i "s|^$color *=.*|$color = \"$value\"|" "$STARSHIP_CONFIG"
done
