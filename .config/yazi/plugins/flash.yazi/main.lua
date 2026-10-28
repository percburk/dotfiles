--- @since 26.9.1

local M = {}

local KEYS, CANDS = {}, {}
for c = 33, 126 do
	KEYS[#KEYS + 1] = string.char(c)
end
for _, k in ipairs({ " ", "<Backspace>", "<Enter>", "<Esc>" }) do
	KEYS[#KEYS + 1] = k
end
for i, k in ipairs(KEYS) do
	CANDS[i] = { on = k == " " and "<Space>" or k }
end

local function theme()
	local t = th.flash or {}
	local main, alt = th.mode.normal_main, th.mode.normal_alt
	return {
		dim = t.dim or ui.Style():fg("darkgray"),
		hovered = t.hovered or ui.Style():fg("darkgray"):bg(alt:bg() or "gray"),
		match = t.match or ui.Style():fg("reset"):underline(),
		label = t.label or ui.Style():fg(main:fg() or "black"):bg(main:bg() or "blue"):bold(),
	}
end

local start = ya.sync(function(st)
	st.active = true
	st.matches = {}
	st.styles = theme()
	ui.render()
end)

local stop = ya.sync(function(st)
	st.active = false
	st.matches = {}
	ui.render()
end)

local update = ya.sync(function(st, query)
	if query == "" then
		st.matches = {}
		ui.render()
		return { labels = {} }
	end

	local folder = cx.active.current
	local cursor = folder.cursor
	local smart = query == query:lower()

	local matches, order, taken = {}, {}, {}
	for _, f in ipairs(folder.window) do
		local hay = smart and f.name:lower() or f.name
		local ranges, init = {}, 1
		while true do
			local s, e = hay:find(query, init, true)
			if not s then
				break
			end
			ranges[#ranges + 1] = { s - 1, e }

			-- In smart case, typing either case of the next character still continues the query
			local next_char = f.name:sub(e + 1, e + 1)
			taken[next_char] = true
			if smart then
				taken[next_char:lower()] = true
			end
			init = e + 1
		end

		if #ranges > 0 then
			local idx = f.idx - 1
			matches[idx] = { ranges = ranges }
			order[#order + 1] = idx
		end
	end

	-- Nearest to the cursor first; on a tie, the file below the cursor wins
	table.sort(order, function(a, b)
		local da, db = math.abs(a - cursor), math.abs(b - cursor)
		if da ~= db then
			return da < db
		end
		return a > b
	end)

	-- Labels that could continue the query would be ambiguous, so skip them
	local labels, n = {}, 0
	for c in st.opts.labels:gmatch(".") do
		local idx = order[n + 1]
		if not idx then
			break
		end
		if not taken[c] then
			n = n + 1
			matches[idx].label = c
			labels[c] = idx
		end
	end

	st.matches = matches
	ui.render()

	-- Enter jumps to the nearest match that isn't already hovered
	local first = order[1] == cursor and order[2] or order[1]
	return { labels = labels, first = first }
end)

local jump = ya.sync(function(_, idx)
	local step = idx - cx.active.current.cursor
	if step ~= 0 then
		ya.emit("arrow", { step })
	end
end)

function M.setup(st, opts)
	opts = opts or {}
	st.opts = {
		-- Must be printable ASCII, since those are the only keys flash listens for
		labels = opts.labels or "asdfghjklqwertyuiopzxcvbnm",
		icon = opts.icon or "\u{f0e7}",
	}

	-- `st.matches` is keyed by the 0-based index that `folder.cursor` uses
	local function match_of(file)
		return st.matches[file.idx - 1]
	end
	local function label_of(file)
		local match = match_of(file)
		return match and match.label
	end
	local function flashing(file)
		return st.active and file.in_current
	end

	local orig = {
		padding = Entity.padding,
		icon = Entity.icon,
		highlights = Entity.highlights,
		style = Entity.style,
		redraw = Linemode.redraw,
		mode = Status.mode,
	}

	-- The label takes the place of the padding, icon, and trailing space so names don't shift
	function Entity:padding()
		if flashing(self._file) and label_of(self._file) then
			return ""
		end
		return orig.padding(self)
	end

	function Entity:icon()
		if not flashing(self._file) then
			return orig.icon(self)
		end

		local label = label_of(self._file)
		if label then
			return ui.Span(" " .. label .. " "):style(st.styles.label)
		end

		-- Unstyled so the dim style from `Entity:style` applies to it
		local icon = th.icon:match(self._file, { hovered = self._file.is_hovered })
		return icon and icon.text .. " " or ""
	end

	function Entity:highlights()
		if not flashing(self._file) then
			return orig.highlights(self)
		end

		local name = self._file.name
		local match = match_of(self._file)
		if not match then
			return ui.printable(name)
		end

		local spans, last = {}, 0
		for _, range in ipairs(match.ranges) do
			local from, to = range[1], range[2]
			if from > last then
				spans[#spans + 1] = ui.printable(name:sub(last + 1, from))
			end
			spans[#spans + 1] = ui.Span(ui.printable(name:sub(from + 1, to))):style(st.styles.match)
			last = to
		end
		if last < #name then
			spans[#spans + 1] = ui.printable(name:sub(last + 1))
		end
		return ui.Line(spans)
	end

	function Entity:style()
		if not flashing(self._file) then
			return orig.style(self)
		end
		return self._file.is_hovered and st.styles.hovered or st.styles.dim
	end

	-- Mirrors the core `Linemode:redraw` child dispatch, so it must track the `@since` version
	function Linemode:redraw()
		if not flashing(self._file) then
			return orig.redraw(self)
		end

		local lines = {}
		for _, child in ipairs(self._children) do
			local key = child[1]
			local render = type(key) == "string" and self[key] or key
			local line = ui.Line(render(self))
			-- The padding is the hovered bar's end cap and must keep its own color
			if key ~= "padding" then
				line:map(function(span)
					return span:style(st.styles.dim)
				end)
			end
			lines[#lines + 1] = line
		end
		return ui.Line(lines)
	end

	function Status:mode()
		if not st.active then
			return orig.mode(self)
		end

		-- Padded to the width of " NOR " so the rest of the status bar has no layout shift
		local style = self:style()
		return ui.Line({
			ui.Span(th.status.sep_left.open):fg(style.main:bg()):bg(App.bg()),
			ui.Span("  " .. st.opts.icon .. "  "):style(style.main),
			ui.Span(th.status.sep_left.close):fg(style.main:bg()):bg(style.alt:bg()),
		})
	end
end

local function read_target()
	local query, result = "", { labels = {} }
	while true do
		local idx = ya.which({ cands = CANDS, silent = true })
		local key = idx and KEYS[idx]
		if not key or key == "<Esc>" then
			return nil
		elseif key == "<Enter>" then
			return result.first
		elseif key == "<Backspace>" then
			if query == "" then
				return nil
			end
			query = query:sub(1, -2)
		elseif result.labels[key] then
			return result.labels[key]
		else
			query = query .. key
		end
		result = update(query)
	end
end

function M:entry()
	start()
	local ok, target = pcall(read_target)
	stop()
	if not ok then
		error(target, 0)
	end
	if target then
		jump(target)
	end
end

return M
